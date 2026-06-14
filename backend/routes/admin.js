const express = require("express");
const logger = require("../utils/logger");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("./database");
const { requireAdmin } = require("./auth");
const bunnyCDN = require("./bunnyCDN");
const crypto = require("crypto");
const xss = require("xss");

// ─── Helper: resolve hotel_slug → hotel_id for super_admin scoped queries ───────
// Usage: const hotelId = await resolveHotelSlug(req) || req.admin.hotelId
const resolveHotelSlug = async (req) => {
  if (req.admin.role !== 'super_admin') return req.admin.hotelId;
  const slug = req.query.hotel_slug || req.body?.hotel_slug;
  if (!slug) return null; // super_admin with no filter = all hotels
  const result = await db.query('SELECT hotel_id FROM public.hotels WHERE slug = $1', [slug]);
  if (result.rows.length === 0) return -1; // sentinel: slug not found
  return result.rows[0].hotel_id;
};

const bcrypt = require("bcrypt");
const SALT_ROUNDS = 12;

const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const allowedMimetypes = /image\/(jpeg|jpg|png|webp)/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only static image files are allowed (jpeg, jpg, png, webp)"));
    }
  },
});

// Get all categories
router.get("/categories", requireAdmin, async (req, res) => {
  try {
    let result;
    if (req.admin.role !== 'super_admin') {
      result = await db.query("SELECT category_id, category_name FROM menu_category WHERE hotel_id = $1 ORDER BY category_name", [req.admin.hotelId]);
    } else {
      const hotelId = await resolveHotelSlug(req);
      if (hotelId === -1) return res.status(404).json({ success: false, message: 'Hotel slug not found.' });
      if (hotelId) {
        result = await db.query("SELECT category_id, category_name FROM menu_category WHERE hotel_id = $1 ORDER BY category_name", [hotelId]);
      } else {
        result = await db.query("SELECT category_id, category_name FROM menu_category ORDER BY category_name");
      }
    }
    return res.json({ success: true, categories: result.rows });
  }
  catch (error) {
    logger.error("Get categories error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch categories" });
  }
});

// Create category
router.post("/categories", requireAdmin, async (req, res) => {
  try {
    const rawName = req.body.category_name?.trim();
    if (!rawName)
      return res.status(400).json({ success: false, message: "Category name is required" });

    const name = xss(rawName);

    let hotelId;
    if (req.admin.role === 'super_admin') {
      hotelId = await resolveHotelSlug(req);
      if (hotelId === -1) return res.status(404).json({ success: false, message: 'Hotel slug not found.' });
    } else {
      hotelId = req.admin.hotelId;
    }
    if (!hotelId) {
      return res.status(400).json({ success: false, message: "Hotel slug is required" });
    }

    const { rows } = await db.query(
      "INSERT INTO menu_category (category_name, hotel_id) VALUES ($1, $2) RETURNING category_id, category_name",
      [name, hotelId]
    );

    res.json({ success: true, category: rows[0] });

  } catch (error) {
    if (error.code === "23505")
      return res.status(409).json({ success: false, message: "Category already exists" });

    logger.error("Create category error:", error);
    res.status(500).json({ success: false, message: "Failed to create category" });
  }
});


// Update category
router.put("/categories/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const sanitizedName = xss(category_name.trim());
    let result;
    if (req.admin.role === 'super_admin') {
      result = await db.query(
        "UPDATE menu_category SET category_name = $1 WHERE category_id = $2 RETURNING category_id, category_name",
        [sanitizedName, id]
      );
    } else {
      result = await db.query(
        "UPDATE menu_category SET category_name = $1 WHERE category_id = $2 AND hotel_id = $3 RETURNING category_id, category_name",
        [sanitizedName, id, req.admin.hotelId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Category not found or unauthorized" });
    }

    return res.json({ success: true, category: result.rows[0] });
  } catch (error) {
    logger.error("Update category error:", error);
    return res.status(500).json({ success: false, message: "Failed to update category" });
  }
});

// Delete category
router.delete("/categories/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    let result;
    if (req.admin.role === 'super_admin') {
      result = await db.query("DELETE FROM menu_category WHERE category_id = $1 RETURNING category_id", [id]);
    } else {
      result = await db.query("DELETE FROM menu_category WHERE category_id = $1 AND hotel_id = $2 RETURNING category_id", [id, req.admin.hotelId]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Category not found or unauthorized" });
    }

    return res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    logger.error("Delete category error:", error);
    if (error.code === '23503') {
      return res.status(409).json({ success: false, message: "Cannot delete category with existing items" });
    }
    return res.status(500).json({ success: false, message: "Failed to delete category" });
  }
});

// Get all menu items
router.get("/items", requireAdmin, async (req, res) => {
  try {
    let query = `
      SELECT 
        mi.item_id,
        mi.item_name,
        mi.category_id,
        mc.category_name,
        mi.price,
        mi.image_url,
        mi.description,
        mi.is_available,
        mi.is_veg
      FROM menu_items mi
      LEFT JOIN menu_category mc ON mi.category_id = mc.category_id
    `;
    let params = [];
    if (req.admin.role !== 'super_admin') {
      query += " WHERE mi.hotel_id = $1";
      params.push(req.admin.hotelId);
    } else {
      const hotelId = await resolveHotelSlug(req);
      if (hotelId === -1) return res.status(404).json({ success: false, message: 'Hotel slug not found.' });
      if (hotelId) {
        query += " WHERE mi.hotel_id = $1";
        params.push(hotelId);
      }
    }
    query += " ORDER BY mc.category_name, mi.item_name";
    const result = await db.query(query, params);
    const items = result.rows;
    if (items.length > 0) {
      const itemIds = items.map(it => it.item_id);
      const variantsResult = await db.query(
        "SELECT id, menu_item_id, variant_name, price FROM public.menu_item_variants WHERE menu_item_id = ANY($1) ORDER BY id",
        [itemIds]
      );
      const variantsMap = {};
      variantsResult.rows.forEach(v => {
        if (!variantsMap[v.menu_item_id]) {
          variantsMap[v.menu_item_id] = [];
        }
        variantsMap[v.menu_item_id].push({
          id: v.id,
          variant_name: v.variant_name,
          price: parseFloat(v.price)
        });
      });
      items.forEach(it => {
        it.variants = variantsMap[it.item_id] || [];
      });
    }
    return res.json({ success: true, items });
  } catch (error) {
    logger.error("Get items error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch items" });
  }
});

// Create menu item with image
router.post("/items", requireAdmin, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: "Image file is too large. Maximum size is 10MB." });
      }
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { item_name, category_id, price, description, is_available, is_veg, variants } = req.body;
    let parsedVariants = null;
    if (variants) {
      try {
        parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
      } catch (e) {
        logger.error("Error parsing variants:", e);
      }
    }
    let image_url = null;

    if (!item_name || !category_id || !price) {
      return res.status(400).json({ success: false, message: "Item name, category, and price are required" });
    }

    const safeItemName = xss(item_name.trim());
    const safeDescription = description ? xss(description.trim()) : null;

    // Upload image to Bunny CDN (or fall back to local storage if credentials are missing)
    if (req.file) {
      const isBunnyConfigured = process.env.BUNNY_ACCESS_KEY &&
        !process.env.BUNNY_ACCESS_KEY.startsWith("your_");

      if (isBunnyConfigured) {
        const uploadResult = await bunnyCDN.uploadImage(
          req.file.buffer,
          req.file.originalname,
          "menu-items"
        );
        if (uploadResult.success) {
          image_url = uploadResult.url;
        } else {
          return res.status(500).json({ success: false, message: "Failed to upload image to Bunny CDN" });
        }
      } else {
        try {
          const uploadsDir = path.join(__dirname, "../public/uploads/menu-items");
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const fileName = `${Date.now()}_${req.file.originalname}`;
          const filePath = path.join(uploadsDir, fileName);
          fs.writeFileSync(filePath, req.file.buffer);
          image_url = `/uploads/menu-items/${fileName}`;
        } catch (localError) {
          logger.error("Local upload fallback error:", localError);
          return res.status(500).json({ success: false, message: "Failed to save image locally" });
        }
      }
    }

    // Convert is_available to boolean properly
    let isAvailableBool;
    if (is_available === undefined || is_available === null) {
      isAvailableBool = true; // Default to available
    } else if (typeof is_available === 'string') {
      isAvailableBool = is_available.toLowerCase() === 'true';
    } else {
      isAvailableBool = Boolean(is_available);
    }

    // Convert is_veg to boolean properly
    let isVegBool;
    if (is_veg === undefined || is_veg === null) {
      isVegBool = true; // Default to veg
    } else if (typeof is_veg === 'string') {
      isVegBool = is_veg.toLowerCase() === 'true';
    } else {
      isVegBool = Boolean(is_veg);
    }

    let hotelId;
    if (req.admin.role === 'super_admin') {
      hotelId = await resolveHotelSlug(req);
      if (hotelId === -1) return res.status(404).json({ success: false, message: 'Hotel slug not found.' });
    } else {
      hotelId = req.admin.hotelId;
    }
    if (!hotelId) {
      return res.status(400).json({ success: false, message: "Hotel slug is required" });
    }

    // Enforce hotel_type restriction on menu items
    const hotelTypeCheck = await db.query('SELECT hotel_type FROM public.hotels WHERE hotel_id = $1', [hotelId]);
    if (hotelTypeCheck.rows.length > 0) {
      const ht = hotelTypeCheck.rows[0].hotel_type;
      if (ht === 'veg' && !isVegBool) {
        return res.status(400).json({ success: false, message: 'This is a Veg Only hotel. Only vegetarian items can be added.' });
      }
      if (ht === 'nonveg' && isVegBool) {
        return res.status(400).json({ success: false, message: 'This is a Non-Veg Only hotel. Only non-vegetarian items can be added.' });
      }
    }

    const result = await db.query(
      `INSERT INTO menu_items (item_name, category_id, price, image_url, description, is_available, is_veg, hotel_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING item_id, item_name, category_id, price, image_url, description, is_available, is_veg`,
      [safeItemName, category_id, parseFloat(price), image_url, safeDescription, isAvailableBool, isVegBool, hotelId]
    );

    const newItem = result.rows[0];

    if (parsedVariants && parsedVariants.length > 0) {
      for (const v of parsedVariants) {
        await db.query(
          "INSERT INTO public.menu_item_variants (menu_item_id, variant_name, price) VALUES ($1, $2, $3)",
          [newItem.item_id, v.variant_name.trim(), parseFloat(v.price)]
        );
      }
      newItem.variants = parsedVariants;
    }

    return res.json({ success: true, item: newItem });
  } catch (error) {
    logger.error("Create item error:", error);
    return res.status(500).json({ success: false, message: "Failed to create item" });
  }
});

// Update menu item with image
router.put("/items/:id", requireAdmin, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: "Image file is too large. Maximum size is 10MB." });
      }
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, category_id, price, description, is_available, is_veg, existing_image_url, variants } = req.body;
    let parsedVariants = null;
    if (variants) {
      try {
        parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
      } catch (e) {
        logger.error("Error parsing variants:", e);
      }
    }

    if (!item_name || !category_id || !price) {
      return res.status(400).json({ success: false, message: "Item name, category, and price are required" });
    }

    const safeItemName = xss(item_name.trim());
    const safeDescription = description ? xss(description.trim()) : null;

    // Tenant authorization check
    if (req.admin.role !== 'super_admin') {
      const itemCheck = await db.query("SELECT hotel_id FROM menu_items WHERE item_id = $1", [id]);
      if (itemCheck.rows.length === 0 || itemCheck.rows[0].hotel_id !== req.admin.hotelId) {
        return res.status(403).json({ success: false, message: "Unauthorized: Menu item belongs to another hotel." });
      }

      const catCheck = await db.query("SELECT hotel_id FROM menu_category WHERE category_id = $1", [category_id]);
      if (catCheck.rows.length === 0 || catCheck.rows[0].hotel_id !== req.admin.hotelId) {
        return res.status(403).json({ success: false, message: "Unauthorized: Target category belongs to another hotel." });
      }
    }

    let image_url = existing_image_url || null;

    // Upload new image (with Bunny CDN detection and local fallback)
    if (req.file) {
      const isBunnyConfigured = process.env.BUNNY_ACCESS_KEY &&
        !process.env.BUNNY_ACCESS_KEY.startsWith("your_");

      if (isBunnyConfigured) {
        // Delete old image from Bunny CDN if exists
        if (existing_image_url && existing_image_url.includes(bunnyCDN.cdnUrl)) {
          await bunnyCDN.deleteImage(existing_image_url);
        }

        const safeOriginalName = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const uploadResult = await bunnyCDN.uploadImage(
          req.file.buffer,
          safeOriginalName,
          "menu-items"
        );
        if (uploadResult.success) {
          image_url = uploadResult.url;
        } else {
          return res.status(500).json({ success: false, message: "Failed to upload image to Bunny CDN" });
        }
      } else {
        // Delete old local image if exists
        if (existing_image_url && !existing_image_url.startsWith("http")) {
          const oldPath = path.join(__dirname, "../public", existing_image_url);
          if (fs.existsSync(oldPath)) {
            try {
              fs.unlinkSync(oldPath);
            } catch (deleteError) {
              logger.error("Local delete error:", deleteError);
            }
          }
        }

        // Fallback to local upload
        try {
          const uploadsDir = path.join(__dirname, "../public/uploads/menu-items");
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const safeOriginalName = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, "_");
          const fileName = `${Date.now()}_${safeOriginalName}`;
          const filePath = path.join(uploadsDir, fileName);
          fs.writeFileSync(filePath, req.file.buffer);
          image_url = `/uploads/menu-items/${fileName}`;
        } catch (localError) {
          logger.error("Local upload fallback error:", localError);
          return res.status(500).json({ success: false, message: "Failed to save image locally" });
        }
      }
    }

    // Convert is_available to boolean properly
    let isAvailableBool;
    if (is_available === undefined || is_available === null) {
      isAvailableBool = true; // Default to available
    } else if (typeof is_available === 'string') {
      isAvailableBool = is_available.toLowerCase() === 'true';
    } else {
      isAvailableBool = Boolean(is_available);
    }

    // Convert is_veg to boolean properly
    let isVegBool;
    if (is_veg === undefined || is_veg === null) {
      isVegBool = true; // Default to veg
    } else if (typeof is_veg === 'string') {
      isVegBool = is_veg.toLowerCase() === 'true';
    } else {
      isVegBool = Boolean(is_veg);
    }

    // Enforce hotel_type restriction on menu item updates
    const itemHotelCheck = await db.query('SELECT hotel_id FROM menu_items WHERE item_id = $1', [id]);
    if (itemHotelCheck.rows.length > 0) {
      const itemHotelId = itemHotelCheck.rows[0].hotel_id;
      const hotelTypeCheckUpd = await db.query('SELECT hotel_type FROM public.hotels WHERE hotel_id = $1', [itemHotelId]);
      if (hotelTypeCheckUpd.rows.length > 0) {
        const ht = hotelTypeCheckUpd.rows[0].hotel_type;
        if (ht === 'veg' && !isVegBool) {
          return res.status(400).json({ success: false, message: 'This is a Veg Only hotel. Only vegetarian items are allowed.' });
        }
        if (ht === 'nonveg' && isVegBool) {
          return res.status(400).json({ success: false, message: 'This is a Non-Veg Only hotel. Only non-vegetarian items are allowed.' });
        }
      }
    }

    const result = await db.query(
      `UPDATE menu_items 
       SET item_name = $1, category_id = $2, price = $3, image_url = $4, description = $5, is_available = $6, is_veg = $7 
       WHERE item_id = $8 
       RETURNING item_id, item_name, category_id, price, image_url, description, is_available, is_veg`,
      [safeItemName, category_id, parseFloat(price), image_url, safeDescription, isAvailableBool, isVegBool, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const updatedItem = result.rows[0];

    // Clear old variants and insert new ones
    await db.query("DELETE FROM public.menu_item_variants WHERE menu_item_id = $1", [id]);
    if (parsedVariants && parsedVariants.length > 0) {
      for (const v of parsedVariants) {
        await db.query(
          "INSERT INTO public.menu_item_variants (menu_item_id, variant_name, price) VALUES ($1, $2, $3)",
          [id, v.variant_name.trim(), parseFloat(v.price)]
        );
      }
      updatedItem.variants = parsedVariants;
    } else {
      updatedItem.variants = [];
    }

    return res.json({ success: true, item: updatedItem });
  } catch (error) {
    logger.error("Update item error:", error);
    return res.status(500).json({ success: false, message: "Failed to update item" });
  }
});

// Delete menu item
router.delete("/items/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Tenant authorization check
    if (req.admin.role !== 'super_admin') {
      const itemCheck = await db.query("SELECT hotel_id FROM menu_items WHERE item_id = $1", [id]);
      if (itemCheck.rows.length === 0 || itemCheck.rows[0].hotel_id !== req.admin.hotelId) {
        return res.status(403).json({ success: false, message: "Unauthorized: Menu item belongs to another hotel." });
      }
    }

    // Check if item exists
    const itemResult = await db.query("SELECT item_name, image_url FROM menu_items WHERE item_id = $1", [id]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    // Check if item is referenced in any orders
    const orderCheck = await db.query(
      "SELECT COUNT(*) as count FROM order_items WHERE item_id = $1",
      [id]
    );

    if (parseInt(orderCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${itemResult.rows[0].item_name}" because it is referenced in existing orders. You can mark it as unavailable instead.`
      });
    }

    // Delete image if exists (handles both local storage and Bunny CDN)
    const imageUrl = itemResult.rows[0].image_url;
    if (imageUrl) {
      if (imageUrl.startsWith("/uploads/")) {
        try {
          const filePath = path.join(__dirname, "../public", imageUrl);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (localDeleteError) {
          logger.error("Local file delete error:", localDeleteError);
        }
      } else {
        try {
          await bunnyCDN.deleteImage(imageUrl);
        } catch (cdnError) {
          // Ignore CDN delete errors (image might already be deleted)
        }
      }
    }

    const result = await db.query("DELETE FROM menu_items WHERE item_id = $1 RETURNING item_id", [id]);

    return res.json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    logger.error("Delete item error:", error);

    // Check for foreign key constraint violation
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: "Cannot delete this item because it is referenced in existing orders. You can mark it as unavailable instead."
      });
    }

    return res.status(500).json({ success: false, message: "Failed to delete item" });
  }
});

// Get orders
router.get("/orders", requireAdmin, async (req, res) => {
  try {
    const {
      status,
      date_filter,
      view_type = 'active',
    } = req.query;

    // ── Validate pagination params to prevent NaN injection ────────────
    const rawLimit = parseInt(req.query.limit, 10);
    const rawOffset = parseInt(req.query.offset, 10);
    const limit = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
    const offset = !isNaN(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    let query = `
      SELECT 
        o.order_id,
        o.customer_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        o.table_number,
        o.total_amount,
        o.status,
        o.created_at,
        p.payment_status,
        p.payment_method,
        p.razorpay_payment_id,
        COALESCE(
          json_agg(
            json_build_object(
              'order_item_id', oi.order_item_id,
              'quantity', oi.quantity,
              'price', oi.price,
              'item_name', mi.item_name,
              'variant_name', oi.variant_name
            )
          ) FILTER (WHERE oi.order_item_id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM orders o
      INNER JOIN customers c ON o.customer_id = c.customer_id
      LEFT JOIN payments p ON o.order_id = p.order_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN menu_items mi ON oi.item_id = mi.item_id
    `;

    const conditions = [];
    const params = [];

    const hotelId = req.admin.role === 'super_admin'
      ? await resolveHotelSlug(req).then(id => { if (id === -1) throw new Error('Hotel slug not found'); return id; })
      : req.admin.hotelId;
    if (hotelId) {
      conditions.push(`o.hotel_id = $${params.length + 1}`);
      params.push(hotelId);
    }

    // ✅ Active view → hide completed orders
    if (view_type === 'active') {
      conditions.push(`o.status != 'completed'`);
    }

    // ✅ Status filter (single or multiple)
    if (status) {
      const statusList = status.split(',').map(s => s.trim());
      const placeholders = statusList.map((_, i) => `$${params.length + i + 1}`).join(',');
      conditions.push(`o.status IN (${placeholders})`);
      params.push(...statusList);
    }

    // ✅ Date filter
    if (date_filter === 'today') {
      conditions.push(`DATE(o.created_at) = CURRENT_DATE`);
    } else if (date_filter === 'old') {
      conditions.push(`DATE(o.created_at) < CURRENT_DATE`);
    }

    // ✅ WHERE clause
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // ✅ Grouping + Pagination
    query += `
      GROUP BY 
        o.order_id, c.name, c.phone,
        p.payment_status, p.payment_method, p.razorpay_payment_id
      ORDER BY o.created_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const result = await db.query(query, params);

    return res.json({
      success: true,
      orders: result.rows.map(o => ({ ...o, items: o.items || [] }))
    });

  } catch (error) {
    logger.error("Get orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders"
    });
  }
});


// Delete order
router.delete("/orders/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Tenant authorization check
    if (req.admin.role !== 'super_admin') {
      const orderCheck = await db.query("SELECT hotel_id FROM orders WHERE order_id = $1", [id]);
      if (orderCheck.rows.length === 0 || orderCheck.rows[0].hotel_id !== req.admin.hotelId) {
        return res.status(403).json({ success: false, message: "Unauthorized: Order belongs to another hotel." });
      }
    }

    // Start transaction
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      // Delete order items first (foreign key constraint)
      await client.query("DELETE FROM order_items WHERE order_id = $1", [id]);

      // Delete payment if exists
      await client.query("DELETE FROM payments WHERE order_id = $1", [id]);

      // Delete order
      const result = await client.query("DELETE FROM orders WHERE order_id = $1 RETURNING order_id", [id]);

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      await client.query("COMMIT");

      return res.json({ success: true, message: "Order deleted successfully" });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("Delete order error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete order" });
  }
});

// Update order status
router.put("/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'preparing', 'ready', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: "Valid status is required" });
    }

    // Tenant authorization check
    if (req.admin.role !== 'super_admin') {
      const orderCheck = await db.query("SELECT hotel_id FROM orders WHERE order_id = $1", [id]);
      if (orderCheck.rows.length === 0 || orderCheck.rows[0].hotel_id !== req.admin.hotelId) {
        return res.status(403).json({ success: false, message: "Unauthorized: Order belongs to another hotel." });
      }
    }

    const result = await db.query(
      "UPDATE orders SET status = $1 WHERE order_id = $2 RETURNING order_id, status",
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    return res.json({ success: true, order: result.rows[0] });
  } catch (error) {
    logger.error("Update order status error:", error);
    return res.status(500).json({ success: false, message: "Failed to update order status" });
  }
});

// Mark order as paid (cash payment)
router.put("/orders/:id/mark-paid", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Tenant authorization check
    if (req.admin.role !== 'super_admin') {
      const orderCheck = await db.query("SELECT hotel_id FROM orders WHERE order_id = $1", [id]);
      if (orderCheck.rows.length === 0 || orderCheck.rows[0].hotel_id !== req.admin.hotelId) {
        return res.status(403).json({ success: false, message: "Unauthorized: Order belongs to another hotel." });
      }
    }

    // Check if order exists
    const orderCheck = await db.query(
      "SELECT order_id, total_amount FROM orders WHERE order_id = $1",
      [id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orderCheck.rows[0];

    // Start transaction
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      // Check if payment record exists
      const paymentCheck = await client.query(
        "SELECT payment_id FROM payments WHERE order_id = $1",
        [id]
      );

      // Update ONLY payments table - NO orders table update
      if (paymentCheck.rows.length > 0) {
        await client.query(
          "UPDATE payments SET payment_status = 'completed', payment_method = 'cash' WHERE order_id = $1",
          [id]
        );
      } else {
        // Create payment record
        await client.query(
          "INSERT INTO payments (order_id, amount, payment_status, payment_method) VALUES ($1, $2, 'completed', 'cash')",
          [id, order.total_amount]
        );
      }

      await client.query("COMMIT");

      return res.json({ success: true, message: "Order marked as paid successfully" });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("Mark order as paid error:", error);
    return res.status(500).json({ success: false, message: "Failed to mark order as paid" });
  }
});

// Get dashboard stats
router.get("/dashboard/stats", requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hotelId = req.admin.role === 'super_admin'
      ? await resolveHotelSlug(req).then(id => { if (id === -1) throw new Error('Hotel slug not found'); return id; })
      : req.admin.hotelId;

    let totalOrdersQuery = "SELECT COUNT(*) as count FROM orders";
    let todayOrdersQuery = "SELECT COUNT(*) as count FROM orders WHERE created_at >= $1";
    let totalRevenueQuery = "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'completed'";
    let todayRevenueQuery = "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'completed' AND created_at >= $1";
    let pendingOrdersQuery = "SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'preparing', 'ready')";
    let totalCustomersQuery = "SELECT COUNT(DISTINCT customer_id) as count FROM orders";

    let totalOrdersParams = [];
    let todayOrdersParams = [today];
    let totalRevenueParams = [];
    let todayRevenueParams = [today];
    let pendingOrdersParams = [];
    let totalCustomersParams = [];

    if (hotelId) {
      totalOrdersQuery += " WHERE hotel_id = $1";
      totalOrdersParams.push(hotelId);

      todayOrdersQuery += " AND hotel_id = $2";
      todayOrdersParams.push(hotelId);

      totalRevenueQuery += " AND hotel_id = $1";
      totalRevenueParams.push(hotelId);

      todayRevenueQuery += " AND hotel_id = $2";
      todayRevenueParams.push(hotelId);

      pendingOrdersQuery += " AND hotel_id = $1";
      pendingOrdersParams.push(hotelId);

      totalCustomersQuery += " WHERE hotel_id = $1";
      totalCustomersParams.push(hotelId);
    }

    const [
      totalOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      pendingOrders,
      totalCustomers,
    ] = await Promise.all([
      db.query(totalOrdersQuery, totalOrdersParams),
      db.query(todayOrdersQuery, todayOrdersParams),
      db.query(totalRevenueQuery, totalRevenueParams),
      db.query(todayRevenueQuery, todayRevenueParams),
      db.query(pendingOrdersQuery, pendingOrdersParams),
      db.query(totalCustomersQuery, totalCustomersParams),
    ]);

    return res.json({
      success: true,
      stats: {
        totalOrders: parseInt(totalOrders.rows[0].count),
        todayOrders: parseInt(todayOrders.rows[0].count),
        totalRevenue: parseFloat(totalRevenue.rows[0].total),
        todayRevenue: parseFloat(todayRevenue.rows[0].total),
        pendingOrders: parseInt(pendingOrders.rows[0].count),
        totalCustomers: parseInt(totalCustomers.rows[0].count),
      },
    });
  } catch (error) {
    logger.error("Get dashboard stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

// Get customer statistics
router.get("/customer-stats", requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalCustomersQuery = "SELECT COUNT(DISTINCT customer_id) as count FROM orders";
    let todayCustomersQuery = "SELECT COUNT(DISTINCT customer_id) as count FROM orders WHERE DATE(created_at) = CURRENT_DATE";
    const totalParams = [];
    const todayParams = [];

    if (req.admin.role !== 'super_admin') {
      totalCustomersQuery += " WHERE hotel_id = $1";
      todayCustomersQuery += " AND hotel_id = $1";
      totalParams.push(req.admin.hotelId);
      todayParams.push(req.admin.hotelId);
    }

    const [totalCustomers, todayCustomers] = await Promise.all([
      db.query(totalCustomersQuery, totalParams),
      db.query(todayCustomersQuery, todayParams),
    ]);

    return res.json({
      success: true,
      stats: {
        totalCustomers: parseInt(totalCustomers.rows[0].count),
        todayCustomers: parseInt(todayCustomers.rows[0].count),
      },
    });
  } catch (error) {
    logger.error("Get customer stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch customer stats" });
  }
});

// Get all users with order stats
router.get("/users", requireAdmin, async (req, res) => {
  try {
    let query = `
      SELECT 
        c.customer_id,
        c.name,
        c.phone,
        c.dob,
        c.created_at as joined_date,
        COUNT(DISTINCT o.order_id) as total_orders,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END), 0) as total_spent,
        MAX(o.created_at) as last_order_date
      FROM customers c
      INNER JOIN orders o ON c.customer_id = o.customer_id
    `;
    const params = [];
    if (req.admin.role !== 'super_admin') {
      query += " WHERE o.hotel_id = $1";
      params.push(req.admin.hotelId);
    }
    query += `
      GROUP BY c.customer_id, c.name, c.phone, c.dob, c.created_at
      ORDER BY total_orders DESC, c.created_at DESC
    `;

    const result = await db.query(query, params);
    return res.json({ success: true, users: result.rows });
  } catch (error) {
    logger.error("Get users error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

// Get user details with orders and reviews
router.get("/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Tenant authorization check: verify user has at least one transaction with the admin's hotel
    if (req.admin.role !== 'super_admin') {
      const accessCheck = await db.query(
        "SELECT 1 FROM orders WHERE customer_id = $1 AND hotel_id = $2 LIMIT 1",
        [id, req.admin.hotelId]
      );
      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: "Unauthorized: Customer has no history with your hotel." });
      }
    }

    // Get user info
    const userResult = await db.query(
      "SELECT customer_id, name, phone, dob, created_at FROM customers WHERE customer_id = $1",
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Get user orders with items in single query
    let ordersQuery = `
      SELECT 
        o.order_id,
        o.table_number,
        o.total_amount,
        o.status,
        o.created_at,
        p.payment_status,
        p.payment_method,
        COALESCE(
          json_agg(
            json_build_object(
              'order_item_id', oi.order_item_id,
              'quantity', oi.quantity,
              'price', oi.price,
              'item_name', mi.item_name,
              'variant_name', oi.variant_name
            ) ORDER BY mi.item_name
          ) FILTER (WHERE oi.order_item_id IS NOT NULL),
          '[]'::json
        ) as items
      FROM orders o
      LEFT JOIN payments p ON o.order_id = p.order_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE o.customer_id = $1
    `;
    const ordersParams = [id];
    if (req.admin.role !== 'super_admin') {
      ordersQuery += " AND o.hotel_id = $2";
      ordersParams.push(req.admin.hotelId);
    }
    ordersQuery += `
      GROUP BY o.order_id, o.table_number, o.total_amount, o.status, o.created_at, 
               p.payment_status, p.payment_method
      ORDER BY o.created_at DESC
    `;
    const ordersResult = await db.query(ordersQuery, ordersParams);

    const ordersWithItems = ordersResult.rows;

    // Get user reviews (both order and item reviews)
    let reviewsQuery = `
      SELECT 
        r.rating_id,
        r.rating_value,
        r.review_text,
        r.item_id,
        r.order_id,
        r.created_at,
        mi.item_name,
        mi.image_url as item_image
      FROM ratings r
      LEFT JOIN menu_items mi ON r.item_id = mi.item_id
      LEFT JOIN orders o ON r.order_id = o.order_id
      WHERE r.customer_id = $1
    `;
    const reviewsParams = [id];
    if (req.admin.role !== 'super_admin') {
      reviewsQuery += " AND (mi.hotel_id = $2 OR o.hotel_id = $2)";
      reviewsParams.push(req.admin.hotelId);
    }
    reviewsQuery += " ORDER BY r.created_at DESC";
    const reviewsResult = await db.query(reviewsQuery, reviewsParams);

    return res.json({
      success: true,
      user: userResult.rows[0],
      orders: ordersWithItems,
      reviews: reviewsResult.rows,
    });
  } catch (error) {
    logger.error("Get user details error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch user details" });
  }
});

// Get notifications
router.get("/notifications", requireAdmin, async (req, res) => {
  try {
    const notifications = [];
    let hotelFilter = "";
    const params = [];

    if (req.admin.role !== 'super_admin') {
      hotelFilter = "AND hotel_id = $1";
      params.push(req.admin.hotelId);
    }

    // Recent pending orders
    const pendingOrders = await db.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE status IN ('pending', 'preparing', 'ready') 
       AND created_at > NOW() - INTERVAL '24 hours' ${hotelFilter}`,
      params
    );

    if (parseInt(pendingOrders.rows[0].count) > 0) {
      notifications.push({
        type: "order",
        message: `${pendingOrders.rows[0].count} pending order(s) need attention`,
        priority: "high",
        timestamp: null,
      });
    }

    // Today's new orders
    const todayOrders = await db.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE created_at::date = CURRENT_DATE ${hotelFilter}`,
      params
    );

    if (parseInt(todayOrders.rows[0].count) > 0) {
      notifications.push({
        type: "info",
        message: `${todayOrders.rows[0].count} new order(s) today`,
        priority: "medium",
        timestamp: null,
      });
    }

    // New customers today (customers who ordered today from this hotel)
    let newCustomersQuery = `
      SELECT COUNT(DISTINCT customer_id) as count FROM orders 
      WHERE created_at::date = CURRENT_DATE
    `;
    if (req.admin.role !== 'super_admin') {
      newCustomersQuery += " AND hotel_id = $1";
    }
    const newCustomers = await db.query(newCustomersQuery, params);

    if (parseInt(newCustomers.rows[0].count) > 0) {
      notifications.push({
        type: "user",
        message: `${newCustomers.rows[0].count} new customer(s) registered today`,
        priority: "low",
        timestamp: null,
      });
    }

    return res.json({ success: true, notifications });
  } catch (error) {
    logger.error("Get notifications error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
});

// Get all ratings
router.get("/ratings", requireAdmin, async (req, res) => {
  try {
    let query = `
      SELECT 
        r.rating_id,
        r.customer_id,
        r.order_id,
        r.rating_value,
        r.review_text,
        r.item_id,
        r.created_at,
        c.name as customer_name,
        c.phone as customer_phone,
        mi.item_name,
        mi.image_url as item_image,
        mc.category_name as item_category
      FROM ratings r
      INNER JOIN customers c ON r.customer_id = c.customer_id
      LEFT JOIN menu_items mi ON r.item_id = mi.item_id
      LEFT JOIN menu_category mc ON mi.category_id = mc.category_id
      LEFT JOIN orders o ON r.order_id = o.order_id
    `;
    const params = [];
    if (req.admin.role !== 'super_admin') {
      query += " WHERE (mi.hotel_id = $1 OR o.hotel_id = $1)";
      params.push(req.admin.hotelId);
    }
    query += " ORDER BY r.created_at DESC";

    const result = await db.query(query, params);

    // Statistics calculate karo
    let statsQuery = `
      SELECT 
        COUNT(*) as total_ratings,
        AVG(rating_value) as average_rating,
        COUNT(CASE WHEN review_text IS NOT NULL AND review_text != '' THEN 1 END) as with_review,
        COUNT(CASE WHEN DATE(r.created_at) = CURRENT_DATE THEN 1 END) as today_ratings
      FROM ratings r
      LEFT JOIN menu_items mi ON r.item_id = mi.item_id
      LEFT JOIN orders o ON r.order_id = o.order_id
    `;
    const statsParams = [];
    if (req.admin.role !== 'super_admin') {
      statsQuery += " WHERE (mi.hotel_id = $1 OR o.hotel_id = $1)";
      statsParams.push(req.admin.hotelId);
    }

    const statsResult = await db.query(statsQuery, statsParams);
    const stats = statsResult.rows[0];

    return res.json({
      success: true,
      ratings: result.rows,
      total: result.rows.length,
      stats: {
        totalRatings: parseInt(stats.total_ratings),
        averageRating: parseFloat(stats.average_rating || 0).toFixed(2),
        todayRatings: parseInt(stats.today_ratings),
        withReview: parseInt(stats.with_review)
      }
    });
  } catch (error) {
    logger.error("Get ratings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ratings"
    });
  }
});

// Get rating statistics — MUST be registered BEFORE /ratings/:id to avoid param capture
router.get("/ratings/stats", requireAdmin, async (req, res) => {
  try {
    let statsQuery = `
      SELECT 
        COUNT(*) as total_ratings,
        AVG(rating_value) as average_rating,
        COUNT(CASE WHEN rating_value = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating_value = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating_value = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating_value = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating_value = 1 THEN 1 END) as one_star,
        COUNT(CASE WHEN DATE(r.created_at) = CURRENT_DATE THEN 1 END) as today_ratings,
        COUNT(CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_ratings,
        COUNT(CASE WHEN review_text IS NOT NULL AND review_text != '' THEN 1 END) as with_review
      FROM ratings r
      LEFT JOIN menu_items mi ON r.item_id = mi.item_id
      LEFT JOIN orders o ON r.order_id = o.order_id
    `;
    const params = [];
    if (req.admin.role !== 'super_admin') {
      statsQuery += " WHERE (mi.hotel_id = $1 OR o.hotel_id = $1)";
      params.push(req.admin.hotelId);
    }

    const result = await db.query(statsQuery, params);
    const stats = result.rows[0];

    return res.json({
      success: true,
      stats: {
        totalRatings: parseInt(stats.total_ratings),
        averageRating: parseFloat(stats.average_rating || 0).toFixed(2),
        todayRatings: parseInt(stats.today_ratings),
        weekRatings: parseInt(stats.week_ratings),
        withReview: parseInt(stats.with_review),
        distribution: {
          5: parseInt(stats.five_star),
          4: parseInt(stats.four_star),
          3: parseInt(stats.three_star),
          2: parseInt(stats.two_star),
          1: parseInt(stats.one_star)
        }
      }
    });
  } catch (error) {
    logger.error("Get rating stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch rating statistics" });
  }
});

// Delete rating — registered AFTER /ratings/stats to avoid conflict
router.delete("/ratings/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Tenant authorization check
    if (req.admin.role !== 'super_admin') {
      const checkResult = await db.query(
        `SELECT r.rating_id 
         FROM ratings r
         LEFT JOIN menu_items mi ON r.item_id = mi.item_id
         LEFT JOIN orders o ON r.order_id = o.order_id
         WHERE r.rating_id = $1 AND (mi.hotel_id = $2 OR o.hotel_id = $2)`,
        [id, req.admin.hotelId]
      );
      if (checkResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: "Unauthorized: Rating belongs to another hotel." });
      }
    }

    const result = await db.query(
      "DELETE FROM ratings WHERE rating_id = $1 RETURNING rating_id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Rating not found or unauthorized" });
    }

    return res.json({ success: true, message: "Rating deleted successfully" });
  } catch (error) {
    logger.error("Delete rating error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete rating" });
  }
});

// Get all admins
router.get("/admins", requireAdmin, async (req, res) => {
  try {
    let result;
    if (req.admin.role === 'super_admin') {
      result = await db.query(
        "SELECT admin_id, name, username, email, created_at FROM admins ORDER BY created_at DESC"
      );
    } else {
      result = await db.query(
        "SELECT admin_id, name, username, email, created_at FROM admins WHERE hotel_id = $1 AND role = 'admin' ORDER BY created_at DESC",
        [req.admin.hotelId]
      );
    }
    return res.json({ success: true, admins: result.rows });
  } catch (error) {
    logger.error("Get admins error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch admins" });
  }
});

// Update admin details
router.put("/admins/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, email } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: "Username is required" });
    }

    // Tenant authorization check
    if (req.admin.role !== 'super_admin') {
      const adminCheck = await db.query("SELECT hotel_id, role FROM admins WHERE admin_id = $1", [id]);
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].hotel_id !== req.admin.hotelId || adminCheck.rows[0].role === 'super_admin') {
        return res.status(403).json({ success: false, message: "Unauthorized: Manager belongs to another hotel." });
      }
    }

    // Check if username is taken by another admin
    const existingAdmin = await db.query(
      "SELECT admin_id FROM admins WHERE username = $1 AND admin_id != $2",
      [username, id]
    );
    if (existingAdmin.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Username already exists" });
    }

    // Check if email is taken by another admin (if provided)
    if (email) {
      const existingEmail = await db.query(
        "SELECT admin_id FROM admins WHERE email = $1 AND admin_id != $2",
        [email, id]
      );
      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ success: false, message: "Email already exists" });
      }
    }

    const result = await db.query(
      "UPDATE admins SET name = $1, username = $2, email = $3 WHERE admin_id = $4 RETURNING admin_id, name, username, email",
      [name || null, username, email || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    return res.json({ success: true, admin: result.rows[0] });
  } catch (error) {
    logger.error("Update admin error:", error);
    return res.status(500).json({ success: false, message: "Failed to update admin" });
  }
});

// Delete admin
router.delete("/admins/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (parseInt(id) === req.admin.id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }

    // Tenant authorization check
    if (req.admin.role !== 'super_admin') {
      const adminCheck = await db.query("SELECT hotel_id, role FROM admins WHERE admin_id = $1", [id]);
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].hotel_id !== req.admin.hotelId || adminCheck.rows[0].role === 'super_admin') {
        return res.status(403).json({ success: false, message: "Unauthorized: Manager belongs to another hotel." });
      }
    }

    // Check if admin exists
    const adminCheck = await db.query("SELECT admin_id FROM admins WHERE admin_id = $1", [id]);
    if (adminCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    // Delete admin sessions first
    await db.query("DELETE FROM sessions WHERE admin_id = $1", [id]);

    // Delete admin
    await db.query("DELETE FROM admins WHERE admin_id = $1", [id]);

    return res.json({ success: true, message: "Admin deleted successfully" });
  } catch (error) {
    logger.error("Delete admin error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete admin" });
  }
});

// Change password
router.put("/change-password", requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: "New passwords do not match" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    // Verify current password
    const adminCheck = await db.query(
      "SELECT password FROM admins WHERE admin_id = $1",
      [req.admin.id]
    );

    if (adminCheck.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const currentHash = adminCheck.rows[0].password;
    
    let isMatch = false;
    try {
      if (currentHash && (currentHash.startsWith("$2a$") || currentHash.startsWith("$2b$") || currentHash.startsWith("$2y$"))) {
        isMatch = await bcrypt.compare(currentPassword, currentHash);
      } else {
        const sha256 = require("crypto").createHash("sha256").update(currentPassword).digest("hex");
        isMatch = (sha256 === currentHash);
      }
    } catch (err) {
      isMatch = false;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    // Update password
    const hashedNewPassword = await hashPassword(newPassword);
    await db.query(
      "UPDATE admins SET password = $1 WHERE admin_id = $2",
      [hashedNewPassword, req.admin.id]
    );

    return res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    logger.error("Change password error:", error);
    return res.status(500).json({ success: false, message: "Failed to change password" });
  }
});

// Get order acceptance status
router.get("/order-accept-status", requireAdmin, async (req, res) => {
  try {
    const hotelId = req.admin.role === 'super_admin'
      ? await resolveHotelSlug(req).then(id => { if (id === -1) throw new Error('Hotel slug not found'); return id; })
      : req.admin.hotelId;
    let query = "SELECT is_order_accept FROM admins";
    const params = [];
    if (hotelId) {
      query += " WHERE hotel_id = $1";
      params.push(hotelId);
    }
    query += " LIMIT 1";

    const result = await db.query(query, params);
    const isOrderAccept = result.rows.length > 0 ? result.rows[0].is_order_accept : true;
    return res.json({ success: true, isOrderAccept });
  } catch (error) {
    logger.error("Get order accept status error:", error);
    return res.status(500).json({ success: false, message: "Failed to get status" });
  }
});

// Toggle order acceptance
router.post("/toggle-order-accept", requireAdmin, async (req, res) => {
  try {
    const { enabled } = req.body;
    const hotelId = req.admin.role === 'super_admin'
      ? await resolveHotelSlug(req).then(id => id === -1 ? null : id)
      : req.admin.hotelId;

    let query = "UPDATE admins SET is_order_accept = $1";
    const params = [enabled];
    if (hotelId) {
      query += " WHERE hotel_id = $2";
      params.push(hotelId);
    }

    await db.query(query, params);
    return res.json({
      success: true,
      message: enabled ? "Orders enabled" : "Orders disabled",
      isOrderAccept: enabled
    });
  } catch (error) {
    logger.error("Toggle order accept error:", error);
    return res.status(500).json({ success: false, message: "Failed to toggle orders" });
  }
});

// Get hotel Open/Close status
router.get("/hotel-status", requireAdmin, async (req, res) => {
  try {
    const hotelId = req.admin.role === 'super_admin'
      ? await resolveHotelSlug(req)
      : req.admin.hotelId;

    if (hotelId === -1 || !hotelId) {
      return res.status(404).json({ success: false, message: "Hotel not resolved." });
    }

    const result = await db.query("SELECT is_open, hotel_type FROM public.hotels WHERE hotel_id = $1", [hotelId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    return res.json({
      success: true,
      isOpen: result.rows[0].is_open !== false,
      hotelType: result.rows[0].hotel_type || "both"
    });
  } catch (error) {
    logger.error("Get hotel status error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch hotel status" });
  }
});

// Toggle hotel Open/Close status
router.post("/toggle-hotel-status", requireAdmin, async (req, res) => {
  try {
    const { isOpen } = req.body;
    const hotelId = req.admin.role === 'super_admin'
      ? await resolveHotelSlug(req)
      : req.admin.hotelId;

    if (hotelId === -1 || !hotelId) {
      return res.status(404).json({ success: false, message: "Hotel not resolved." });
    }

    await db.query("UPDATE public.hotels SET is_open = $1 WHERE hotel_id = $2", [isOpen === true, hotelId]);

    return res.json({
      success: true,
      isOpen: isOpen === true,
      message: isOpen ? "Hotel is now OPEN and accepting orders." : "Hotel is now CLOSED and not accepting orders."
    });
  } catch (error) {
    logger.error("Toggle hotel status error:", error);
    return res.status(500).json({ success: false, message: "Failed to update hotel status" });
  }
});

// ─── Settings: GET /settings ───────────────────────────────────────
router.get("/settings", requireAdmin, async (req, res) => {
  try {
    const hotelId = req.admin.role === 'super_admin'
      ? await resolveHotelSlug(req)
      : req.admin.hotelId;

    if (hotelId === -1 || !hotelId) {
      return res.status(404).json({ success: false, message: "Hotel not resolved." });
    }

    // Get hotel details
    const hotelResult = await db.query(
      `SELECT hotel_id, name, slug, phone, address, email, logo_url, banner_url, description, tagline, 
              show_logo, show_banner, primary_color, secondary_color, enable_online_orders, enable_qr_ordering, 
              settings_json, is_open, table_count, hotel_type, location_ordering_enabled 
       FROM public.hotels WHERE hotel_id = $1`,
      [hotelId]
    );

    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    // Get admin details
    const adminResult = await db.query(
      `SELECT admin_id, username, name, email, phone FROM public.admins WHERE admin_id = $1`,
      [req.admin.id]
    );

    // Get recent login history from sessions
    const sessionsResult = await db.query(
      `SELECT id, ip_address, user_agent, created_at, last_activity, expires_at 
       FROM public.sessions 
       WHERE admin_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [req.admin.id]
    );

    return res.json({
      success: true,
      hotel: hotelResult.rows[0],
      admin: adminResult.rows[0] || null,
      sessions: sessionsResult.rows
    });
  } catch (error) {
    logger.error("Get admin settings error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch settings" });
  }
});

// ─── Settings: POST /settings ──────────────────────────────────────
router.post("/settings", requireAdmin, async (req, res) => {
  try {
    const hotelId = req.admin.role === 'super_admin'
      ? await resolveHotelSlug(req)
      : req.admin.hotelId;

    if (hotelId === -1 || !hotelId) {
      return res.status(404).json({ success: false, message: "Hotel not resolved." });
    }

    const {
      name, description, address, phone, email, tagline,
      show_logo, show_banner, primary_color, secondary_color,
      enable_online_orders, enable_qr_ordering, table_count, settings_json, hotel_type
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Hotel Name is required" });
    }

    // Validate hotel_type
    const validHotelTypes = ['veg', 'nonveg', 'both'];
    const safeHotelType = validHotelTypes.includes(hotel_type) ? hotel_type : 'both';

    await db.query(
      `UPDATE public.hotels 
       SET name = $1, description = $2, address = $3, phone = $4, email = $5, tagline = $6, 
           show_logo = $7, show_banner = $8, primary_color = $9, secondary_color = $10, 
           enable_online_orders = $11, enable_qr_ordering = $12, table_count = $13, settings_json = $14,
           hotel_type = $15
       WHERE hotel_id = $16`,
      [
        name.trim(), description || null, address || null, phone || null, email || null, tagline || 'Served with Love ❤️',
        show_logo !== false, show_banner !== false, primary_color || '#FF5A1F', secondary_color || '#FF5A1F',
        enable_online_orders !== false, enable_qr_ordering !== false, parseInt(table_count) || 5, settings_json || {},
        safeHotelType, hotelId
      ]
    );

    return res.json({ success: true, message: "Hotel settings updated successfully" });
  } catch (error) {
    logger.error("Save admin settings error:", error);
    return res.status(500).json({ success: false, message: "Failed to update hotel settings" });
  }
});

// ─── Settings: POST /settings/account ──────────────────────────────
router.post("/settings/account", requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, currentPassword, newPassword } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Check unique constraints for email and phone (excluding current admin)
    const emailCheck = await db.query(
      "SELECT admin_id FROM public.admins WHERE email = $1 AND admin_id <> $2",
      [email.trim().toLowerCase(), req.admin.id]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Email address is already in use by another admin" });
    }

    if (phone?.trim()) {
      const phoneCheck = await db.query(
        "SELECT admin_id FROM public.admins WHERE phone = $1 AND admin_id <> $2",
        [phone.trim(), req.admin.id]
      );
      if (phoneCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: "Phone number is already in use by another admin" });
      }
    }

    // Handle password update if newPassword is provided
    let hashedNewPassword = null;
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Current password is required to set a new password" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
      }

      // Verify current password
      const adminCheck = await db.query(
        "SELECT password FROM public.admins WHERE admin_id = $1",
        [req.admin.id]
      );

      if (adminCheck.rows.length === 0) {
        return res.status(401).json({ success: false, message: "Current password is incorrect" });
      }

      const currentHash = adminCheck.rows[0].password;
      
      let isMatch = false;
      try {
        if (currentHash && (currentHash.startsWith("$2a$") || currentHash.startsWith("$2b$") || currentHash.startsWith("$2y$"))) {
          isMatch = await bcrypt.compare(currentPassword, currentHash);
        } else {
          const sha256 = require("crypto").createHash("sha256").update(currentPassword).digest("hex");
          isMatch = (sha256 === currentHash);
        }
      } catch (err) {
        isMatch = false;
      }

      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Current password is incorrect" });
      }

      hashedNewPassword = await hashPassword(newPassword);
    }

    if (hashedNewPassword) {
      await db.query(
        `UPDATE public.admins 
         SET name = $1, email = $2, phone = $3, password = $4
         WHERE admin_id = $5`,
        [name?.trim() || null, email.trim().toLowerCase(), phone?.trim() || null, hashedNewPassword, req.admin.id]
      );
    } else {
      await db.query(
        `UPDATE public.admins 
         SET name = $1, email = $2, phone = $3
         WHERE admin_id = $4`,
        [name?.trim() || null, email.trim().toLowerCase(), phone?.trim() || null, req.admin.id]
      );
    }

    return res.json({ success: true, message: "Account settings updated successfully" });
  } catch (error) {
    logger.error("Save account settings error:", error);
    return res.status(500).json({ success: false, message: "Failed to update account settings" });
  }
});

// ─── Settings: POST /settings/logout-devices ───────────────────────
router.post("/settings/logout-devices", requireAdmin, async (req, res) => {
  try {
    const activeSessionId = req.cookies.superAdminSessionId || req.cookies.adminSessionId;
    if (!activeSessionId) {
      return res.status(400).json({ success: false, message: "No active session session ID found" });
    }

    await db.query(
      "DELETE FROM public.sessions WHERE admin_id = $1 AND session_id <> $2",
      [req.admin.id, activeSessionId]
    );

    return res.json({ success: true, message: "Logged out from all other devices successfully" });
  } catch (error) {
    logger.error("Logout from other devices error:", error);
    return res.status(500).json({ success: false, message: "Failed to logout from other devices" });
  }
});

// ─── Settings: POST /settings/upload ───────────────────────────────
router.post("/settings/upload", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    const { type } = req.body; // 'logo' or 'banner'
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: "No image file uploaded" });
    }

    if (type !== "logo" && type !== "banner") {
      return res.status(400).json({ success: false, message: "Invalid upload type. Must be 'logo' or 'banner'" });
    }

    // Image size check (logo: 2MB, banner: 5MB)
    const maxSize = type === "logo" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `${type === 'logo' ? 'Logo' : 'Banner'} file size must be less than ${type === 'logo' ? '2MB' : '5MB'}`
      });
    }

    // Verify MIME types
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Only JPEG, PNG, or WEBP image files are allowed"
      });
    }

    // Generate unique name — resolve hotel ID for super_admin
    let hotelId;
    if (req.admin.role === 'super_admin') {
      hotelId = await resolveHotelSlug(req);
      if (!hotelId || hotelId === -1) {
        return res.status(400).json({ success: false, message: "hotel_slug is required for Super Admin uploads" });
      }
    } else {
      hotelId = req.admin.hotelId;
    }
    const safeOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const fileExt = path.extname(safeOriginalName).toLowerCase() || ".png";
    const fileName = `${type}_${hotelId}_${Date.now()}${fileExt}`;

    // Upload to CDN (with local fallback when Bunny CDN is not configured)
    const isBunnyConfigured = process.env.BUNNY_ACCESS_KEY &&
      !process.env.BUNNY_ACCESS_KEY.startsWith("your_");

    let uploadedUrl;

    if (isBunnyConfigured) {
      const uploadResult = await bunnyCDN.uploadImage(file.buffer, fileName, "branding");
      if (!uploadResult.success) {
        return res.status(500).json({ success: false, message: uploadResult.error || "Failed to upload to CDN" });
      }
      uploadedUrl = uploadResult.url;
    } else {
      // Fallback to local storage
      try {
        const uploadsDir = path.join(__dirname, "../public/uploads/branding");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, file.buffer);
        uploadedUrl = `/uploads/branding/${fileName}`;
      } catch (localError) {
        logger.error("Local upload fallback error:", localError);
        return res.status(500).json({ success: false, message: "Failed to save image locally" });
      }
    }

    // Update database for hotel
    const dbColumn = type === "logo" ? "logo_url" : "banner_url";
    await db.query(
      `UPDATE public.hotels SET ${dbColumn} = $1 WHERE hotel_id = $2`,
      [uploadedUrl, hotelId]
    );

    return res.json({
      success: true,
      url: uploadedUrl,
      message: `${type === 'logo' ? 'Logo' : 'Banner'} uploaded successfully`
    });
  } catch (error) {
    logger.error("Settings upload error:", error);
    return res.status(500).json({ success: false, message: "Failed to upload visual asset" });
  }
});


router.get('/subscription-plans', requireAdmin, async (req, res) => {
  try {
    // Subscription plans are global; no hotel scoping needed
    const result = await db.query('SELECT plan_id, name, price_monthly, price_yearly, features FROM public.subscription_plans ORDER BY plan_id');
    return res.json({ success: true, plans: result.rows });
  } catch (error) {
    logger.error('Fetch subscription plans error:', error);
    // If the table does not exist, create it and seed default plans
    if (error.code === '42P01') {
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS public.subscription_plans (
            plan_id serial PRIMARY KEY,
            name varchar(100) NOT NULL,
            price_monthly numeric(10,2) NOT NULL,
            price_yearly numeric(10,2),
            features jsonb,
            trial_days integer DEFAULT 14
          );
        `);
        // Seed default plans if table empty
        const seedCheck = await db.query('SELECT COUNT(*) FROM public.subscription_plans');
        if (parseInt(seedCheck.rows[0].count) === 0) {
          await db.query(`
            INSERT INTO public.subscription_plans (name, price_monthly, price_yearly, features) VALUES
              ('trial', 1, 1, '{"all_basic":true,"unlimited_staff":true,"advanced_analytics":true,"occupancy_tracking":true,"priority_support":true,"menu_assistant":true,"is_trial_pro":true}'),
              ('basic', 999, 11988, '{"menu_items":"unlimited","admin_managers":3,"razorpay":true,"kds":true,"dynamic_qr":true,"pdf_reports":true}'),
              ('pro', 2499, 29988, '{"all_basic":true,"unlimited_staff":true,"advanced_analytics":true,"occupancy_tracking":true,"priority_support":true,"menu_assistant":true}');
          `);
        }
        // Re-run the original query now that table exists
        const retryResult = await db.query('SELECT plan_id, name, price_monthly, price_yearly, features FROM public.subscription_plans ORDER BY plan_id');
        return res.json({ success: true, plans: retryResult.rows });
      } catch (creationError) {
        logger.error('Error creating subscription_plans table:', creationError);
        return res.status(500).json({ success: false, message: 'Failed to fetch subscription plans' });
      }
    }
    return res.status(500).json({ success: false, message: 'Failed to fetch subscription plans' });
  }
});
// New endpoint: return current hotel's subscription status
router.get('/hotel-subscription', requireAdmin, async (req, res) => {
  try {
    const hotelId = req.admin.hotelId;
    const result = await db.query(
      `SELECT s.plan_id, s.start_date, s.expiry_date, s.status, sp.name, sp.price_monthly, sp.price_yearly, sp.features
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.plan_id
       WHERE s.hotel_id = $1
       ORDER BY s.expiry_date DESC
       LIMIT 1`,
      [hotelId]
    );
    if (result.rows.length === 0) {
      return res.json({ success: true, subscription: null });
    }
    return res.json({ success: true, subscription: result.rows[0] });
  } catch (error) {
    logger.error('Fetch hotel subscription error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch hotel subscription' });
  }
});

// ─── Settings: PUT /settings/location ───────────────────────────────
router.put("/settings/location", requireAdmin, async (req, res) => {
  try {
    const { latitude, longitude, address, orderRadius } = req.body;
    const hotelId = req.admin.role === 'super_admin' ? (await resolveHotelSlug(req)) : req.admin.hotelId;

    if (!hotelId || hotelId === -1) {
      return res.status(403).json({ success: false, message: "Authorized hotel context required." });
    }

    const lat = latitude !== undefined && latitude !== null && latitude !== '' ? parseFloat(latitude) : null;
    const lng = longitude !== undefined && longitude !== null && longitude !== '' ? parseFloat(longitude) : null;
    const radius = parseInt(orderRadius) > 0 ? parseInt(orderRadius) : 30;

    const sets = [];
    const params = [];
    if (lat !== null) { params.push(lat); sets.push(`latitude = $${params.length}`); }
    if (lng !== null) { params.push(lng); sets.push(`longitude = $${params.length}`); }
    params.push(radius); sets.push(`order_radius = $${params.length}`);
    if (address) { params.push(address.trim()); sets.push(`address = $${params.length}`); }
    params.push(hotelId);

    await db.query(
      `UPDATE public.hotels SET ${sets.join(', ')} WHERE hotel_id = $${params.length}`,
      params
    );

    return res.json({ success: true, message: "Hotel location updated successfully." });
  } catch (error) {
    logger.error("Update location error:", error);
    return res.status(500).json({ success: false, message: "Failed to update hotel location." });
  }
});

// ─── Settings: PUT /settings/location-ordering ────────────────────────
router.put("/settings/location-ordering", requireAdmin, async (req, res) => {
  try {
    const { locationOrderingEnabled } = req.body;
    const hotelId = req.admin.role === 'super_admin' ? (await resolveHotelSlug(req)) : req.admin.hotelId;

    if (!hotelId || hotelId === -1) {
      return res.status(403).json({ success: false, message: "Authorized hotel context required." });
    }

    await db.query(
      "UPDATE public.hotels SET location_ordering_enabled = $1 WHERE hotel_id = $2",
      [locationOrderingEnabled === true, hotelId]
    );

    return res.json({ success: true, message: "Location-based ordering preferences updated successfully." });
  } catch (error) {
    logger.error("Update location ordering error:", error);
    return res.status(500).json({ success: false, message: "Failed to update location-based ordering settings." });
  }
});

// ─── Settings: GET /settings/auth-settings ──────────────────────────
router.get("/auth-settings", requireAdmin, async (req, res) => {
  try {
    const hotelId = req.admin.role === 'super_admin'
      ? await resolveHotelSlug(req)
      : req.admin.hotelId;

    if (!hotelId || hotelId === -1) {
      return res.status(404).json({ success: false, message: "Hotel not resolved." });
    }

    const result = await db.query(
      "SELECT require_customer_auth, customer_auth_required, suspicious_activity_mode FROM public.hotels WHERE hotel_id = $1",
      [hotelId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    const row = result.rows[0];
    return res.json({
      success: true,
      requireCustomerAuth: row.customer_auth_required || row.require_customer_auth || false,
      suspiciousActivityMode: row.suspicious_activity_mode || false
    });
  } catch (error) {
    logger.error("Get hotel auth settings error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch authentication settings" });
  }
});

// ─── Settings: PUT /settings/auth-settings ──────────────────────────
router.put("/auth-settings", requireAdmin, async (req, res) => {
  try {
    const hotelId = req.admin.role === 'super_admin'
      ? await resolveHotelSlug(req)
      : req.admin.hotelId;

    if (!hotelId || hotelId === -1) {
      return res.status(404).json({ success: false, message: "Hotel not resolved." });
    }

    const { requireCustomerAuth, suspiciousActivityMode, note } = req.body;

    const sets = [];
    const params = [];
    const auditActions = [];

    if (requireCustomerAuth !== undefined) {
      const val = requireCustomerAuth === true || requireCustomerAuth === 'true';
      params.push(val);
      sets.push("require_customer_auth = $" + params.length);
      sets.push("customer_auth_required = $" + params.length);
      auditActions.push(val ? 'enable_customer_auth' : 'disable_customer_auth');
    }

    if (suspiciousActivityMode !== undefined) {
      const val = suspiciousActivityMode === true || suspiciousActivityMode === 'true';
      params.push(val);
      sets.push("suspicious_activity_mode = $" + params.length);
      auditActions.push(val ? 'enable_suspicious_protection' : 'disable_suspicious_protection');
      if (val) {
        params.push(true);
        sets.push("require_customer_auth = $" + params.length);
        sets.push("customer_auth_required = $" + params.length);
        if (!auditActions.includes('enable_customer_auth')) auditActions.push('enable_customer_auth');
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: "No settings to update." });
    }

    params.push(hotelId);
    await db.query(
      "UPDATE public.hotels SET " + sets.join(', ') + " WHERE hotel_id = $" + params.length,
      params
    );

    // Audit logs
    for (const action of auditActions) {
      await db.query(
        "INSERT INTO public.auth_logs (hotel_id, admin_id, admin_username, admin_role, action, note) VALUES ($1, $2, $3, $4, $5, $6)",
        [hotelId, req.admin.id, req.admin.username, req.admin.role, action, note || 'Updated via Hotel Settings Dashboard']
      );
    }

    return res.json({ success: true, message: "Authentication settings updated successfully." });
  } catch (error) {
    logger.error("Update hotel auth settings error:", error);
    return res.status(500).json({ success: false, message: "Failed to update authentication settings." });
  }
});

// ─── Settings: GET /settings/auth-logs ──────────────────────────────
router.get("/auth-logs", requireAdmin, async (req, res) => {
  try {
    const hotelId = req.admin.role === 'super_admin'
      ? await resolveHotelSlug(req)
      : req.admin.hotelId;

    if (!hotelId || hotelId === -1) {
      return res.status(404).json({ success: false, message: "Hotel not resolved." });
    }

    const { limit = 50 } = req.query;

    const result = await db.query(
      `SELECT al.id, al.hotel_id, al.admin_id, al.admin_username, al.admin_role,
              al.action, al.note, al.created_at
       FROM public.auth_logs al
       WHERE al.hotel_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2`,
      [hotelId, parseInt(limit) || 50]
    );

    return res.json({ success: true, logs: result.rows });
  } catch (error) {
    logger.error("Get hotel auth logs error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch authentication logs" });
  }
});

module.exports = router;
