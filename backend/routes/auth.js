// Authentication routes for customers and admins
const express = require("express");
const router = express.Router();
const db = require("./database");
const crypto = require("crypto");
const messageCentral = require("./messageCentral");
require("dotenv").config();

const SESSION_EXPIRY_HOURS = 90 * 24;
const ADMIN_SESSION_EXPIRY_HOURS = 24;
const SUPER_ADMIN_SESSION_EXPIRY_HOURS = 90 * 24;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const otpStore = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of otpStore.entries()) {
    if (now > data.expiresAt) otpStore.delete(key);
  }
}, 5 * 60 * 1000);

const hashPassword = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');
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
    "SELECT s.customer_id, c.name, c.phone, c.hotel_id FROM sessions s INNER JOIN customers c ON s.customer_id = c.customer_id WHERE s.session_id = $1 AND s.expires_at > NOW()",
    [sessionId]
  );
  
  if (result.rows.length === 0) return null;
  
  await db.query("UPDATE sessions SET last_activity = NOW() WHERE session_id = $1", [sessionId]);
  
  return {
    customerId: result.rows[0].customer_id,
    name: result.rows[0].name,
    phone: result.rows[0].phone,
    hotelId: result.rows[0].hotel_id
  };
};

router.post("/send-otp", async (req, res) => {
  try {
    const { phone, type, name, hotelSlug } = req.body;
    
    if (!phone || !type) {
      return res.status(400).json({ success: false, message: "Phone number and type required." });
    }
    
    const mobile = String(phone).replace(/\D/g, "");
    if (!validateMobile(mobile)) {
      return res.status(400).json({ success: false, message: "Invalid mobile number." });
    }
    
    if (type === "register" && !validateName(name)) {
      return res.status(400).json({ success: false, message: "Valid name required." });
    }

    // Resolve targeted hotel_id from hotelSlug
    const targetSlug = hotelSlug || "hotbyte";
    const hotelResult = await db.query("SELECT hotel_id FROM public.hotels WHERE slug = $1", [targetSlug]);
    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }
    const hotelId = hotelResult.rows[0].hotel_id;

    // Scope checking strictly to phone AND hotel_id
    const existing = await db.query(
      "SELECT customer_id FROM customers WHERE phone = $1 AND hotel_id = $2",
      [mobile, hotelId]
    );
    
    if (type === "login" && existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "You are not registered with this hotel. Please create an account." });
    }
    
    if (type === "register" && existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: "An account with this phone number is already registered at this hotel. Please sign in." });
    }

    const otpKey = `${mobile}_${type}`;
    otpStore.delete(otpKey);

    const smsResult = await messageCentral.sendOTP(mobile);
    if (!smsResult.success) {
      return res.status(500).json({ success: false, message: smsResult.error || "Failed to send OTP." });
    }

    otpStore.set(otpKey, {
      type,
      name: type === "register" ? name.trim() : null,
      attempts: 0,
      expiresAt: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
      verified: false,
      verificationId: smsResult.verificationId,
      hotelId
    });
    
    return res.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({ success: false, message: "Failed to send OTP." });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp, type } = req.body;
    
    if (!phone || !otp || !type) {
      return res.status(400).json({ success: false, message: "Phone, OTP, and type required." });
    }

    const mobile = String(phone).replace(/\D/g, "");
    const cleanOTP = String(otp).replace(/\D/g, "");
    
    if (!validateMobile(mobile)) {
      return res.status(400).json({ success: false, message: "Invalid mobile number." });
    }
    
    if (!validateOTP(cleanOTP)) {
      return res.status(400).json({ success: false, message: "OTP must be 6 digits." });
    }

    const otpKey = `${mobile}_${type}`;
    const otpRecord = otpStore.get(otpKey);
    
    if (!otpRecord || otpRecord.verified) {
      return res.status(400).json({ success: false, message: "No OTP found. Request new OTP." });
    }
    
    if (Date.now() > otpRecord.expiresAt) {
      otpStore.delete(otpKey);
      return res.status(400).json({ success: false, message: "OTP expired." });
    }
    
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(otpKey);
      return res.status(429).json({ success: false, message: "Too many attempts." });
    }

    const verifyResult = await messageCentral.verifyOTP(mobile, cleanOTP, otpRecord.verificationId);
    
    if (!verifyResult.success || !verifyResult.verified) {
      otpRecord.attempts++;
      return res.status(401).json({
        success: false,
        message: "Invalid OTP.",
        attemptsLeft: MAX_OTP_ATTEMPTS - otpRecord.attempts
      });
    }

    let customer;
    if (type === "register") {
      const result = await db.query(
        "INSERT INTO customers (name, phone, hotel_id) VALUES ($1, $2, $3) RETURNING customer_id, name, phone, hotel_id",
        [otpRecord.name, mobile, otpRecord.hotelId]
      );
      customer = result.rows[0];
    } else {
      const result = await db.query(
        "SELECT customer_id, name, phone, hotel_id FROM customers WHERE phone = $1 AND hotel_id = $2",
        [mobile, otpRecord.hotelId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Customer account not found at this hotel." });
      }
      customer = result.rows[0];
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
    
    otpStore.delete(otpKey);
    
    return res.json({
      success: true,
      message: type === "register" ? "Registration successful" : "Login successful",
      customer: { id: customer.customer_id, name: customer.name, phone: customer.phone, hotelId: customer.hotel_id }
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ success: false, message: "OTP verification failed." });
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

    const result = await db.query("SELECT dob FROM customers WHERE customer_id = $1", [session.customerId]);
    const hasDob = result.rows.length > 0 && result.rows[0].dob !== null;
    
    return res.json({
      authenticated: true,
      customer: {
        id: session.customerId,
        name: session.name,
        phone: session.phone,
        hasDob,
        hotelId: session.hotelId,
        hotelSlug
      }
    });
  } catch (error) {
    console.error("Session check error:", error);
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

const requireAuth = async (req, res, next) => {
  try {
    const session = await verifySession(req.cookies.sessionId);
    
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

router.post("/admin/signup", async (req, res) => {
  try {
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

    const result = await db.query(
      "INSERT INTO admins (name, username, email, password) VALUES ($1, $2, $3, $4) RETURNING admin_id, name, username, email",
      [name || null, username, email || null, hashPassword(password)]
    );
    
    return res.json({
      success: true,
      message: "Admin created successfully",
      admin: result.rows[0]
    });
  } catch (error) {
    console.error("Admin signup error:", error);
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
      "SELECT admin_id, username, hotel_id, role FROM admins WHERE username = $1 AND password = $2",
      [username, hashPassword(password)]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const admin = result.rows[0];
    
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
    
    console.log(`Admin login: ${admin.username} (${admin.role})`);
    
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
    console.error("Admin login error:", error);
    return res.status(500).json({ success: false, message: "Admin login failed." });
  }
});

router.post("/admin/forgot-otp", async (req, res) => {
  try {
    let { username, phone } = req.body;
    if (!username) username = "Admin";
    if (!phone) phone = "9356918260";

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
    console.error("Super Admin Forgot OTP error:", error);
    return res.status(500).json({ success: false, message: "Failed to process forgot OTP request." });
  }
});

router.post("/admin/reset-password", async (req, res) => {
  try {
    let { username, phone, otp, password } = req.body;
    if (!username) username = "Admin";
    if (!phone) phone = "9356918260";

    if (!otp || !password) {
      return res.status(400).json({ success: false, message: "OTP and new passkey are required." });
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
    const hashed = hashPassword(password);
    await db.query(
      "UPDATE public.admins SET password = $1 WHERE admin_id = $2",
      [hashed, admin.admin_id]
    );

    // Delete any active sessions for the super admin
    await db.query("DELETE FROM sessions WHERE admin_id = $1", [admin.admin_id]);

    otpStore.delete(otpKey);

    return res.json({ success: true, message: "Super Admin passkey reset successful. Please login with your new passkey." });
  } catch (error) {
    console.error("Super Admin reset password error:", error);
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
    console.error("Admin session check error:", error);
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

const requireAdmin = async (req, res, next) => {
  try {
    const sessionId = req.cookies.superAdminSessionId || req.cookies.adminSessionId;
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
    console.error("Admin auth middleware error:", error);
    res.clearCookie("adminSessionId");
    res.clearCookie("superAdminSessionId");
    return res.status(401).json({ success: false, message: "Admin authentication required" });
  }
};

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireAdmin = requireAdmin;
