// Order creation and management routes

const express = require("express");
const logger = require("../utils/logger");
const router = express.Router();
const db = require("./database");
const { requireAuth } = require("./auth");
const crypto = require("crypto");
require("dotenv").config();

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_SECRET && process.env.NODE_ENV === 'production') {
  logger.error("CRITICAL: RAZORPAY_KEY_SECRET environment variable is missing.");
  process.exit(1);
}

// ── Haversine distance helper (returns meters) ─────────────────────────
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const validateTableForHotel = async (tableNumber, hotelId) => {
  if (!tableNumber.startsWith("T-")) {
    const result = await db.query(
      "SELECT id, is_active FROM public.restaurant_tables WHERE table_number = $1 AND hotel_id = $2",
      [tableNumber.trim(), hotelId]
    );
    if (result.rows.length === 0) {
      return { valid: false, message: "Table not found for this hotel." };
    }
    if (!result.rows[0].is_active) {
      return { valid: false, message: "This table is currently inactive." };
    }
  }
  return { valid: true };
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

    // ---------------- HOTEL RESOLVING & TABLE AVAILABILITY CHECK ----------------
    
    const hotelSlug = req.body.hotel_slug;
    if (!hotelSlug) {
      return res.status(400).json({ success: false, message: "hotel_slug is required." });
    }
    const hotelResult = await db.query("SELECT hotel_id, is_open, latitude, longitude, order_radius, location_ordering_enabled FROM public.hotels WHERE slug = $1", [hotelSlug]);
    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }
    const { hotel_id: hotelId, is_open: isOpen, latitude: hotelLat, longitude: hotelLng, order_radius: orderRadius, location_ordering_enabled: locationOrderingEnabled } = hotelResult.rows[0];

    if (isOpen === false) {
      return res.status(400).json({
        success: false,
        message: "This hotel is currently closed and not accepting new orders."
      });
    }

    // ── Server-side proximity check ───────────────────────────────────────
    if (locationOrderingEnabled !== false && hotelLat !== null && hotelLng !== null) {
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

    const tableValidation = await validateTableForHotel(table_number, hotelId);
    if (!tableValidation.valid) {
      return res.status(400).json({ success: false, message: tableValidation.message });
    }

    // ---------------- PAYMENT SIGNATURE VERIFY ----------------

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment details missing"
      });
    }

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

    // ---------------- CALCULATE TOTAL ----------------

    let totalAmount = 0;
    const itemIds = items.map(i => i.item_id);
    const dbItemsResult = await db.query(
      "SELECT item_id, price FROM public.menu_items WHERE item_id = ANY($1) AND hotel_id = $2",
      [itemIds, hotelId]
    );
    const dbItemsMap = new Map(dbItemsResult.rows.map(r => [r.item_id, parseFloat(r.price)]));

    const variantIds = items.filter(i => i.selectedVariant?.id).map(i => i.selectedVariant.id);
    let dbVariantsMap = new Map();
    if (variantIds.length > 0) {
      const dbVariantsResult = await db.query(
        "SELECT id, menu_item_id, variant_name, price FROM public.menu_item_variants WHERE id = ANY($1)",
        [variantIds]
      );
      dbVariantsMap = new Map(dbVariantsResult.rows.map(r => [r.id, { price: parseFloat(r.price), variant_name: r.variant_name, menu_item_id: r.menu_item_id }]));
    }

    for (const item of items) {
      if (!item.item_id || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: "Invalid item data"
        });
      }
      let itemPrice = 0;
      if (item.selectedVariant?.id) {
        const verifiedVariant = dbVariantsMap.get(item.selectedVariant.id);
        if (!verifiedVariant || verifiedVariant.menu_item_id !== item.item_id) {
          return res.status(400).json({
            success: false,
            message: "Selected portion variant not found or mismatch."
          });
        }
        itemPrice = verifiedVariant.price;
        item.variantName = verifiedVariant.variant_name;
      } else {
        const verifiedPrice = dbItemsMap.get(item.item_id);
        if (verifiedPrice === undefined) {
          return res.status(400).json({
            success: false,
            message: "Item not found or not available at this hotel."
          });
        }
        itemPrice = verifiedPrice;
        item.variantName = null;
      }
      item.price = itemPrice;
      totalAmount += itemPrice * item.quantity;
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
          `INSERT INTO order_items (order_id, item_id, quantity, price, variant_id, variant_name)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            order.order_id,
            item.item_id,
            item.quantity,
            item.price,
            item.selectedVariant?.id || null,
            item.variantName || null
          ]
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
    const hotelSlug = req.query.hotel_slug;
    if (!hotelSlug) {
      return res.status(400).json({ success: false, message: "hotel_slug is required." });
    }
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

    // Get tables from restaurant_tables or fallback to hotel's table_count
    const tablesResult = await db.query(
      'SELECT table_number, table_name, is_active FROM public.restaurant_tables WHERE hotel_id = $1 ORDER BY table_number ASC',
      [hotelId]
    );
    let allTables;
    let tableNamesMap = {};
    if (tablesResult.rows.length > 0) {
      allTables = tablesResult.rows.map(t => t.table_number);
      tablesResult.rows.forEach(t => { tableNamesMap[t.table_number] = t.table_name; });
    } else {
      // Fallback to legacy table_count
      const hotelData = await db.query(
        'SELECT table_count FROM public.hotels WHERE hotel_id = $1',
        [hotelId]
      );
      const tableCount = hotelData.rows.length > 0 ? (hotelData.rows[0].table_count || 5) : 5;
      allTables = Array.from({ length: tableCount }, (_, i) => `T-${i + 1}`);
    }

    const occupiedTables = result.rows.map(row => row.table_number);
    const availableTables = allTables.filter(table => !occupiedTables.includes(table));
    
    return res.json({
      success: true,
      occupied: occupiedTables,
      available: availableTables,
      tableNames: tableNamesMap,
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
    const { items, table_number, customerLat, customerLng, customer_name } = req.body;
    const customerId = req.customer.customerId;
    const customerName = (customer_name || req.customer.name || "").trim();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty. Please add items to cart." });
    }

    if (!table_number || !table_number.trim()) {
      return res.status(400).json({ success: false, message: "Table number is required." });
    }

    const hotelSlug = req.body.hotel_slug;
    if (!hotelSlug) {
      return res.status(400).json({ success: false, message: "hotel_slug is required." });
    }
    const hotelResult = await db.query(
      "SELECT hotel_id, is_open, latitude, longitude, order_radius, location_ordering_enabled, merchant_name, upi_id, payment_qr_url, payment_instructions FROM public.hotels WHERE slug = $1",
      [hotelSlug]
    );
    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }
    const { hotel_id: hotelId, is_open: isOpen, latitude: hotelLat, longitude: hotelLng, order_radius: orderRadius, location_ordering_enabled: locationOrderingEnabled, merchant_name: merchantName, upi_id: upiId, payment_qr_url: qrUrl, payment_instructions: paymentInstructions } = hotelResult.rows[0];

    const tableValidation = await validateTableForHotel(table_number, hotelId);
    if (!tableValidation.valid) {
      return res.status(400).json({ success: false, message: tableValidation.message });
    }

    if (isOpen === false) {
      return res.status(400).json({
        success: false,
        message: "This hotel is currently closed and not accepting new orders."
      });
    }

    // ── Server-side proximity check ───────────────────────────────────────
    if (locationOrderingEnabled !== false && hotelLat !== null && hotelLng !== null) {
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

    let totalAmount = 0;
    const itemIds = items.map(i => i.item_id);
    const dbItemsResult = await db.query(
      "SELECT item_id, price FROM public.menu_items WHERE item_id = ANY($1) AND hotel_id = $2",
      [itemIds, hotelId]
    );
    const dbItemsMap = new Map(dbItemsResult.rows.map(r => [r.item_id, parseFloat(r.price)]));

    const variantIds = items.filter(i => i.selectedVariant?.id).map(i => i.selectedVariant.id);
    let dbVariantsMap = new Map();
    if (variantIds.length > 0) {
      const dbVariantsResult = await db.query(
        "SELECT id, menu_item_id, variant_name, price FROM public.menu_item_variants WHERE id = ANY($1)",
        [variantIds]
      );
      dbVariantsMap = new Map(dbVariantsResult.rows.map(r => [r.id, { price: parseFloat(r.price), variant_name: r.variant_name, menu_item_id: r.menu_item_id }]));
    }

    for (const item of items) {
      if (!item.item_id || !item.quantity) {
        return res.status(400).json({ success: false, message: "Invalid item data." });
      }
      let itemPrice = 0;
      if (item.selectedVariant?.id) {
        const verifiedVariant = dbVariantsMap.get(item.selectedVariant.id);
        if (!verifiedVariant || verifiedVariant.menu_item_id !== item.item_id) {
          return res.status(400).json({
            success: false,
            message: "Selected portion variant not found or mismatch."
          });
        }
        itemPrice = verifiedVariant.price;
        item.variantName = verifiedVariant.variant_name;
      } else {
        const verifiedPrice = dbItemsMap.get(item.item_id);
        if (verifiedPrice === undefined) {
          return res.status(400).json({
            success: false,
            message: "Item not found or not available at this hotel."
          });
        }
        itemPrice = verifiedPrice;
        item.variantName = null;
      }
      item.price = itemPrice;
      totalAmount += itemPrice * parseInt(item.quantity);
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const orderResult = await client.query(
        `INSERT INTO orders (customer_id, table_number, total_amount, status, hotel_id, customer_name) 
         VALUES ($1, $2, $3, 'pending', $4, $5) 
         RETURNING order_id, customer_id, table_number, total_amount, status, created_at`,
        [customerId, table_number.trim(), totalAmount, hotelId, customerName || null]
      );

      const order = orderResult.rows[0];

      const orderDisplayId = `HB${order.order_id}`;
      await client.query(
        `UPDATE orders SET order_display_id = $1 WHERE order_id = $2`,
        [orderDisplayId, order.order_id]
      );

      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, item_id, quantity, price, variant_id, variant_name)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            order.order_id,
            item.item_id,
            item.quantity,
            item.price,
            item.selectedVariant?.id || null,
            item.variantName || null
          ]
        );
      }

      const paymentRefName = (customerName || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const paymentReference = `T${table_number.trim()}-${orderDisplayId}-${paymentRefName || "GUEST"}`;

      await client.query(
        `INSERT INTO payments (order_id, amount, payment_status, payment_method, payment_reference) 
         VALUES ($1, $2, 'pending', 'cash', $3)`,
        [order.order_id, totalAmount, paymentReference]
      );

      await client.query("COMMIT");

      return res.json({
        success: true,
        message: "Order placed successfully!",
        order: {
          order_id: order.order_id,
          order_display_id: orderDisplayId,
          customer_name: customerName,
          table_number: order.table_number,
          total_amount: parseFloat(order.total_amount),
          status: order.status,
          created_at: order.created_at,
        },
        payment_reference: paymentReference,
        qrInfo: qrUrl ? { qrUrl, merchantName, upiId, paymentInstructions } : undefined,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
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

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      await client.query("DELETE FROM order_items WHERE order_id = $1", [id]);
      await client.query("DELETE FROM payments WHERE order_id = $1", [id]);
      await client.query("DELETE FROM orders WHERE order_id = $1", [id]);

      await client.query("COMMIT");

      return res.json({ success: true, message: "Order cancelled successfully" });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
      logger.error("Cancel order error:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel order" });
  }
});

// ─── QR Payment: Create order ───────────────────────────────────────
router.post("/create-qr-order", requireAuth, async (req, res) => {
  try {
    const { items, table_number, customerLat, customerLng, customer_name } = req.body;
    const customerId = req.customer.customerId;
    const customerName = (customer_name || req.customer.name || "").trim();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty." });
    }
    if (!table_number || !table_number.trim()) {
      return res.status(400).json({ success: false, message: "Table number is required." });
    }

    const hotelSlug = req.body.hotel_slug;
    if (!hotelSlug) {
      return res.status(400).json({ success: false, message: "hotel_slug is required." });
    }
    const hotelResult = await db.query(
      `SELECT hotel_id, is_open, latitude, longitude, order_radius, location_ordering_enabled,
              merchant_name, upi_id, payment_qr_url, payment_instructions
       FROM public.hotels WHERE slug = $1`,
      [hotelSlug]
    );
    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    const { hotel_id: hotelId, is_open: isOpen, latitude: hotelLat, longitude: hotelLng, order_radius: orderRadius, location_ordering_enabled: locationOrderingEnabled, merchant_name: merchantName, upi_id: upiId, payment_qr_url: qrUrl, payment_instructions: paymentInstructions } = hotelResult.rows[0];
    if (!qrUrl) {
      return res.status(400).json({ success: false, message: "Hotel has not configured QR payment." });
    }

    const tableValidation = await validateTableForHotel(table_number, hotelId);
    if (!tableValidation.valid) {
      return res.status(400).json({ success: false, message: tableValidation.message });
    }

    if (isOpen === false) {
      return res.status(400).json({ success: false, message: "Hotel is currently closed." });
    }

    if (locationOrderingEnabled !== false && hotelLat !== null && hotelLng !== null) {
      const cLat = parseFloat(customerLat);
      const cLng = parseFloat(customerLng);
      if (isNaN(cLat) || isNaN(cLng)) {
        return res.status(400).json({ success: false, message: "Location is required." });
      }
      const dist = haversineDistance(cLat, cLng, parseFloat(hotelLat), parseFloat(hotelLng));
      const radius = orderRadius || 30;
      if (dist > radius) {
        return res.status(403).json({ success: false, locationError: true, message: `You must be within ${radius}m.` });
      }
    }

    if (req.customer.hotelId !== hotelId) {
      return res.status(403).json({ success: false, message: "Not registered with this hotel." });
    }

    let totalAmount = 0;
    const itemIds = items.map(i => i.item_id);
    const dbItemsResult = await db.query(
      "SELECT item_id, price FROM public.menu_items WHERE item_id = ANY($1) AND hotel_id = $2",
      [itemIds, hotelId]
    );
    const dbItemsMap = new Map(dbItemsResult.rows.map(r => [r.item_id, parseFloat(r.price)]));

    const variantIds = items.filter(i => i.selectedVariant?.id).map(i => i.selectedVariant.id);
    let dbVariantsMap = new Map();
    if (variantIds.length > 0) {
      const dbVariantsResult = await db.query(
        "SELECT id, menu_item_id, variant_name, price FROM public.menu_item_variants WHERE id = ANY($1)",
        [variantIds]
      );
      dbVariantsMap = new Map(dbVariantsResult.rows.map(r => [r.id, { price: parseFloat(r.price), variant_name: r.variant_name, menu_item_id: r.menu_item_id }]));
    }

    for (const item of items) {
      if (!item.item_id || !item.quantity) {
        return res.status(400).json({ success: false, message: "Invalid item data." });
      }
      let itemPrice = 0;
      if (item.selectedVariant?.id) {
        const verifiedVariant = dbVariantsMap.get(item.selectedVariant.id);
        if (!verifiedVariant || verifiedVariant.menu_item_id !== item.item_id) {
          return res.status(400).json({ success: false, message: "Portion variant mismatch." });
        }
        itemPrice = verifiedVariant.price;
        item.variantName = verifiedVariant.variant_name;
      } else {
        const verifiedPrice = dbItemsMap.get(item.item_id);
        if (verifiedPrice === undefined) {
          return res.status(400).json({ success: false, message: "Item not found." });
        }
        itemPrice = verifiedPrice;
        item.variantName = null;
      }
      item.price = itemPrice;
      totalAmount += itemPrice * parseInt(item.quantity);
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const orderResult = await client.query(
        `INSERT INTO orders (customer_id, table_number, total_amount, status, hotel_id, customer_name)
         VALUES ($1, $2, $3, 'pending', $4, $5) RETURNING order_id, customer_id, table_number, total_amount, status, created_at`,
        [customerId, table_number.trim(), totalAmount, hotelId, customerName || null]
      );
      const order = orderResult.rows[0];

      const orderDisplayId = `HB${order.order_id}`;
      await client.query(
        `UPDATE orders SET order_display_id = $1 WHERE order_id = $2`,
        [orderDisplayId, order.order_id]
      );

      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, item_id, quantity, price, variant_id, variant_name) VALUES ($1, $2, $3, $4, $5, $6)`,
          [order.order_id, item.item_id, item.quantity, item.price, item.selectedVariant?.id || null, item.variantName || null]
        );
      }

      const paymentRefName = (customerName || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const paymentReference = `T${table_number.trim()}-${orderDisplayId}-${paymentRefName || "GUEST"}`;

      await client.query(
        `INSERT INTO payments (order_id, amount, payment_status, payment_method, payment_reference) VALUES ($1, $2, 'pending', 'qr', $3)`,
        [order.order_id, totalAmount, paymentReference]
      );

      await client.query("COMMIT");

      const upiDeepLink = upiId ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName || "")}&am=${totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(paymentReference)}` : "";

      return res.json({
        success: true,
        order: {
          ...order,
          order_display_id: orderDisplayId,
          customer_name: customerName,
        },
        payment_reference: paymentReference,
        upi_deep_link: upiDeepLink,
        qrInfo: {
          qrUrl,
          merchantName: merchantName || "",
          upiId: upiId || "",
          paymentInstructions: paymentInstructions || ""
        }
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("Create QR order error:", error);
    return res.status(500).json({ success: false, message: "Failed to create order." });
  }
});

// ─── QR Payment: Customer confirms payment submitted ────────────────
router.post("/qr-payment-submitted", requireAuth, async (req, res) => {
  try {
    const { order_id } = req.body;
    const customerId = req.customer.customerId;

    if (!order_id) {
      return res.status(400).json({ success: false, message: "Order ID is required." });
    }

    const orderCheck = await db.query(
      `SELECT o.order_id, o.customer_id, o.hotel_id, o.status, p.payment_status, p.payment_method
       FROM public.orders o
       LEFT JOIN public.payments p ON p.order_id = o.order_id
       WHERE o.order_id = $1`,
      [order_id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const order = orderCheck.rows[0];
    if (order.customer_id !== customerId) {
      return res.status(403).json({ success: false, message: "This order does not belong to you." });
    }
    if (order.hotel_id !== req.customer.hotelId) {
      return res.status(403).json({ success: false, message: "This order belongs to a different hotel." });
    }
    if (order.payment_method !== 'qr') {
      return res.status(400).json({ success: false, message: "This order is not a QR payment order." });
    }
    if (order.payment_status !== 'pending') {
      return res.status(400).json({ success: false, message: "Payment already submitted." });
    }

    await db.query(
      "UPDATE public.payments SET payment_status = 'submitted' WHERE order_id = $1",
      [order_id]
    );

    return res.json({ success: true, message: "Payment submitted for verification." });
  } catch (error) {
    logger.error("QR payment submitted error:", error);
    return res.status(500).json({ success: false, message: "Failed to submit payment." });
  }
});

module.exports = router;
