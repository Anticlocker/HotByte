// Payments Routes - Razorpay integration
const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
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
    const { plan, hotel_slug } = req.body;

    if (!plan || !hotel_slug) {
      return res.status(400).json({ success: false, message: "Plan and hotel slug are required." });
    }

    if (plan !== 'basic' && plan !== 'pro') {
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

    // Determine amount (Basic: 999, Pro: 2499)
    const price = plan === 'pro' ? 2499 : 999;
    const amountInPaise = price * 100;

    const razorpayOrder = await getRazorpay().orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `sub_${hotel_slug}_${plan}_${Date.now()}`
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
    const { plan, hotel_slug, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!plan || !hotel_slug || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "All payment details are required." });
    }

    if (plan !== 'basic' && plan !== 'pro') {
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

module.exports = router;
