// Payments Routes - Razorpay integration
const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 12;
const db = require("./database");
const { requireAuth, requireAdmin } = require("./auth");
require("dotenv").config();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Production safety check
if ((!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) && process.env.NODE_ENV === 'production') {
  console.error("❌ FATAL: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in production environment");
  process.exit(1);
}

// Lazy-initialize Razorpay to avoid crashing at startup if env vars are missing
let _razorpay = null;
const getRazorpay = () => {
  if (!_razorpay) {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured.');
    }
    _razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  }
  return _razorpay;
};

// Get Razorpay key (Base64 encoded for obfuscation)
router.get("/razorpay-key", requireAuth, (req, res) => {
  const obfuscatedKey = Buffer.from(RAZORPAY_KEY_ID).toString('base64');
  res.json({
    success: true,
    key: obfuscatedKey
  });
});

// Get Razorpay key for admins (Base64 encoded for obfuscation)
router.get("/admin-razorpay-key", requireAdmin, (req, res) => {
  const obfuscatedKey = Buffer.from(RAZORPAY_KEY_ID).toString('base64');
  res.json({
    success: true,
    key: obfuscatedKey
  });
});

// Create Razorpay order
router.post("/create-razorpay-order", requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: "Amount is required" });
    }

    const razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(parseFloat(amount) * 100), // Convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return res.json({
      success: true,
      razorpay_order: razorpayOrder,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);
    return res.status(500).json({ success: false, message: "Failed to create payment order" });
  }
});

// Create order (for existing orders)
router.post("/create-order", requireAuth, async (req, res) => {
  try {
    const { order_id, amount } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ success: false, message: "Order ID and amount are required" });
    }

    const orderResult = await db.query(
      "SELECT order_id, customer_id, total_amount FROM orders WHERE order_id = $1",
      [order_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orderResult.rows[0];

    if (order.customer_id !== req.customer.customerId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(parseFloat(amount) * 100), // Convert to paise
      currency: "INR",
      receipt: `order_${order_id}`,
    });

    return res.json({
      success: true,
      razorpay_order: razorpayOrder,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);
    return res.status(500).json({ success: false, message: "Failed to create payment order" });
  }
});

// Verify payment
router.post("/verify", requireAuth, async (req, res) => {
  try {
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "All payment details are required" });
    }

    const orderResult = await db.query(
      "SELECT order_id, customer_id, total_amount FROM orders WHERE order_id = $1",
      [order_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orderResult.rows[0];

    if (order.customer_id !== req.customer.customerId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Verify Razorpay signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // Check if the payment ID has already been verified/saved
    const dupCheck = await db.query(
      "SELECT payment_id FROM payments WHERE razorpay_payment_id = $1",
      [razorpay_payment_id]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: "This payment has already been verified and processed." });
    }

    await db.query("BEGIN");

    try {
      // Save payment record
      await db.query(
        `INSERT INTO payments (order_id, amount, payment_status, payment_method, razorpay_payment_id) 
         VALUES ($1, $2, 'completed', 'razorpay', $3)`,
        [order_id, order.total_amount, razorpay_payment_id]
      );

      await db.query("COMMIT");

      return res.json({
        success: true,
        message: "Payment verified and saved successfully",
      });
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({ success: false, message: "Failed to verify payment" });
  }
});

// Create Razorpay subscription upgrade order
router.post("/create-subscription-order", requireAdmin, async (req, res) => {
  try {
    const { plan, hotel_slug, billing_cycle } = req.body;

    if (!plan || !hotel_slug) {
      return res.status(400).json({ success: false, message: "Plan and hotel slug are required." });
    }

    if (plan !== 'basic' && plan !== 'pro' && plan !== 'trial') {
      return res.status(400).json({ success: false, message: "Invalid subscription plan." });
    }

    let targetHotelId = req.admin.hotelId;

    // Strict tenancy checks
    if (req.admin.role === 'super_admin') {
      const hotelRes = await db.query("SELECT hotel_id FROM public.hotels WHERE slug = $1", [hotel_slug]);
      if (hotelRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Hotel not found." });
      }
      targetHotelId = hotelRes.rows[0].hotel_id;
    } else {
      const hotelRes = await db.query("SELECT slug FROM public.hotels WHERE hotel_id = $1", [targetHotelId]);
      if (hotelRes.rows.length === 0 || hotelRes.rows[0].slug !== hotel_slug) {
        return res.status(403).json({ success: false, message: "Unauthorized hotel tenant access." });
      }
    }

    // Determine amount dynamically from subscription_plans table
    const planResult = await db.query(
      "SELECT price_monthly, price_yearly FROM public.subscription_plans WHERE name = $1",
      [plan]
    );

    if (planResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Subscription plan details not found." });
    }

    const { price_monthly, price_yearly } = planResult.rows[0];
    const isYearly = billing_cycle === 'yearly';
    const price = isYearly ? parseFloat(price_yearly) : parseFloat(price_monthly);
    const amountInPaise = Math.round(price * 100);

    const razorpayOrder = await getRazorpay().orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `sub_${hotel_slug}_${plan}_${billing_cycle || 'monthly'}_${Date.now()}`
    });

    return res.json({
      success: true,
      razorpay_order: razorpayOrder,
      amount: price
    });
  } catch (error) {
    console.error("Create subscription order error:", error);
    return res.status(500).json({ success: false, message: "Failed to create subscription payment order." });
  }
});

// Verify subscription payment and activate plan
router.post("/verify-subscription", requireAdmin, async (req, res) => {
  try {
    const { plan, hotel_slug, razorpay_order_id, razorpay_payment_id, razorpay_signature, billing_cycle } = req.body;

    if (!plan || !hotel_slug || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "All payment details are required." });
    }

    if (plan !== 'basic' && plan !== 'pro' && plan !== 'trial') {
      return res.status(400).json({ success: false, message: "Invalid subscription plan." });
    }

    let targetHotelId = req.admin.hotelId;

    // Strict tenancy checks
    if (req.admin.role === 'super_admin') {
      const hotelRes = await db.query("SELECT hotel_id FROM public.hotels WHERE slug = $1", [hotel_slug]);
      if (hotelRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Hotel not found." });
      }
      targetHotelId = hotelRes.rows[0].hotel_id;
    } else {
      const hotelRes = await db.query("SELECT slug FROM public.hotels WHERE hotel_id = $1", [targetHotelId]);
      if (hotelRes.rows.length === 0 || hotelRes.rows[0].slug !== hotel_slug) {
        return res.status(403).json({ success: false, message: "Unauthorized hotel tenant access." });
      }
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature." });
    }

    // Update hotel plan and reactivate/unfreeze
    await db.query(
      "UPDATE public.hotels SET plan = $1, is_frozen = FALSE WHERE hotel_id = $2",
      [plan, targetHotelId]
    );

    // Fetch plan details to log transaction history in subscriptions ledger
    const planDetails = await db.query("SELECT plan_id FROM public.subscription_plans WHERE name = $1", [plan]);
    if (planDetails.rows.length > 0) {
      const planId = planDetails.rows[0].plan_id;

      // Mark all previous active subscriptions for this hotel as cancelled/replaced
      await db.query(
        "UPDATE public.subscriptions SET status = 'cancelled' WHERE hotel_id = $1 AND status = 'active'",
        [targetHotelId]
      );

      // Insert new active subscription record with billing window
      const intervalDays = billing_cycle === 'yearly' ? 365 : 30;
      await db.query(
        `INSERT INTO public.subscriptions (hotel_id, plan_id, start_date, expiry_date, status)
         VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '${intervalDays} days', 'active')`,
        [targetHotelId, planId]
      );
    }

    console.log(`💳 Subscription Upgraded: Hotel ID ${targetHotelId} (/${hotel_slug}) is now on "${plan}" plan.`);

    return res.json({
      success: true,
      message: `Successfully upgraded to the ${plan} plan!`
    });
  } catch (error) {
    console.error("Verify subscription error:", error);
    return res.status(500).json({ success: false, message: "Failed to verify subscription upgrade." });
  }
});

// Import menu seeding service
const { seedDefaultMenu } = require("./seedDefaultMenu");

// Session helper for dynamic onboarding log-in
const createOnboardingAdminSession = async (adminId, role, req) => {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const hours = 24; // ADMIN_SESSION_EXPIRY_HOURS
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  const userAgent = req.headers["user-agent"] || "";

  await db.query("DELETE FROM sessions WHERE admin_id = $1", [adminId]);

  await db.query(
    "INSERT INTO sessions (session_id, admin_id, user_agent, expires_at) VALUES ($1, $2, $3, $4)",
    [sessionId, adminId, userAgent, expiresAt]
  );

  return { sessionId, expiresAt };
};

/**
 * POST /api/payments/create-new-hotel-subscription-order
 * Public endpoint to pre-validate fields and initiate a Razorpay order for registration
 */
router.post("/create-new-hotel-subscription-order", async (req, res) => {
  try {
    const {
      plan, billing_cycle,
      hotelName, hotelSlug, hotelPhone, hotelAddress,
      adminName, adminUsername, adminEmail, adminPassword
    } = req.body;

    // Check basic required fields
    if (!plan || !hotelName || !hotelSlug || !adminUsername || !adminPassword) {
      return res.status(400).json({ success: false, message: "All essential hotel and admin details are required." });
    }

    if (plan !== 'basic' && plan !== 'pro') {
      return res.status(400).json({ success: false, message: "Invalid subscription plan selected." });
    }

    const cleanSlug = hotelSlug.trim().toLowerCase().replace(/[^a-z0-9\-]/g, "");
    if (!cleanSlug || cleanSlug !== hotelSlug.trim().toLowerCase()) {
      return res.status(400).json({ success: false, message: "Invalid URL slug. Use alphanumeric and hyphen characters only." });
    }

    if (adminPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Admin password must be at least 6 characters long." });
    }

    // Check for existing slug
    const existingSlug = await db.query("SELECT hotel_id FROM public.hotels WHERE slug = $1", [cleanSlug]);
    if (existingSlug.rows.length > 0) {
      return res.status(409).json({ success: false, message: "A hotel with this URL slug already exists." });
    }

    // Check for existing admin username
    const existingUsername = await db.query("SELECT admin_id FROM public.admins WHERE username = $1", [adminUsername.trim()]);
    if (existingUsername.rows.length > 0) {
      return res.status(409).json({ success: false, message: "This Hotel Admin username is already taken." });
    }

    // Check for existing admin email
    if (adminEmail && adminEmail.trim() !== "") {
      const existingEmail = await db.query("SELECT admin_id FROM public.admins WHERE email = $1", [adminEmail.trim()]);
      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ success: false, message: "This email address is already registered." });
      }
    }

    // Determine amount dynamically from subscription_plans table
    const planResult = await db.query(
      "SELECT price_monthly, price_yearly FROM public.subscription_plans WHERE name = $1",
      [plan]
    );

    if (planResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Subscription plan details not found." });
    }

    const { price_monthly, price_yearly } = planResult.rows[0];
    const isYearly = billing_cycle === 'yearly';
    const price = isYearly ? parseFloat(price_yearly) : parseFloat(price_monthly);
    const amountInPaise = Math.round(price * 100);

    const razorpayOrder = await getRazorpay().orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `reg_${cleanSlug}_${plan}_${billing_cycle || 'monthly'}_${Date.now()}`
    });

    return res.json({
      success: true,
      razorpay_order: razorpayOrder,
      amount: price
    });
  } catch (error) {
    console.error("Create onboarding subscription order error:", error);
    return res.status(500).json({ success: false, message: "Failed to initialize subscription checkout order." });
  }
});

/**
 * POST /api/payments/verify-new-hotel-subscription
 * Public endpoint to verify payment, transactionally register hotel + admin, seed menu, and log them in
 */
router.post("/verify-new-hotel-subscription", async (req, res) => {
  try {
    const {
      plan, billing_cycle,
      hotelName, hotelSlug, hotelPhone, hotelAddress,
      adminName, adminUsername, adminEmail, adminPassword,
      razorpay_order_id, razorpay_payment_id, razorpay_signature
    } = req.body;

    if (!plan || !hotelName || !hotelSlug || !adminUsername || !adminPassword || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "All registration and payment verification fields are required." });
    }

    // Verify signature first
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature verification." });
    }

    const cleanSlug = hotelSlug.trim().toLowerCase().replace(/[^a-z0-9\-]/g, "");

    // Pre-checks to avoid transaction abort where possible
    const existingSlug = await db.query("SELECT hotel_id FROM public.hotels WHERE slug = $1", [cleanSlug]);
    if (existingSlug.rows.length > 0) {
      return res.status(409).json({ success: false, message: "A hotel with this URL slug already exists." });
    }

    const existingUsername = await db.query("SELECT admin_id FROM public.admins WHERE username = $1", [adminUsername.trim()]);
    if (existingUsername.rows.length > 0) {
      return res.status(409).json({ success: false, message: "This Hotel Admin username is already taken." });
    }

    // Start Transaction
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // 1. Insert Hotel
      const hotelResult = await client.query(
        "INSERT INTO public.hotels (name, slug, phone, address, plan, table_count, order_radius) VALUES ($1, $2, $3, $4, $5, 5, 30) RETURNING hotel_id",
        [hotelName.trim(), cleanSlug, hotelPhone ? hotelPhone.trim() : null, hotelAddress ? hotelAddress.trim() : null, plan]
      );
      const newHotelId = hotelResult.rows[0].hotel_id;

      // 2. Insert Admin (bcrypt hashed password)
      const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);
      const adminResult = await client.query(
        "INSERT INTO public.admins (name, username, email, password, hotel_id, role) VALUES ($1, $2, $3, $4, $5, 'admin') RETURNING admin_id",
        [adminName ? adminName.trim() : null, adminUsername.trim(), adminEmail && adminEmail.trim() !== "" ? adminEmail.trim() : null, hashedPassword, newHotelId]
      );
      const newAdminId = adminResult.rows[0].admin_id;

      // 3. Seed default menu
      await seedDefaultMenu(client, newHotelId, true);

      // 4. Record Subscription ledger row
      const planDetails = await client.query("SELECT plan_id FROM public.subscription_plans WHERE name = $1", [plan]);
      if (planDetails.rows.length > 0) {
        const planId = planDetails.rows[0].plan_id;
        const intervalDays = billing_cycle === 'yearly' ? 365 : 30;
        await client.query(
          `INSERT INTO public.subscriptions (hotel_id, plan_id, start_date, expiry_date, status)
           VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '${intervalDays} days', 'active')`,
          [newHotelId, planId]
        );
      }

      await client.query("COMMIT");

      // 5. Establish session
      const { sessionId } = await createOnboardingAdminSession(newAdminId, 'admin', req);

      // Set session cookie
      res.clearCookie("superAdminSessionId");
      res.cookie("adminSessionId", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/"
      });

      console.log(`💳 Onboarding Signup Successful: Hotel ID ${newHotelId} ("${hotelName}", /${cleanSlug}) is now active.`);

      return res.json({
        success: true,
        message: "Hotel onboarded and active subscription enabled successfully!",
        hotel_slug: cleanSlug
      });
    } catch (txnError) {
      await client.query("ROLLBACK");
      throw txnError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Verify onboarding subscription error:", error);
    return res.status(500).json({ success: false, message: "Failed to verify payment and complete onboarding." });
  }
});

// ==============================================================================
// 🆕 REDESIGNED SAAS ONBOARDING FLOW ENDPOINTS
// ==============================================================================

/**
 * GET /api/payments/public-razorpay-key
 * Public endpoint to fetch the Base64-encoded Razorpay Key ID for guests
 */
router.get("/public-razorpay-key", (req, res) => {
  try {
    const obfuscatedKey = Buffer.from(RAZORPAY_KEY_ID).toString('base64');
    return res.json({
      success: true,
      key: obfuscatedKey
    });
  } catch (error) {
    console.error("Fetch public Razorpay key error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve payment credentials." });
  }
});

/**
 * POST /api/payments/create-onboarding-order
 * Public endpoint to dynamically create a Razorpay order for onboarding based on plan & cycle
 */
router.post("/create-onboarding-order", async (req, res) => {
  try {
    const { plan, billing_cycle } = req.body;

    if (!plan) {
      return res.status(400).json({ success: false, message: "Subscription plan is required." });
    }

    if (plan !== 'basic' && plan !== 'pro') {
      return res.status(400).json({ success: false, message: "Invalid subscription plan selected." });
    }

    // Determine amount dynamically from subscription_plans table
    const planResult = await db.query(
      "SELECT price_monthly, price_yearly FROM public.subscription_plans WHERE name = $1",
      [plan]
    );

    if (planResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Subscription plan details not found." });
    }

    const { price_monthly, price_yearly } = planResult.rows[0];
    const isYearly = billing_cycle === 'yearly';
    const price = isYearly ? parseFloat(price_yearly) : parseFloat(price_monthly);
    const amountInPaise = Math.round(price * 100);

    const razorpayOrder = await getRazorpay().orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `onb_${plan}_${billing_cycle || 'monthly'}_${Date.now()}`
    });

    return res.json({
      success: true,
      razorpay_order: razorpayOrder,
      amount: price
    });
  } catch (error) {
    console.error("Create onboarding order error:", error);
    return res.status(500).json({ success: false, message: "Failed to initialize payment checkout order." });
  }
});

/**
 * POST /api/payments/validate-account
 * Public endpoint to validate username and email uniqueness before starting registration
 */
router.post("/validate-account", async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ success: false, message: "Username and email are required." });
    }

    // Check username in public.admins
    const usernameCheck = await db.query("SELECT admin_id FROM public.admins WHERE username = $1", [username.trim()]);
    if (usernameCheck.rows.length > 0) {
      return res.json({ success: false, field: "username", message: "Username is already taken." });
    }

    // Check email in public.admins
    const emailCheck = await db.query("SELECT admin_id FROM public.admins WHERE email = $1", [email.trim()]);
    if (emailCheck.rows.length > 0) {
      return res.json({ success: false, field: "email", message: "Email address is already registered." });
    }

    return res.json({ success: true, message: "Username and email are available." });
  } catch (error) {
    console.error("Validate account error:", error);
    return res.status(500).json({ success: false, message: "Internal server error during validation." });
  }
});

/**
 * POST /api/payments/create-inactive-session
 * Public endpoint to pre-validate account details and create an inactive session + Razorpay order
 */
router.post("/create-inactive-session", async (req, res) => {
  try {
    const { plan, billing_cycle, username, email, password } = req.body;

    // Normalize plan identifier (accept friendly names like "14-Day Trial")
    const normalizedPlan = plan.toString().toLowerCase().includes('trial') ? 'trial' : plan;
    if (normalizedPlan !== 'trial' && normalizedPlan !== 'basic' && normalizedPlan !== 'pro') {
      return res.status(400).json({ success: false, message: "Invalid plan selected." });
    }
    // Use normalizedPlan for further processing
    const effectivePlan = normalizedPlan;

    // Check duplicates in active table
    const usernameCheck = await db.query("SELECT admin_id FROM public.admins WHERE username = $1", [username.trim()]);
    if (usernameCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Username is already taken." });
    }

    const emailCheck = await db.query("SELECT admin_id FROM public.admins WHERE email = $1", [email.trim()]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Email is already registered." });
    }

    // Strict Trial Uniqueness check (One trial per account/email only)
    if (effectivePlan === 'trial') {
      const existingTrial = await db.query(
        `SELECT a.admin_id 
         FROM public.admins a 
         JOIN public.hotels h ON a.hotel_id = h.hotel_id 
         WHERE a.email = $1 AND h.plan = 'trial'`,
        [email.trim()]
      );
      if (existingTrial.rows.length > 0) {
        return res.status(409).json({ success: false, message: "This email address has already been used to register a trial account." });
      }

      const existingSession = await db.query(
        `SELECT session_token FROM public.payment_sessions 
         WHERE email = $1 AND plan = 'trial' AND (status = 'paid' OR status = 'consumed')`,
        [email.trim()]
      );
      if (existingSession.rows.length > 0) {
        return res.status(409).json({ success: false, message: "This email address has already been used to register a trial account." });
      }
    }

    // Get plan prices
    const planResult = await db.query(
      "SELECT price_monthly, price_yearly FROM public.subscription_plans WHERE name = $1",
      [effectivePlan]
    );

    if (planResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Plan details not found." });
    }

    const { price_monthly, price_yearly } = planResult.rows[0];
    const isYearly = billing_cycle === 'yearly';
    const price = isYearly ? parseFloat(price_yearly) : parseFloat(price_monthly);
    const amountInPaise = Math.round(price * 100);

    // Create Razorpay Order
    const razorpayOrder = await getRazorpay().orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `onb_act_${username.trim()}_${Date.now()}`
    });

    // Hash the password securely using bcrypt
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create session token and insert into public.payment_sessions
    const sessionToken = crypto.randomBytes(32).toString('hex');
    await db.query(
      `INSERT INTO public.payment_sessions (
        session_token, razorpay_order_id, plan, billing_cycle, status,
        username, email, password
      ) VALUES ($1, $2, $3, $4, 'pending_payment', $5, $6, $7)`,
      [
        sessionToken,
        razorpayOrder.id,
        effectivePlan,
        billing_cycle || 'monthly',
        username.trim(),
        email.trim(),
        hashedPassword
      ]
    );

    return res.json({
      success: true,
      token: sessionToken,
      razorpay_order: razorpayOrder,
      amount: price
    });
  } catch (error) {
    console.error("Create inactive session error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to initialize account and payment order." });
  }
});

/**
 * POST /api/payments/verify-onboarding-payment
 * Public endpoint to verify payment signature and store a temporary payment session
 */
router.post("/verify-onboarding-payment", async (req, res) => {
  try {
    const { token, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!token || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "All payment verification details are required." });
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature verification." });
    }

    // Verify session exists
    const sessionRes = await db.query(
      "SELECT session_token FROM public.payment_sessions WHERE session_token = $1 AND razorpay_order_id = $2",
      [token, razorpay_order_id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Onboarding session mismatch or not found." });
    }

    // Update status to 'paid' and save payment_id
    await db.query(
      `UPDATE public.payment_sessions 
       SET status = 'paid', razorpay_payment_id = $1 
       WHERE session_token = $2`,
      [razorpay_payment_id, token]
    );

    return res.json({
      success: true,
      token,
      message: "Payment verified successfully! Proceed to Hotel setup."
    });
  } catch (error) {
    console.error("Verify onboarding payment error:", error);
    return res.status(500).json({ success: false, message: "Failed to verify secure payment transaction." });
  }
});

/**
 * GET /api/payments/onboarding-session/:token
 * Public endpoint to retrieve plan details for the onboarding screen
 */
router.get("/onboarding-session/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const sessionRes = await db.query(
      "SELECT plan, billing_cycle, status FROM public.payment_sessions WHERE session_token = $1",
      [token]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Payment session not found." });
    }

    const session = sessionRes.rows[0];
    if (session.status !== 'pending' && session.status !== 'pending_payment' && session.status !== 'paid') {
      return res.status(400).json({ success: false, message: "This payment session has already been consumed or is invalid." });
    }

    // Fetch plan price & features
    const planResult = await db.query(
      "SELECT price_monthly, price_yearly, features FROM public.subscription_plans WHERE name = $1",
      [session.plan]
    );

    if (planResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Plan details not found." });
    }

    const { price_monthly, price_yearly, features } = planResult.rows[0];
    const isYearly = session.billing_cycle === 'yearly';
    const price = isYearly ? parseFloat(price_yearly) : parseFloat(price_monthly);

    return res.json({
      success: true,
      plan: session.plan,
      billing_cycle: session.billing_cycle,
      price,
      status: session.status,
      features: typeof features === 'string' ? JSON.parse(features) : features
    });
  } catch (error) {
    console.error("Get onboarding session error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve onboarding details." });
  }
});

/**
 * POST /api/payments/complete-onboarding
 * Public endpoint to complete onboarding: registers hotel, admin, marks session consumed, and logs them in
 */
router.post("/complete-onboarding", async (req, res) => {
  try {
    const {
      token,
      hotelName, hotelSlug, hotelPhone, hotelAddress,
      latitude, longitude, logoUrl, hotelType
    } = req.body;

    if (!token || !hotelName || !hotelSlug) {
      return res.status(400).json({ success: false, message: "All essential onboarding details are required." });
    }

    // 1. Verify token is paid and pending hotel configuration
    const sessionRes = await db.query(
      "SELECT plan, billing_cycle, status, username, email, password FROM public.payment_sessions WHERE session_token = $1",
      [token]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Invalid or missing payment session." });
    }

    const session = sessionRes.rows[0];
    if (session.status !== 'paid') {
      return res.status(400).json({ success: false, message: "This session is not paid yet or has already been completed." });
    }

    const cleanSlug = hotelSlug.trim().toLowerCase().replace(/[^a-z0-9\-]/g, "");
    if (!cleanSlug || cleanSlug !== hotelSlug.trim().toLowerCase()) {
      return res.status(400).json({ success: false, message: "Invalid URL slug. Use alphanumeric and hyphen characters only." });
    }

    // Check duplicate slug
    const existingSlug = await db.query("SELECT hotel_id FROM public.hotels WHERE slug = $1", [cleanSlug]);
    if (existingSlug.rows.length > 0) {
      return res.status(409).json({ success: false, message: "A hotel with this URL slug already exists." });
    }

    // Check duplicate username
    const existingUsername = await db.query("SELECT admin_id FROM public.admins WHERE username = $1", [session.username]);
    if (existingUsername.rows.length > 0) {
      return res.status(409).json({ success: false, message: "This Hotel Admin username is already taken." });
    }

    // Strict Trial Uniqueness check for Mobile/Phone (One trial per hotel/account only)
    if (session.plan === 'trial' && hotelPhone && hotelPhone.trim() !== '') {
      const phoneCheck = await db.query(
        `SELECT h.hotel_id 
         FROM public.hotels h 
         WHERE h.phone = $1 AND h.plan = 'trial'`,
        [hotelPhone.trim()]
      );
      if (phoneCheck.rows.length > 0) {
        return res.status(409).json({ success: false, message: "This mobile number has already been used to activate a trial package." });
      }
    }

    // Start Transaction
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // 2. Consume payment session to prevent double registration/reuse!
      const updateSession = await client.query(
        "UPDATE public.payment_sessions SET status = 'consumed' WHERE session_token = $1 AND status = 'paid' RETURNING session_token",
        [token]
      );

      if (updateSession.rows.length === 0) {
        throw new Error("Payment session already completed or expired.");
      }

      // Calculate trial expiration date
      const trialEndsAt = session.plan === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null;

      const validHotelTypes = ['veg', 'nonveg', 'both'];
      const safeHotelType = validHotelTypes.includes(hotelType) ? hotelType : 'both';

      // 3. Insert Hotel
      const hotelResult = await client.query(
        `INSERT INTO public.hotels (name, slug, phone, address, plan, table_count, order_radius, latitude, longitude, logo_url, trial_ends_at, hotel_type) 
         VALUES ($1, $2, $3, $4, $5, 5, 30, $6, $7, $8, $9, $10) RETURNING hotel_id`,
        [
          hotelName.trim(),
          cleanSlug,
          hotelPhone ? hotelPhone.trim() : null,
          hotelAddress ? hotelAddress.trim() : null,
          session.plan,
          latitude ? parseFloat(latitude) : null,
          longitude ? parseFloat(longitude) : null,
          logoUrl ? logoUrl.trim() : null,
          trialEndsAt,
          safeHotelType
        ]
      );
      const newHotelId = hotelResult.rows[0].hotel_id;

      // 4. Insert Admin (credentials pre-hashed)
      const adminResult = await client.query(
        "INSERT INTO public.admins (name, username, email, password, hotel_id, role) VALUES ($1, $2, $3, $4, $5, 'admin') RETURNING admin_id",
        [
          session.username,
          session.username,
          session.email,
          session.password,
          newHotelId
        ]
      );
      const newAdminId = adminResult.rows[0].admin_id;

      // 5. Seed default menu
      await seedDefaultMenu(client, newHotelId, true);

      // 6. Record Subscription ledger row
      const planDetails = await client.query("SELECT plan_id FROM public.subscription_plans WHERE name = $1", [session.plan]);
      if (planDetails.rows.length > 0) {
        const planId = planDetails.rows[0].plan_id;
        const intervalDays = session.billing_cycle === 'yearly' ? 365 : 30;
        await client.query(
          `INSERT INTO public.subscriptions (hotel_id, plan_id, start_date, expiry_date, status)
           VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '${intervalDays} days', 'active')`,
          [newHotelId, planId]
        );
      }

      await client.query("COMMIT");

      // 7. Establish login session
      const { sessionId } = await createOnboardingAdminSession(newAdminId, 'admin', req);

      res.clearCookie("superAdminSessionId");
      res.cookie("adminSessionId", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/"
      });

      console.log(`\uD83D\uDCB3 Redesigned SaaS Onboarding Completed: Hotel ID ${newHotelId} ("${hotelName}", /${cleanSlug}) is now live!`);

      return res.json({
        success: true,
        message: "Hotel onboarded successfully!",
        hotel_slug: cleanSlug
      });
    } catch (txnError) {
      await client.query("ROLLBACK");
      throw txnError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to complete onboarding and activate account." });
  }
});

module.exports = router;


