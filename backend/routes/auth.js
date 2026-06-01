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
const otpStore = new Map();

if (process.env.NODE_ENV !== "test") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of otpStore.entries()) {
      if (now > data.expiresAt) otpStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

const bcrypt = require("bcrypt");
const SALT_ROUNDS = 12;

const hashPassword = async (pwd) => await bcrypt.hash(pwd, SALT_ROUNDS);

const validateMobile = (m) => /^[6-9]\d{9}$/.test(String(m).replace(/\D/g, ""));
const validateName = (n) => typeof n === "string" && n.trim().length >= 2 && /^[A-Za-z\s]+$/.test(n.trim());
const validateOTP = (o) => /^\d{6}$/.test(o);
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
    "SELECT s.customer_id, c.name, c.phone, c.email, c.dob, c.hotel_id FROM sessions s INNER JOIN customers c ON s.customer_id = c.customer_id WHERE s.session_id = $1 AND s.expires_at > NOW()",
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
    hotelId: result.rows[0].hotel_id
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
    `SELECT s.admin_id, a.username, a.hotel_id, a.role
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
    role: session.role
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
        return res.status(403).json({
          success: false,
          message: "Your hotel account is temporarily frozen. Mutating operations are locked."
        });
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
    const credPath = path.join(__dirname, "../../google_auth_credentiol.json");
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
    
    const targetSlug = hotelSlug || "hotbyte";
    const hotelResult = await db.query("SELECT hotel_id FROM public.hotels WHERE slug = $1", [targetSlug]);
    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }
    const hotelId = hotelResult.rows[0].hotel_id;
    
    let customerResult = await db.query(
      "SELECT customer_id, name, phone, email, dob, hotel_id, google_id FROM customers WHERE LOWER(email) = $1 AND hotel_id = $2",
      [email, hotelId]
    );
    
    let customer;
    if (customerResult.rows.length > 0) {
      customer = customerResult.rows[0];
      if (!customer.google_id) {
        await db.query(
          "UPDATE customers SET google_id = $1 WHERE customer_id = $2",
          [googleId, customer.customer_id]
        );
      }
    } else {
      const insertResult = await db.query(
        "INSERT INTO customers (name, email, google_id, hotel_id) VALUES ($1, $2, $3, $4) RETURNING customer_id, name, phone, email, dob, hotel_id",
        [name, email, googleId, hotelId]
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
    
    const hasDob = customer.dob !== null && customer.dob !== undefined;
    
    return res.json({
      success: true,
      message: "Google login successful",
      customer: {
        id: customer.customer_id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        dob: customer.dob,
        hasDob,
        hotelId: customer.hotel_id,
        hotelSlug: targetSlug
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
    
    return res.json({
      authenticated: true,
      customer: {
        id: session.customerId,
        name: session.name,
        phone: session.phone,
        email: session.email,
        dob: session.dob,
        hasDob,
        hotelId: session.hotelId,
        hotelSlug
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
    
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be 6+ characters." });
    }

    const existing = await db.query("SELECT admin_id FROM admins WHERE username = $1", [username]);
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
    const { username, password, role } = req.body;
    
    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: "Username, password, and role required." });
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
    
    // Safe password verification handling standard bcrypt & fallback legacy/seeded SHA-256 hashes
    let passwordMatch = false;
    try {
      if (admin.password && (admin.password.startsWith("$2a$") || admin.password.startsWith("$2b$") || admin.password.startsWith("$2y$"))) {
        passwordMatch = await bcrypt.compare(password, admin.password);
      } else {
        // Fallback for seeded SHA-256 accounts (64-char hex strings)
        const sha256 = crypto.createHash("sha256").update(password).digest("hex");
        passwordMatch = (sha256 === admin.password);
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
    
    return res.json({
      success: true,
      message: "Admin login successful",
      admin: { id: admin.admin_id, username: admin.username, hotelId: admin.hotel_id, role: admin.role, hotelSlug }
    });
  } catch (error) {
    logger.error("Admin login error:", error);
    return res.status(500).json({ success: false, message: "Admin login failed." });
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
    const existingOtp = otpStore.get(otpKey);
    if (existingOtp && Date.now() - (existingOtp.expiresAt - OTP_EXPIRY_MINUTES * 60 * 1000) < 60000) {
      return res.status(429).json({ success: false, message: "Please wait 60 seconds before requesting another OTP." });
    }
    otpStore.delete(otpKey);

    const smsResult = await messageCentral.sendOTP(mobile);
    if (!smsResult.success) {
      return res.status(500).json({ success: false, message: smsResult.error || "Failed to send OTP via Message Central." });
    }

    otpStore.set(otpKey, {
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
    const otpRecord = otpStore.get(otpKey);

    if (!otpRecord || otpRecord.verified) {
      return res.status(400).json({ success: false, message: "No active OTP request found. Please request a new OTP." });
    }

    if (otpRecord.username !== admin.username) {
      return res.status(400).json({ success: false, message: "Username mismatch for this OTP transaction." });
    }

    if (Date.now() > otpRecord.expiresAt) {
      otpStore.delete(otpKey);
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new OTP." });
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(otpKey);
      return res.status(429).json({ success: false, message: "Too many incorrect OTP attempts. Please try again." });
    }

    const verifyResult = await messageCentral.verifyOTP(mobile, cleanOTP, otpRecord.verificationId);

    if (!verifyResult.success || !verifyResult.verified) {
      otpRecord.attempts++;
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

    otpStore.delete(otpKey);

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
    if (session.hotelId) {
      const hotelRes = await db.query("SELECT name, slug, is_frozen FROM public.hotels WHERE hotel_id = $1", [session.hotelId]);
      if (hotelRes.rows.length > 0) {
        hotelSlug = hotelRes.rows[0].slug;
        hotelName = hotelRes.rows[0].name;
        if (hotelRes.rows[0].is_frozen && session.role !== 'super_admin') {
          isFrozen = true;
        }
      }
    }
    
    return res.json({
      authenticated: true,
      admin: { id: session.adminId, username: session.username, hotelId: session.hotelId, role: session.role, hotelSlug, hotelName },
      isFrozen
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

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireAdmin = requireAdmin;
