// Authentication routes for customers and admins
const express = require("express");
const logger = require("../utils/logger");
const router = express.Router();
const db = require("./database");
const crypto = require("crypto");
const messageCentral = require("./messageCentral");
require("dotenv").config();
const axios = require("axios");

const SESSION_EXPIRY_HOURS = 90 * 24;
const ADMIN_SESSION_EXPIRY_HOURS = 24;
const SUPER_ADMIN_SESSION_EXPIRY_HOURS = 90 * 24;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
// DB-backed OTP helpers (replaces in-memory Map)
const otpStoreGet = async (key) => {
  const res = await db.query("SELECT data, expires_at FROM public.otp_store WHERE otp_key = $1 AND expires_at > NOW()", [key]);
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return { ...row.data, expiresAt: new Date(row.expires_at).getTime() };
};
const otpStoreSet = async (key, data) => {
  const expiresAt = new Date(data.expiresAt).toISOString();
  const jsonData = JSON.stringify(data);
  await db.query(
    `INSERT INTO public.otp_store (otp_key, data, expires_at) VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (otp_key) DO UPDATE SET data = $2::jsonb, expires_at = $3, created_at = CURRENT_TIMESTAMP`,
    [key, jsonData, expiresAt]
  );
};
const otpStoreDelete = async (key) => {
  await db.query("DELETE FROM public.otp_store WHERE otp_key = $1", [key]);
};

if (process.env.NODE_ENV !== "test") {
  setInterval(async () => {
    try { await db.query("DELETE FROM public.otp_store WHERE expires_at < NOW()"); } catch (_) {}
  }, 5 * 60 * 1000);
}

const bcrypt = require("bcrypt");
const SALT_ROUNDS = 12;

const hashPassword = async (pwd) => await bcrypt.hash(pwd, SALT_ROUNDS);

const validateMobile = (m) => /^[6-9]\d{9}$/.test(String(m).replace(/\D/g, ""));
const validateName = (n) => typeof n === "string" && n.trim().length >= 2 && /^[A-Za-z\s]+$/.test(n.trim());
const validateOTP = (o) => /^\d{6}$/.test(o);
const validateEmail = (e) => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) && e.trim().length <= 254;
const generateSessionId = () => crypto.randomBytes(32).toString("hex");
const getClientIp = (req) => req.headers["x-forwarded-for"]?.split(",")[0] || req.ip || "unknown";

const createSession = async (customerId, req) => {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
  
  await db.query(
    "INSERT INTO sessions (session_id, customer_id, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5)",
    [sessionId, customerId, getClientIp(req), req.headers["user-agent"] || "", expiresAt]
  );
  
  await db.query("DELETE FROM sessions WHERE expires_at < NOW()");
  
  return { sessionId, expiresAt };
};

const verifySession = async (sessionId) => {
  if (!sessionId) return null;
  
  const result = await db.query(
    "SELECT s.customer_id, c.name, c.phone, c.email, c.dob, c.hotel_id, c.avatar_url, c.locale FROM sessions s INNER JOIN customers c ON s.customer_id = c.customer_id WHERE s.session_id = $1 AND s.expires_at > NOW()",
    [sessionId]
  );
  
  if (result.rows.length === 0) return null;
  
  await db.query("UPDATE sessions SET last_activity = NOW() WHERE session_id = $1", [sessionId]);
  
  return {
    customerId: result.rows[0].customer_id,
    name: result.rows[0].name,
    phone: result.rows[0].phone,
    email: result.rows[0].email,
    dob: result.rows[0].dob,
    hotelId: result.rows[0].hotel_id,
    avatarUrl: result.rows[0].avatar_url,
    locale: result.rows[0].locale || 'en'
  };
};

const requireAuth = async (req, res, next) => {
  try {
    const sessionId = req.cookies.sessionId || req.headers["x-session-id"];
    if (!sessionId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const session = await verifySession(sessionId);
    if (!session) {
      res.clearCookie("sessionId");
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    req.customer = session;
    next();
  } catch (error) {
    res.clearCookie("sessionId");
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
};

const createAdminSession = async (adminId, role, req) => {
  const sessionId = generateSessionId();
  const hours = role === "super_admin" ? SUPER_ADMIN_SESSION_EXPIRY_HOURS : ADMIN_SESSION_EXPIRY_HOURS;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  const userAgent = req.headers["user-agent"] || "";
  
  await db.query("DELETE FROM sessions WHERE admin_id = $1", [adminId]);
  
  await db.query(
    "INSERT INTO sessions (session_id, admin_id, user_agent, expires_at) VALUES ($1, $2, $3, $4)",
    [sessionId, adminId, userAgent, expiresAt]
  );
  
  await db.query("DELETE FROM sessions WHERE expires_at < NOW()");
  
  return { sessionId, expiresAt };
};

const verifyAdminSession = async (sessionId, req) => {
  if (!sessionId) return null;

  const currentUserAgent = req.headers["user-agent"] || "";

  const result = await db.query(
    `SELECT s.admin_id, a.username, a.hotel_id, a.role, a.locale
     FROM sessions s
     JOIN admins a ON a.admin_id = s.admin_id
     WHERE s.session_id = $1
       AND s.expires_at > NOW()
       AND s.admin_id IS NOT NULL`,
    [sessionId]
  );

  if (result.rows.length === 0) return null;

  const session = result.rows[0];

  return {
    adminId: session.admin_id,
    username: session.username,
    hotelId: session.hotel_id,
    role: session.role,
    locale: session.locale || 'en'
  };
};

const requireAdmin = async (req, res, next) => {
  try {
    const sessionId = req.cookies.superAdminSessionId || req.cookies.adminSessionId || req.headers["x-session-id"];
    const session = await verifyAdminSession(sessionId, req);
    
    if (!session) {
      res.clearCookie("adminSessionId");
      res.clearCookie("superAdminSessionId");
      return res.status(401).json({ success: false, message: "Admin authentication required" });
    }

    if (session.role !== "admin" && session.role !== "super_admin") {
      res.clearCookie("adminSessionId");
      res.clearCookie("superAdminSessionId");
      return res.status(403).json({ success: false, message: "Access denied. Invalid role." });
    }

    if (session.role === "admin") {
      if (!session.hotelId) {
        res.clearCookie("adminSessionId");
        res.clearCookie("superAdminSessionId");
        return res.status(403).json({ success: false, message: "Access denied. Admin account must be assigned to a specific hotel." });
      }

      // Check if hotel is frozen
      const hotelRes = await db.query("SELECT is_frozen FROM public.hotels WHERE hotel_id = $1", [session.hotelId]);
      if (hotelRes.rows.length === 0) {
        res.clearCookie("adminSessionId");
        res.clearCookie("superAdminSessionId");
        return res.status(403).json({ success: false, message: "Access denied. Assigned hotel not found." });
      }

      const isFrozen = hotelRes.rows[0].is_frozen;
      if (isFrozen && ["POST", "PUT", "DELETE"].includes(req.method)) {
        const fullPath = req.originalUrl || req.url;
        const isPaymentRoute = /\/payments\/(create-subscription-order|verify-subscription|admin-razorpay-key)/.test(fullPath);
        if (!isPaymentRoute) {
          return res.status(403).json({
            success: false,
            message: "Your hotel account is temporarily frozen. Mutating operations are locked."
          });
        }
      }
    }
    
    req.admin = { id: session.adminId, username: session.username, hotelId: session.hotelId, role: session.role };
    next();
  } catch (error) {
    logger.error("Admin auth middleware error:", error);
    res.clearCookie("adminSessionId");
    res.clearCookie("superAdminSessionId");
    return res.status(401).json({ success: false, message: "Admin authentication required" });
  }
};


const getGoogleClientId = () => {
  if (process.env.GOOGLE_CLIENT_ID) {
    return process.env.GOOGLE_CLIENT_ID;
  }
  try {
    const fs = require("fs");
    const path = require("path");
    const credPath = path.join(__dirname, "../../google_auth_credentials.json");
    if (fs.existsSync(credPath)) {
      const creds = JSON.parse(fs.readFileSync(credPath, "utf8"));
      if (creds.web && creds.web.client_id) {
        return creds.web.client_id;
      }
    }
  } catch (err) {
    logger.warn("Failed to load Google Client ID from json file:", err.message);
  }
  return null;
};

// CSRF token endpoint — sets csrfToken cookie (readable by JS for double-submit)
router.get("/csrf-token", (req, res) => {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie("csrfToken", token, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000
  });
  return res.json({ success: true, csrfToken: token });
});

router.get("/google-config", (req, res) => {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return res.status(500).json({ success: false, message: "Google Client ID is not configured on the server." });
  }
  return res.json({
    success: true,
    clientId: clientId
  });
});

router.post("/google-login", async (req, res) => {
  try {
    const { credential, hotelSlug } = req.body;
    
    if (!credential) {
      return res.status(400).json({ success: false, message: "Google credential token required." });
    }
    
    let googleUser;
    try {
      const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      googleUser = response.data;
    } catch (err) {
      logger.error("Google token verification failed:", err.message);
      return res.status(401).json({ success: false, message: "Invalid or expired Google token." });
    }
    
    // Verify audience to prevent malicious token reuse from other Google projects
    const allowedClientId = getGoogleClientId();
    if (!allowedClientId) {
      logger.error("Google Client ID is not configured on the server.");
      return res.status(500).json({ success: false, message: "Google authentication is not configured on the server." });
    }
    if (googleUser.aud !== allowedClientId) {
      logger.error("Google token audience mismatch. Expected:", allowedClientId, "Got:", googleUser.aud);
      return res.status(401).json({ success: false, message: "Google token verification failed (audience mismatch)." });
    }
    
    if (!googleUser.email) {
      return res.status(400).json({ success: false, message: "Email not provided by Google account." });
    }
    
    const email = googleUser.email.toLowerCase();
    const name = googleUser.name || googleUser.given_name || "Google User";
    const googleId = googleUser.sub;
    const avatarUrl = googleUser.picture || null;
    
    const targetSlug = hotelSlug || "hotbyte";
    const hotelResult = await db.query("SELECT hotel_id FROM public.hotels WHERE slug = $1", [targetSlug]);
    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }
    const hotelId = hotelResult.rows[0].hotel_id;
    
    let customerResult = await db.query(
      "SELECT customer_id, name, phone, email, dob, hotel_id, google_id, avatar_url FROM customers WHERE LOWER(email) = $1 AND hotel_id = $2",
      [email, hotelId]
    );
    
    let customer;
    if (customerResult.rows.length > 0) {
      customer = customerResult.rows[0];
      // Sync Google details if updated
      if (!customer.google_id || customer.avatar_url !== avatarUrl) {
        const updateResult = await db.query(
          "UPDATE customers SET google_id = COALESCE(google_id, $1), avatar_url = $2 WHERE customer_id = $3 RETURNING customer_id, name, phone, email, dob, hotel_id, google_id, avatar_url",
          [googleId, avatarUrl, customer.customer_id]
        );
        customer = updateResult.rows[0];
      }
    } else {
      const insertResult = await db.query(
        "INSERT INTO customers (name, email, google_id, avatar_url, hotel_id) VALUES ($1, $2, $3, $4, $5) RETURNING customer_id, name, phone, email, dob, hotel_id, google_id, avatar_url",
        [name, email, googleId, avatarUrl, hotelId]
      );
      customer = insertResult.rows[0];
    }
    
    await db.query("DELETE FROM sessions WHERE customer_id = $1", [customer.customer_id]);
    const { sessionId } = await createSession(customer.customer_id, req);
    
    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_HOURS * 60 * 60 * 1000,
      path: "/"
    });
    
    // Set CSRF token for subsequent mutation requests
    const csrfToken = crypto.randomBytes(32).toString("hex");
    res.cookie("csrfToken", csrfToken, {
      httpOnly: false,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000
    });
    
    const hasDob = customer.dob !== null && customer.dob !== undefined;
    
    return res.json({
      success: true,
      message: "Google login successful",
      csrfToken,
      customer: {
        id: customer.customer_id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        dob: customer.dob,
        hasDob,
        hotelId: customer.hotel_id,
        hotelSlug: targetSlug,
        avatarUrl: customer.avatar_url
      }
    });
  } catch (error) {
    logger.error("Google login route error:", error);
    return res.status(500).json({ success: false, message: "Google authentication failed." });
  }
});

router.get("/session-check", async (req, res) => {
  try {
    const session = await verifySession(req.cookies.sessionId);
    
    if (!session) {
      res.clearCookie("sessionId");
      return res.json({ authenticated: false });
    }
    
    // Scoped tenancy validation: check if requested hotel_slug matches their registered hotel_id
    if (req.query.hotel_slug) {
      const hotelResult = await db.query("SELECT hotel_id FROM public.hotels WHERE slug = $1", [req.query.hotel_slug]);
      if (hotelResult.rows.length === 0 || hotelResult.rows[0].hotel_id !== session.hotelId) {
        return res.json({ authenticated: false });
      }
    }

    const hotelRes = await db.query("SELECT slug FROM public.hotels WHERE hotel_id = $1", [session.hotelId]);
    const hotelSlug = hotelRes.rows.length > 0 ? hotelRes.rows[0].slug : null;

    const hasDob = session.dob !== null && session.dob !== undefined;

    // Refresh CSRF token on session check
    const csrfToken = crypto.randomBytes(32).toString("hex");
    res.cookie("csrfToken", csrfToken, {
      httpOnly: false,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({
      authenticated: true,
      csrfToken,
      customer: {
        id: session.customerId,
        name: session.name,
        phone: session.phone,
        email: session.email,
        dob: session.dob,
        hasDob,
        hotelId: session.hotelId,
        hotelSlug,
        avatarUrl: session.avatarUrl,
        locale: session.locale
      }
    });
  } catch (error) {
    logger.error("Session check error:", error);
    res.clearCookie("sessionId");
    return res.json({ authenticated: false });
  }
});

router.post("/logout", async (req, res) => {
  try {
    if (req.cookies.sessionId) {
      await db.query("DELETE FROM sessions WHERE session_id = $1", [req.cookies.sessionId]);
    }
    res.clearCookie("sessionId");
    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.clearCookie("sessionId");
    return res.json({ success: true, message: "Logged out successfully" });
  }
});

router.post("/admin/signup", requireAdmin, async (req, res) => {
  try {
    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: "Super Admin privileges required to register admins." });
    }
    const { name, username, email, password, confirmPassword } = req.body;
    
    if (!username || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: "Username and passwords required." });
    }
    
    if (typeof username !== "string" || username.trim().length < 3 || username.trim().length > 50) {
      return res.status(400).json({ success: false, message: "Username must be 3-50 characters." });
    }
    
    if (name && (!validateName(name) || name.trim().length > 100)) {
      return res.status(400).json({ success: false, message: "Invalid name (2-100 characters, letters only)." });
    }
    
    if (email && !validateEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email address." });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }
    
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ success: false, message: "Password must be 6-128 characters." });
    }

    const existing = await db.query("SELECT admin_id FROM admins WHERE username = $1", [username.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Username exists." });
    }
    
    if (email) {
      const existingEmail = await db.query("SELECT admin_id FROM admins WHERE email = $1", [email]);
      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ success: false, message: "Email exists." });
      }
    }

    const hashedPassword = await hashPassword(password);
    const result = await db.query(
      "INSERT INTO admins (name, username, email, password) VALUES ($1, $2, $3, $4) RETURNING admin_id, name, username, email",
      [name || null, username, email || null, hashedPassword]
    );
    
    return res.json({
      success: true,
      message: "Admin created successfully",
      admin: result.rows[0]
    });
  } catch (error) {
    logger.error("Admin signup error:", error);
    return res.status(500).json({ success: false, message: "Admin registration failed." });
  }
});

router.post("/admin/login", async (req, res) => {
  try {
    let { username, password, role } = req.body;

    // If all three fields are missing, preserve original error message for backward compatibility
    if (!username && !password && !role) {
      return res.status(400).json({ success: false, message: "Username, password, and role required." });
    }

    // Role is optional; default to 'admin' for standard admin logins when username/password are present
    if (!role) role = 'admin';

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password required." });
    }

    username = String(username).trim();
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ success: false, message: "Invalid username length." });
    }

    if (role !== "admin" && role !== "super_admin") {
      return res.status(400).json({ success: false, message: "Invalid role specified." });
    }

    const result = await db.query(
      "SELECT admin_id, username, hotel_id, role, password FROM admins WHERE username = $1",
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const admin = result.rows[0];
    
    // Safe password verification handling standard bcrypt
    let passwordMatch = false;
    try {
      if (admin.password && (admin.password.startsWith("$2a$") || admin.password.startsWith("$2b$") || admin.password.startsWith("$2y$"))) {
        passwordMatch = await bcrypt.compare(password, admin.password);
      }
    } catch (err) {
      passwordMatch = false;
    }

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }
    
    if (admin.role !== role) {
      return res.status(401).json({ success: false, message: "Incorrect role for this login portal." });
    }

    if (role === "admin") {
      if (!admin.hotel_id) {
        return res.status(401).json({ success: false, message: "Admin account is not assigned to any hotel." });
      }

      if (req.body.hotelSlug) {
        const hotelCheck = await db.query("SELECT hotel_id FROM public.hotels WHERE slug = $1", [req.body.hotelSlug]);
        if (hotelCheck.rows.length === 0) {
          return res.status(400).json({ success: false, message: "The specified hotel was not found." });
        }
        if (admin.hotel_id !== hotelCheck.rows[0].hotel_id) {
          return res.status(403).json({ success: false, message: "Access denied. You are not authorized as an administrator for this hotel." });
        }
      }
    }

    const { sessionId } = await createAdminSession(admin.admin_id, admin.role, req);
    
    const hours = admin.role === "super_admin" ? SUPER_ADMIN_SESSION_EXPIRY_HOURS : ADMIN_SESSION_EXPIRY_HOURS;
    const cookieName = admin.role === "super_admin" ? "superAdminSessionId" : "adminSessionId";
    const clearName = admin.role === "super_admin" ? "adminSessionId" : "superAdminSessionId";

    res.clearCookie(clearName);

    res.cookie(cookieName, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: hours * 60 * 60 * 1000,
      path: "/"
    });
    
    logger.info(`Admin login: ${admin.username} (${admin.role})`);
    
    let hotelSlug = null;
    if (admin.hotel_id) {
      const hotelRes = await db.query("SELECT slug FROM public.hotels WHERE hotel_id = $1", [admin.hotel_id]);
      if (hotelRes.rows.length > 0) {
        hotelSlug = hotelRes.rows[0].slug;
      }
    }

    const csrfToken = crypto.randomBytes(32).toString("hex");
    res.cookie("csrfToken", csrfToken, {
      httpOnly: false,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: hours * 60 * 60 * 1000
    });
    
    return res.json({
      success: true,
      message: "Admin login successful",
      csrfToken,
      admin: { id: admin.admin_id, username: admin.username, hotelId: admin.hotel_id, role: admin.role, hotelSlug }
    });
  } catch (error) {
    logger.error("Admin login error:", error);
    return res.status(500).json({ success: false, message: "Admin login failed.", error: error.message, stack: error.stack });
  }
});

router.post("/admin/forgot-otp", async (req, res) => {
  try {
    let { username, phone } = req.body;
    if (!username || !phone) {
      return res.status(400).json({ success: false, message: "Username and phone number are required." });
    }

    const mobile = String(phone).replace(/\D/g, "");
    if (!validateMobile(mobile)) {
      return res.status(400).json({ success: false, message: "Invalid mobile number." });
    }

    // Check if admin exists and is super_admin and matches the phone number
    const result = await db.query(
      "SELECT admin_id, username, role, phone FROM public.admins WHERE username = $1",
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Super Admin username not found." });
    }

    const admin = result.rows[0];
    if (admin.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: "Unauthorized. Action restricted to Super Admin." });
    }

    if (!admin.phone || String(admin.phone).replace(/\D/g, "") !== mobile) {
      return res.status(400).json({ success: false, message: "Phone number does not match this Super Admin account." });
    }

    const otpKey = `${mobile}_admin_forgot`;
    const existingOtp = await otpStoreGet(otpKey);
    if (existingOtp && Date.now() - (existingOtp.expiresAt - OTP_EXPIRY_MINUTES * 60 * 1000) < 60000) {
      return res.status(429).json({ success: false, message: "Please wait 60 seconds before requesting another OTP." });
    }
    await otpStoreDelete(otpKey);

    const smsResult = await messageCentral.sendOTP(mobile);
    if (!smsResult.success) {
      return res.status(500).json({ success: false, message: smsResult.error || "Failed to send OTP via Message Central." });
    }

    await otpStoreSet(otpKey, {
      type: "admin_forgot",
      username: admin.username,
      attempts: 0,
      expiresAt: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
      verified: false,
      verificationId: smsResult.verificationId
    });

    return res.json({ success: true, message: "OTP sent successfully to Super Admin's phone number." });
  } catch (error) {
    logger.error("Super Admin Forgot OTP error:", error);
    return res.status(500).json({ success: false, message: "Failed to process forgot OTP request." });
  }
});

router.post("/admin/reset-password", async (req, res) => {
  try {
    let { username, phone, otp, password } = req.body;
    if (!username || !phone || !otp || !password) {
      return res.status(400).json({ success: false, message: "Username, phone, OTP, and password are required." });
    }

    const mobile = String(phone).replace(/\D/g, "");
    const cleanOTP = String(otp).replace(/\D/g, "");

    if (!validateMobile(mobile)) {
      return res.status(400).json({ success: false, message: "Invalid mobile number." });
    }

    if (!validateOTP(cleanOTP)) {
      return res.status(400).json({ success: false, message: "OTP must be 6 digits." });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Passkey must be at least 6 characters." });
    }

    // Verify username is super admin
    const adminRes = await db.query(
      "SELECT admin_id, username, role, phone FROM public.admins WHERE username = $1",
      [username.trim()]
    );

    if (adminRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Super Admin username not found." });
    }

    const admin = adminRes.rows[0];
    if (admin.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: "Unauthorized. Action restricted to Super Admin." });
    }

    if (!admin.phone || String(admin.phone).replace(/\D/g, "") !== mobile) {
      return res.status(400).json({ success: false, message: "Phone number does not match this Super Admin account." });
    }

    const otpKey = `${mobile}_admin_forgot`;
    const otpRecord = await otpStoreGet(otpKey);

    if (!otpRecord || otpRecord.verified) {
      return res.status(400).json({ success: false, message: "No active OTP request found. Please request a new OTP." });
    }

    if (otpRecord.username !== admin.username) {
      return res.status(400).json({ success: false, message: "Username mismatch for this OTP transaction." });
    }

    if (Date.now() > otpRecord.expiresAt) {
      await otpStoreDelete(otpKey);
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new OTP." });
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await otpStoreDelete(otpKey);
      return res.status(429).json({ success: false, message: "Too many incorrect OTP attempts. Please try again." });
    }

    const verifyResult = await messageCentral.verifyOTP(mobile, cleanOTP, otpRecord.verificationId);

    if (!verifyResult.success || !verifyResult.verified) {
      otpRecord.attempts++;
      await otpStoreSet(otpKey, otpRecord);
      return res.status(401).json({
        success: false,
        message: "Invalid OTP code.",
        attemptsLeft: MAX_OTP_ATTEMPTS - otpRecord.attempts
      });
    }

    // OTP Verified! Reset password
    const hashed = await hashPassword(password);
    await db.query(
      "UPDATE public.admins SET password = $1 WHERE admin_id = $2",
      [hashed, admin.admin_id]
    );

    // Delete any active sessions for the super admin
    await db.query("DELETE FROM sessions WHERE admin_id = $1", [admin.admin_id]);

    await otpStoreDelete(otpKey);

    return res.json({ success: true, message: "Super Admin passkey reset successful. Please login with your new passkey." });
  } catch (error) {
    logger.error("Super Admin reset password error:", error);
    return res.status(500).json({ success: false, message: "Failed to reset Super Admin passkey." });
  }
});

router.get("/admin/session-check", async (req, res) => {
  try {
    const sessionId = req.cookies.superAdminSessionId || req.cookies.adminSessionId;
    const session = await verifyAdminSession(sessionId, req);
    
    if (!session) {
      res.clearCookie("adminSessionId");
      res.clearCookie("superAdminSessionId");
      return res.json({ authenticated: false });
    }
    
    let isFrozen = false;
    let hotelSlug = null;
    let hotelName = null;
    let plan = 'trial';
    let trialEndsAt = null;
    let subscriptionExpiryDate = null;
    let daysSinceExpiry = 0;
    let gracePeriodRemaining = null;
    if (session.hotelId) {
      const hotelRes = await db.query(
        `SELECT h.name, h.slug, h.is_frozen, h.plan, h.trial_ends_at,
                s.expiry_date AS subscription_expiry_date
         FROM public.hotels h
         LEFT JOIN public.subscriptions s ON s.hotel_id = h.hotel_id AND s.status = 'active'
         WHERE h.hotel_id = $1`,
        [session.hotelId]
      );
      if (hotelRes.rows.length > 0) {
        const h = hotelRes.rows[0];
        hotelSlug = h.slug;
        hotelName = h.name;
        plan = h.plan || 'trial';
        trialEndsAt = h.trial_ends_at;
        subscriptionExpiryDate = h.subscription_expiry_date;

        // Check if expired
        const now = new Date();
        let expired = false;
        let expiryDate = null;
        if (plan === 'trial' && trialEndsAt) {
          const trialEnd = new Date(trialEndsAt);
          if (now > trialEnd) { expired = true; expiryDate = trialEnd; }
        } else if (plan !== 'trial' && subscriptionExpiryDate) {
          const subEnd = new Date(subscriptionExpiryDate);
          if (now > subEnd) { expired = true; expiryDate = subEnd; }
        }
        if (expired && expiryDate) {
          daysSinceExpiry = Math.floor((now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));
          const graceRows = await db.query("SELECT value FROM public.super_admin_settings WHERE key = 'grace_period_days'");
          const graceDays = graceRows.rows.length > 0 ? parseInt(graceRows.rows[0].value) : 0;
          if (graceDays > 0) {
            gracePeriodRemaining = Math.max(0, graceDays - daysSinceExpiry);
          }
        }

        if (h.is_frozen && session.role !== 'super_admin') {
          isFrozen = true;
        }
      }
    }
    
    return res.json({
      authenticated: true,
      admin: { id: session.adminId, username: session.username, hotelId: session.hotelId, role: session.role, hotelSlug, hotelName, locale: session.locale },
      isFrozen,
      plan,
      trialEndsAt,
      subscriptionExpiryDate,
      daysSinceExpiry,
      gracePeriodRemaining
    });
  } catch (error) {
    logger.error("Admin session check error:", error);
    res.clearCookie("adminSessionId");
    res.clearCookie("superAdminSessionId");
    return res.json({ authenticated: false });
  }
});

router.post("/admin/logout", async (req, res) => {
  try {
    const sessionId = req.cookies.superAdminSessionId || req.cookies.adminSessionId;
    
    if (sessionId) {
      await db.query("DELETE FROM sessions WHERE session_id = $1 AND admin_id IS NOT NULL", [sessionId]);
    }
    
    res.clearCookie("adminSessionId");
    res.clearCookie("superAdminSessionId");
    return res.json({ success: true, message: "Admin logged out successfully" });
  } catch (error) {
    res.clearCookie("adminSessionId");
    res.clearCookie("superAdminSessionId");
    return res.json({ success: true, message: "Admin logged out successfully" });
  }
});

// Guest check-in: lets unauthenticated customers place orders without Google login
// Only allowed when the hotel has customer_auth_required = false
router.post("/guest-checkin", async (req, res) => {
  try {
    const { name, hotel_slug } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Please provide a valid name (at least 2 characters)." });
    }

    if (!hotel_slug) {
      return res.status(400).json({ success: false, message: "hotel_slug is required." });
    }

    const cleanName = name.trim().replace(/\s+/g, " ").substring(0, 60);

    // Resolve hotel
    const hotelResult = await db.query(
      "SELECT hotel_id, customer_auth_required, is_frozen FROM public.hotels WHERE slug = $1",
      [hotel_slug]
    );

    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }

    const { hotel_id: hotelId, customer_auth_required: customerAuthRequired, is_frozen: isFrozen } = hotelResult.rows[0];

    if (isFrozen) {
      return res.status(403).json({ success: false, message: "This hotel account is currently frozen." });
    }

    // If hotel requires Google auth, block guest checkin
    if (customerAuthRequired) {
      return res.status(403).json({
        success: false,
        requireAuth: true,
        message: "This hotel requires Google authentication to place orders."
      });
    }

    // Find existing guest customer by name + hotel (no phone/email) or create one
    // Use a synthetic guest marker so guests don't collide with real accounts
    const guestEmail = `guest_${cleanName.toLowerCase().replace(/\s+/g, "_")}_${hotelId}@hotbyte.guest`;

    let customer;
    const existing = await db.query(
      "SELECT customer_id, name, phone, email, dob, hotel_id, avatar_url FROM customers WHERE LOWER(email) = $1 AND hotel_id = $2",
      [guestEmail.toLowerCase(), hotelId]
    );

    if (existing.rows.length > 0) {
      customer = existing.rows[0];
    } else {
      const inserted = await db.query(
        "INSERT INTO customers (name, email, hotel_id) VALUES ($1, $2, $3) RETURNING customer_id, name, phone, email, dob, hotel_id, avatar_url",
        [cleanName, guestEmail, hotelId]
      );
      customer = inserted.rows[0];
    }

    // Create session
    await db.query("DELETE FROM sessions WHERE customer_id = $1", [customer.customer_id]);
    const { sessionId } = await createSession(customer.customer_id, req);

    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_HOURS * 60 * 60 * 1000,
      path: "/"
    });

    // Set CSRF token for subsequent mutation requests
    const csrfToken = crypto.randomBytes(32).toString("hex");
    res.cookie("csrfToken", csrfToken, {
      httpOnly: false,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: "Guest check-in successful.",
      csrfToken,
      customer: {
        id: customer.customer_id,
        name: customer.name,
        phone: customer.phone || null,
        email: null, // don't expose synthetic guest email
        dob: customer.dob || null,
        hasDob: false,
        hotelId: customer.hotel_id,
        hotelSlug: hotel_slug,
        avatarUrl: customer.avatar_url || null,
        isGuest: true
      }
    });
  } catch (error) {
    logger.error("Guest checkin error:", error);
    return res.status(500).json({ success: false, message: "Guest check-in failed. Please try again." });
  }
});

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireAdmin = requireAdmin;
module.exports.verifySession = verifySession;
module.exports.verifyAdminSession = verifyAdminSession;
