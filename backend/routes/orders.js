// Order creation and management routes

const express = require("express");
const logger = require("../utils/logger");
const router = express.Router();
const db = require("./database");
const { requireAuth } = require("./auth");
const crypto = require("crypto");
require("dotenv").config();

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_SECRET) {
  logger.error("CRITICAL: RAZORPAY_KEY_SECRET environment variable is missing.");
  process.exit(1);
}

// ── Haversine distance helper (returns meters) ─────────────────────────
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

router.post("/create-after-payment", requireAuth, async (req, res) => {
  try {
    const {
      items,
      table_number,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customerLat,
      customerLng
    } = req.body;

    const customerId = req.customer.customerId;

    // ---------------- VALIDATIONS ----------------

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

    if (!table_number) {
      return res.status(400).json({
        success: false,
        message: "Table number required"
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment details missing"
      });
    }

    // ---------------- PAYMENT SIGNATURE VERIFY ----------------

    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature"
      });
    }

    // ---------------- DUPLICATE PAYMENT CHECK ----------------
    const dupCheck = await db.query(
      "SELECT payment_id FROM payments WHERE razorpay_payment_id = $1",
      [razorpay_payment_id]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: "This payment has already been used to place an order." });
    }

    // ---------------- HOTEL RESOLVING & TABLE AVAILABILITY CHECK ----------------
    
    const hotelSlug = req.body.hotel_slug || "hotbyte";
    const hotelResult = await db.query("SELECT hotel_id, is_open, latitude, longitude, order_radius FROM public.hotels WHERE slug = $1", [hotelSlug]);
    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }
    const { hotel_id: hotelId, is_open: isOpen, latitude: hotelLat, longitude: hotelLng, order_radius: orderRadius } = hotelResult.rows[0];

    if (isOpen === false) {
      return res.status(400).json({
        success: false,
        message: "This hotel is currently closed and not accepting new orders."
      });
    }

    // ── Server-side proximity check ───────────────────────────────────────
    if (hotelLat !== null && hotelLng !== null) {
      const cLat = parseFloat(customerLat);
      const cLng = parseFloat(customerLng);
      if (isNaN(cLat) || isNaN(cLng)) {
        return res.status(400).json({
          success: false,
          message: "Your location is required to place an order. Please enable GPS and try again."
        });
      }
      const dist = haversineDistance(cLat, cLng, parseFloat(hotelLat), parseFloat(hotelLng));
      const radius = orderRadius || 30;
      if (dist > radius) {
        return res.status(403).json({
          success: false,
          locationError: true,
          message: `You must be within ${radius} meters of the hotel to place an order. (Current distance: ${Math.round(dist)}m)`
        });
      }
    }

    if (req.customer.hotelId !== hotelId) {
      return res.status(403).json({
        success: false,
        message: "You are not registered with this hotel."
      });
    }

    const tableCheck = await db.query(
      `SELECT order_id FROM orders
       WHERE table_number = $1 AND hotel_id = $2
       AND status IN ('pending','preparing','ready')
       AND DATE(created_at) = CURRENT_DATE`,
      [table_number.trim(), hotelId]
    );

    if (tableCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Table ${table_number} is occupied`
      });
    }

    // ---------------- CALCULATE TOTAL ----------------

    let totalAmount = 0;
    const itemIds = items.map(i => i.item_id);
    const dbItemsResult = await db.query(
      "SELECT item_id, price FROM public.menu_items WHERE item_id = ANY($1) AND hotel_id = $2",
      [itemIds, hotelId]
    );
    const dbItemsMap = new Map(dbItemsResult.rows.map(r => [r.item_id, parseFloat(r.price)]));

    for (const item of items) {
      if (!item.item_id || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: "Invalid item data"
        });
      }
      const verifiedPrice = dbItemsMap.get(item.item_id);
      if (verifiedPrice === undefined) {
        return res.status(400).json({
          success: false,
          message: "Item not found or not available at this hotel."
        });
      }
      item.price = verifiedPrice;
      totalAmount += verifiedPrice * item.quantity;
    }

    // ---------------- DB TRANSACTION START ----------------
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // 1️⃣ CREATE ORDER
      const orderResult = await client.query(
        `INSERT INTO orders (customer_id, table_number, total_amount, status, hotel_id)
         VALUES ($1, $2, $3, 'pending', $4)
         RETURNING order_id, table_number, total_amount, status, created_at`,
        [customerId, table_number.trim(), totalAmount, hotelId]
      );

      const order = orderResult.rows[0];

      // 2️⃣ INSERT ORDER ITEMS
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, item_id, quantity, price)
           VALUES ($1, $2, $3, $4)`,
          [order.order_id, item.item_id, item.quantity, item.price]
        );
      }

      // 3️⃣ INSERT PAYMENT RECORD
      await client.query(
        `INSERT INTO payments (order_id, amount, payment_status, payment_method, razorpay_payment_id)
         VALUES ($1, $2, 'completed', 'razorpay', $3)`,
        [order.order_id, totalAmount, razorpay_payment_id]
      );

      await client.query("COMMIT");

      return res.json({
        success: true,
        message: "Order placed successfully",
        order
      });

    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error("Create order after payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
});


router.get("/table-availability", requireAuth, async (req, res) => {
  try {
    const hotelSlug = req.query.hotel_slug || "hotbyte";
    const hotelResult = await db.query("SELECT hotel_id FROM public.hotels WHERE slug = $1", [hotelSlug]);
    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }
    const hotelId = hotelResult.rows[0].hotel_id;

    if (req.customer.hotelId !== hotelId) {
      return res.status(403).json({
        success: false,
        message: "You are not registered with this hotel."
      });
    }

    const result = await db.query(
      `SELECT DISTINCT table_number 
       FROM orders 
       WHERE hotel_id = $1 AND status IN ('pending', 'preparing', 'ready')
       AND DATE(created_at) = CURRENT_DATE`,
      [hotelId]
    );

    // Fetch hotel's configurable table count (default 5)
    const hotelData = await db.query(
      'SELECT table_count FROM public.hotels WHERE hotel_id = $1',
      [hotelId]
    );
    const tableCount = hotelData.rows.length > 0 ? (hotelData.rows[0].table_count || 5) : 5;
    const allTables = Array.from({ length: tableCount }, (_, i) => `T-${i + 1}`);

    const occupiedTables = result.rows.map(row => row.table_number);
    const availableTables = allTables.filter(table => !occupiedTables.includes(table));
    
    return res.json({
      success: true,
      occupied: occupiedTables,
      available: availableTables,
      tableStatus: allTables.reduce((acc, table) => {
        acc[table] = !occupiedTables.includes(table);
        return acc;
      }, {})
    });
  } catch (error) {
    logger.error("Check table availability error:", error);
    return res.status(500).json({ success: false, message: "Failed to check table availability" });
  }
});

router.post("/create", requireAuth, async (req, res) => {
  try {
    const { items, table_number, customerLat, customerLng } = req.body;
    const customerId = req.customer.customerId;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty. Please add items to cart." });
    }

    if (!table_number || !table_number.trim()) {
      return res.status(400).json({ success: false, message: "Table number is required." });
    }

    const hotelSlug = req.body.hotel_slug || "hotbyte";
    const hotelResult = await db.query("SELECT hotel_id, is_open, latitude, longitude, order_radius FROM public.hotels WHERE slug = $1", [hotelSlug]);
    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }
    const { hotel_id: hotelId, is_open: isOpen, latitude: hotelLat, longitude: hotelLng, order_radius: orderRadius } = hotelResult.rows[0];

    if (isOpen === false) {
      return res.status(400).json({
        success: false,
        message: "This hotel is currently closed and not accepting new orders."
      });
    }

    // ── Server-side proximity check ───────────────────────────────────────
    if (hotelLat !== null && hotelLng !== null) {
      const cLat = parseFloat(customerLat);
      const cLng = parseFloat(customerLng);
      if (isNaN(cLat) || isNaN(cLng)) {
        return res.status(400).json({
          success: false,
          message: "Your location is required to place an order. Please enable GPS and try again."
        });
      }
      const dist = haversineDistance(cLat, cLng, parseFloat(hotelLat), parseFloat(hotelLng));
      const radius = orderRadius || 30;
      if (dist > radius) {
        return res.status(403).json({
          success: false,
          locationError: true,
          message: `You must be within ${radius} meters of the hotel to place an order. (Current distance: ${Math.round(dist)}m)`
        });
      }
    }

    if (req.customer.hotelId !== hotelId) {
      return res.status(403).json({
        success: false,
        message: "You are not registered with this hotel."
      });
    }

    const tableCheck = await db.query(
      `SELECT order_id FROM orders 
       WHERE table_number = $1 AND hotel_id = $2
       AND status IN ('pending', 'preparing', 'ready')
       AND DATE(created_at) = CURRENT_DATE
       LIMIT 1`,
      [table_number.trim(), hotelId]
    );

    if (tableCheck.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Table ${table_number} is currently occupied. Please select another table.` 
      });
    }

    let totalAmount = 0;
    const itemIds = items.map(i => i.item_id);
    const dbItemsResult = await db.query(
      "SELECT item_id, price FROM public.menu_items WHERE item_id = ANY($1) AND hotel_id = $2",
      [itemIds, hotelId]
    );
    const dbItemsMap = new Map(dbItemsResult.rows.map(r => [r.item_id, parseFloat(r.price)]));

    for (const item of items) {
      if (!item.item_id || !item.quantity) {
        return res.status(400).json({ success: false, message: "Invalid item data." });
      }
      const verifiedPrice = dbItemsMap.get(item.item_id);
      if (verifiedPrice === undefined) {
        return res.status(400).json({
          success: false,
          message: "Item not found or not available at this hotel."
        });
      }
      item.price = verifiedPrice;
      totalAmount += verifiedPrice * parseInt(item.quantity);
    }

    await db.query("BEGIN");

    try {
      const orderResult = await db.query(
        `INSERT INTO orders (customer_id, table_number, total_amount, status, hotel_id) 
         VALUES ($1, $2, $3, 'pending', $4) 
         RETURNING order_id, customer_id, table_number, total_amount, status, created_at`,
        [customerId, table_number.trim(), totalAmount, hotelId]
      );

      const order = orderResult.rows[0];

      const orderItemsValues = items.map((item, index) => 
        `($1, $${index * 3 + 2}, $${index * 3 + 3}, $${index * 3 + 4})`
      ).join(', ');
      
      const orderItemsParams = [order.order_id];
      items.forEach(item => {
        orderItemsParams.push(item.item_id, item.quantity, item.price);
      });

      await db.query(
        `INSERT INTO order_items (order_id, item_id, quantity, price) VALUES ${orderItemsValues}`,
        orderItemsParams
      );

      await db.query(
        `INSERT INTO payments (order_id, amount, payment_status, payment_method) 
         VALUES ($1, $2, 'pending', 'cash')`,
        [order.order_id, totalAmount]
      );

      await db.query("COMMIT");

      return res.json({
        success: true,
        message: "Order placed successfully!",
        order: {
          order_id: order.order_id,
          table_number: order.table_number,
          total_amount: parseFloat(order.total_amount),
          status: order.status,
          created_at: order.created_at,
        },
      });
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    logger.error("Create order error:", error);
    return res.status(500).json({ success: false, message: "Failed to place order. Please try again." });
  }
});

router.delete("/cancel/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.customer.customerId;

    const orderCheck = await db.query(
      "SELECT order_id, status FROM orders WHERE order_id = $1 AND customer_id = $2 AND hotel_id = $3",
      [id, customerId, req.customer.hotelId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orderCheck.rows[0];

    if (order.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot cancel order. Order is already being processed." 
      });
    }

    const paymentCheck = await db.query(
      "SELECT payment_status FROM payments WHERE order_id = $1",
      [id]
    );

    if (paymentCheck.rows.length > 0 && paymentCheck.rows[0].payment_status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot cancel order. Payment has already been completed." 
      });
    }

    await db.query("BEGIN");

    try {
      await db.query("DELETE FROM order_items WHERE order_id = $1", [id]);
      await db.query("DELETE FROM payments WHERE order_id = $1", [id]);
      await db.query("DELETE FROM orders WHERE order_id = $1", [id]);

      await db.query("COMMIT");

      return res.json({ success: true, message: "Order cancelled successfully" });
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    logger.error("Cancel order error:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel order" });
  }
});

module.exports = router;
