const express = require("express");
const logger = require("../utils/logger");
const router = express.Router();
const db = require("./database");
const crypto = require("crypto");
const { requireAdmin } = require("./auth");
const { seedDefaultMenu } = require("./seedDefaultMenu");

const bcrypt = require("bcrypt");
const SALT_ROUNDS = 12;

// Hashing helper for password
const hashPassword = async (pwd) => await bcrypt.hash(pwd, SALT_ROUNDS);

// Middleware to restrict access only to Super Admins
const requireSuperAdmin = (req, res, next) => {
  if (!req.admin || req.admin.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: "Super Admin privileges required." });
  }
  next();
};

// Apply requireAdmin and requireSuperAdmin to all routes in this module
router.use(requireAdmin);
router.use(requireSuperAdmin);

/**
 * GET /api/superadmin/hotels
 * Lists all hotel tenants along with premium analytics metrics
 */
router.get("/hotels", async (req, res) => {
  try {
    const queryText = `
      SELECT 
        h.hotel_id, 
        h.name, 
        h.slug, 
        h.phone, 
        h.address, 
        h.created_at,
        h.is_frozen,
        h.plan,
        h.trial_ends_at,
        h.table_count,
        h.latitude,
        h.longitude,
        h.order_radius,
        h.hotel_type,
        h.require_customer_auth,
        h.customer_auth_required,
        h.suspicious_activity_mode,
        (SELECT COUNT(*) FROM admins a WHERE a.hotel_id = h.hotel_id) as manager_count,
        (SELECT COUNT(*) FROM menu_items m WHERE m.hotel_id = h.hotel_id) as item_count,
        (SELECT COUNT(*) FROM orders o WHERE o.hotel_id = h.hotel_id) as order_count,
        COALESCE((SELECT SUM(o.total_amount) FROM orders o WHERE o.hotel_id = h.hotel_id), 0) as total_revenue
      FROM public.hotels h
      ORDER BY h.created_at DESC
    `;
    const result = await db.query(queryText);
    
    return res.json({
      success: true,
      hotels: result.rows.map(row => ({
        id: row.hotel_id,
        name: row.name,
        slug: row.slug,
        phone: row.phone,
        address: row.address,
        createdAt: row.created_at,
        isFrozen: row.is_frozen || false,
        plan: row.plan || 'trial',
        trialEndsAt: row.trial_ends_at,
        tableCount: row.table_count || 5,
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
        orderRadius: row.order_radius || 30,
        hotelType: row.hotel_type || 'both',
        requireCustomerAuth: row.customer_auth_required || row.require_customer_auth || false,
        suspiciousActivityMode: row.suspicious_activity_mode || false,
        managerCount: parseInt(row.manager_count),
        itemCount: parseInt(row.item_count),
        orderCount: parseInt(row.order_count),
        totalRevenue: parseFloat(row.total_revenue)
      }))
    });
  } catch (error) {
    logger.error("Superadmin fetch hotels error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch hotels." });
  }
});

/**
 * POST /api/superadmin/hotels
 * Creates/Registers a new hotel tenant
 */
router.post("/hotels", async (req, res) => {
  const { 
    name, slug, phone, address, plan, tableCount,
    adminName, adminUsername, adminEmail, adminPassword,
    latitude, longitude, orderRadius, hotelType
  } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ success: false, message: "Hotel name and unique URL slug are required." });
  }

  if (!adminUsername || !adminPassword) {
    return res.status(400).json({ success: false, message: "Hotel Admin username and password are required." });
  }

  if (adminPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Admin password must be at least 6 characters long." });
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9\-]/g, "");
  if (!cleanSlug) {
    return res.status(400).json({ success: false, message: "Invalid URL slug. Use alphanumeric and hyphen characters only." });
  }

  try {
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

    const hotelPlan = ['trial', 'basic', 'pro'].includes(plan) ? plan : 'trial';
    const trialEndsAt = hotelPlan === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null;
    const tables = parseInt(tableCount) > 0 ? parseInt(tableCount) : 5;

    // Start Transaction
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // 1. Insert Hotel
      const lat = latitude ? parseFloat(latitude) : null;
      const lng = longitude ? parseFloat(longitude) : null;
      const radius = parseInt(orderRadius) > 0 ? parseInt(orderRadius) : 30;
      const validHotelTypes = ['veg', 'nonveg', 'both'];
      const safeHotelType = validHotelTypes.includes(hotelType) ? hotelType : 'both';
      const authReq = req.body.requireCustomerAuth === true || req.body.requireCustomerAuth === 'true';
      const hotelResult = await client.query(
        "INSERT INTO public.hotels (name, slug, phone, address, plan, trial_ends_at, table_count, latitude, longitude, order_radius, hotel_type, require_customer_auth, customer_auth_required) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING hotel_id, name, slug, phone, address, plan, trial_ends_at, table_count, latitude, longitude, order_radius, hotel_type, require_customer_auth, customer_auth_required, created_at",
        [name.trim(), cleanSlug, phone ? phone.trim() : null, address ? address.trim() : null, hotelPlan, trialEndsAt, tables, lat, lng, radius, safeHotelType, authReq, authReq]
      );
      const newHotel = hotelResult.rows[0];

      // 2. Insert Hotel Admin Manager mapped to this hotel with role = 'admin'
      const hashedAdminPassword = await hashPassword(adminPassword);
      const adminResult = await client.query(
        "INSERT INTO public.admins (name, username, email, password, hotel_id, role) VALUES ($1, $2, $3, $4, $5, 'admin') RETURNING admin_id, name, username, email, hotel_id, role, created_at",
        [adminName ? adminName.trim() : null, adminUsername.trim(), adminEmail && adminEmail.trim() !== "" ? adminEmail.trim() : null, hashedAdminPassword, newHotel.hotel_id]
      );
      const newAdmin = adminResult.rows[0];

      // 3. Auto-seed starter menu categories & items in the SAME transaction client
      const seedResult = await seedDefaultMenu(client, newHotel.hotel_id, true);

      await client.query("COMMIT");

      return res.json({
        success: true,
        message: "Hotel and Admin registered successfully with starter menu items!",
        hotel: newHotel,
        admin: newAdmin,
        defaultMenuSeeded: seedResult.seeded,
        defaultMenuStats: seedResult.seeded
          ? { categories: seedResult.categoriesCreated, items: seedResult.itemsCreated }
          : null,
      });
    } catch (txnError) {
      await client.query("ROLLBACK");
      throw txnError;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("Superadmin register hotel error:", error);
    return res.status(500).json({ success: false, message: "Failed to register hotel and admin: " + error.message });
  }
});

/**
 * GET /api/superadmin/admins
 * Lists all active managers and their assigned hotels
 */
router.get("/admins", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        a.admin_id, 
        a.name, 
        a.username, 
        a.email, 
        a.role, 
        a.created_at, 
        a.hotel_id,
        h.name as hotel_name, 
        h.slug as hotel_slug
      FROM public.admins a
      LEFT JOIN public.hotels h ON a.hotel_id = h.hotel_id
      ORDER BY a.created_at DESC
    `);
    
    return res.json({
      success: true,
      admins: result.rows.map(row => ({
        id: row.admin_id,
        name: row.name,
        username: row.username,
        email: row.email,
        role: row.role,
        createdAt: row.created_at,
        hotelId: row.hotel_id,
        hotelName: row.hotel_name || "Super Admin",
        hotelSlug: row.hotel_slug || null
      }))
    });
  } catch (error) {
    logger.error("Superadmin fetch admins error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch managers." });
  }
});

/**
 * POST /api/superadmin/admins
 * Creates and registers a manager, assigning them to a specific hotel
 */
router.post("/admins", async (req, res) => {
  try {
    const { name, username, email, password, hotelId } = req.body;
    
    if (!username || !password || !hotelId) {
      return res.status(400).json({ success: false, message: "Username, password, and target Hotel ID are required." });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }

    const hotelCheck = await db.query("SELECT hotel_id FROM public.hotels WHERE hotel_id = $1", [hotelId]);
    if (hotelCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Target hotel not found." });
    }

    const existingUsername = await db.query("SELECT admin_id FROM public.admins WHERE username = $1", [username.trim()]);
    if (existingUsername.rows.length > 0) {
      return res.status(409).json({ success: false, message: "This username is already taken." });
    }
    
    if (email) {
      const existingEmail = await db.query("SELECT admin_id FROM public.admins WHERE email = $1", [email.trim()]);
      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ success: false, message: "This email address is already registered." });
      }
    }

    const hashedPassword = await hashPassword(password);
    const result = await db.query(
      "INSERT INTO public.admins (name, username, email, password, hotel_id, role) VALUES ($1, $2, $3, $4, $5, 'admin') RETURNING admin_id, name, username, email, hotel_id, role, created_at",
      [name ? name.trim() : null, username.trim(), email ? email.trim() : null, hashedPassword, hotelId]
    );

    return res.json({
      success: true,
      message: "Hotel manager assigned successfully!",
      admin: result.rows[0]
    });
  } catch (error) {
    logger.error("Superadmin assign manager error:", error);
    return res.status(500).json({ success: false, message: "Failed to assign hotel manager." });
  }
});

/**
 * PUT /api/superadmin/hotels/:id
 * Updates an existing hotel tenant's details
 */
router.put("/hotels/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, phone, address, isFrozen, plan, tableCount, latitude, longitude, orderRadius, hotel_type, requireCustomerAuth } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: "Hotel name and unique URL slug are required." });
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9\-]/g, "");
    if (!cleanSlug) {
      return res.status(400).json({ success: false, message: "Invalid URL slug. Use alphanumeric and hyphen characters only." });
    }

    const slugCheck = await db.query(
      "SELECT hotel_id FROM public.hotels WHERE slug = $1 AND hotel_id <> $2",
      [cleanSlug, id]
    );
    if (slugCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: "A hotel with this URL slug already exists." });
    }

    const hotelPlan = ['trial', 'basic', 'pro'].includes(plan) ? plan : undefined;
    const tables = parseInt(tableCount) > 0 ? parseInt(tableCount) : undefined;

    const lat = latitude !== undefined && latitude !== null && latitude !== '' ? parseFloat(latitude) : undefined;
    const lng = longitude !== undefined && longitude !== null && longitude !== '' ? parseFloat(longitude) : undefined;
    const radius = parseInt(orderRadius) > 0 ? parseInt(orderRadius) : undefined;

    // Build dynamic SET clause
    const setClause = [
      'name = $1', 'slug = $2', 'phone = $3', 'address = $4', 'is_frozen = $5'
    ];
    const params = [name.trim(), cleanSlug, phone ? phone.trim() : null, address ? address.trim() : null, isFrozen === true, id];
    if (hotelPlan) { params.splice(params.length - 1, 0, hotelPlan); setClause.push(`plan = $${params.length - 1}`); }
    if (tables) { params.splice(params.length - 1, 0, tables); setClause.push(`table_count = $${params.length - 1}`); }
    if (lat !== undefined) { params.splice(params.length - 1, 0, lat); setClause.push(`latitude = $${params.length - 1}`); }
    if (lng !== undefined) { params.splice(params.length - 1, 0, lng); setClause.push(`longitude = $${params.length - 1}`); }
    if (radius !== undefined) { params.splice(params.length - 1, 0, radius); setClause.push(`order_radius = $${params.length - 1}`); }
    const validHotelTypes = ['veg', 'nonveg', 'both'];
    if (hotel_type && validHotelTypes.includes(hotel_type)) { params.splice(params.length - 1, 0, hotel_type); setClause.push(`hotel_type = $${params.length - 1}`); }
    if (requireCustomerAuth !== undefined) {
      const val = requireCustomerAuth === true || requireCustomerAuth === 'true';
      params.splice(params.length - 1, 0, val);
      setClause.push(`require_customer_auth = $${params.length - 1}`);
      params.splice(params.length - 1, 0, val);
      setClause.push(`customer_auth_required = $${params.length - 1}`);
    }

    const result = await db.query(
      `UPDATE public.hotels SET ${setClause.join(', ')} WHERE hotel_id = $${params.length} RETURNING hotel_id, name, slug, phone, address, is_frozen, plan, trial_ends_at, table_count, latitude, longitude, order_radius, hotel_type, require_customer_auth, customer_auth_required, created_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }

    // ── Audit log: track freeze/unfreeze changes ────────────────────────────
    const wasFrozen = result.rows[0].is_frozen;
    const newFrozen = isFrozen === true;
    if (wasFrozen !== newFrozen) {
      const auditAction = newFrozen ? 'hotel_frozen' : 'hotel_unfrozen';
      try {
        await db.query(
          "INSERT INTO public.auth_logs (hotel_id, admin_id, admin_username, admin_role, action, note) VALUES ($1, $2, $3, $4, $5, $6)",
          [id, req.admin.id, req.admin.username, 'super_admin', auditAction, `Hotel ${newFrozen ? 'frozen' : 'unfrozen'} by Super Admin via hotel update`]
        );
      } catch (logErr) {
        logger.warn("Audit log insert failed (non-fatal):", logErr.message);
      }
    }

    const row = result.rows[0];
    return res.json({
      success: true,
      message: "Hotel updated successfully!",
      hotel: {
        id: row.hotel_id,
        name: row.name,
        slug: row.slug,
        phone: row.phone,
        address: row.address,
        isFrozen: row.is_frozen,
        plan: row.plan,
        trialEndsAt: row.trial_ends_at,
        tableCount: row.table_count,
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
        orderRadius: row.order_radius || 30,
        hotelType: row.hotel_type || 'both',
        requireCustomerAuth: row.customer_auth_required || row.require_customer_auth || false,
        createdAt: row.created_at
      }
    });
  } catch (error) {
    logger.error("Superadmin update hotel error:", error);
    return res.status(500).json({ success: false, message: "Failed to update hotel." });
  }
});

/**
 * PUT /api/superadmin/hotels/:id/plan
 * Changes a hotel's subscription plan (trial → basic → pro)
 */
router.put("/hotels/:id/plan", async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;

    if (!['trial', 'basic', 'pro'].includes(plan)) {
      return res.status(400).json({ success: false, message: "Invalid plan. Use 'trial', 'basic', or 'pro'." });
    }

    // If moving to trial, reset trial_ends_at to 14 days from now
    // If upgrading to paid plan, clear trial_ends_at and unfreeze
    const trialEndsAt = plan === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null;
    const unfreezeIfPaid = plan !== 'trial';

    const result = await db.query(
      `UPDATE public.hotels 
       SET plan = $1, trial_ends_at = $2, is_frozen = CASE WHEN $3 THEN FALSE ELSE is_frozen END
       WHERE hotel_id = $4
       RETURNING hotel_id, name, slug, plan, trial_ends_at, is_frozen`,
      [plan, trialEndsAt, unfreezeIfPaid, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }

    return res.json({
      success: true,
      message: `Hotel subscription updated to ${plan} plan successfully!`,
      hotel: result.rows[0]
    });
  } catch (error) {
    logger.error("Superadmin update plan error:", error);
    return res.status(500).json({ success: false, message: "Failed to update subscription plan." });
  }
});

/**
 * PUT /api/superadmin/admins/:id
 * Updates a manager's details or reassigns them to another hotel
 */
router.put("/admins/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, password, hotelId } = req.body;

    if (!username || !hotelId) {
      return res.status(400).json({ success: false, message: "Username and target Hotel ID are required." });
    }

    // Check if target hotel exists
    const hotelCheck = await db.query("SELECT hotel_id FROM public.hotels WHERE hotel_id = $1", [hotelId]);
    if (hotelCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Target hotel not found." });
    }

    // Check if the username is taken by ANOTHER admin
    const usernameCheck = await db.query(
      "SELECT admin_id FROM public.admins WHERE username = $1 AND admin_id <> $2",
      [username.trim(), id]
    );
    if (usernameCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: "This username is already taken." });
    }

    // Check if the email is taken by ANOTHER admin
    if (email) {
      const emailCheck = await db.query(
        "SELECT admin_id FROM public.admins WHERE email = $1 AND admin_id <> $2",
        [email.trim(), id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ success: false, message: "This email address is already registered." });
      }
    }

    let queryText = "";
    let params = [];

    if (password && password.trim() !== "") {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
      }
      const hashedPassword = await hashPassword(password);
      queryText = `
        UPDATE public.admins 
        SET name = $1, username = $2, email = $3, password = $4, hotel_id = $5 
        WHERE admin_id = $6 AND role <> 'super_admin'
        RETURNING admin_id, name, username, email, hotel_id, role, created_at
      `;
      params = [name ? name.trim() : null, username.trim(), email ? email.trim() : null, hashedPassword, hotelId, id];
    } else {
      queryText = `
        UPDATE public.admins 
        SET name = $1, username = $2, email = $3, hotel_id = $4 
        WHERE admin_id = $5 AND role <> 'super_admin'
        RETURNING admin_id, name, username, email, hotel_id, role, created_at
      `;
      params = [name ? name.trim() : null, username.trim(), email ? email.trim() : null, hotelId, id];
    }

    const result = await db.query(queryText, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Manager not found or unauthorized to edit Super Admin." });
    }

    // Invalidate all active sessions for this admin manager
    await db.query("DELETE FROM public.sessions WHERE admin_id = $1", [id]);

    return res.json({
      success: true,
      message: "Manager updated successfully!",
      admin: result.rows[0]
    });
  } catch (error) {
    logger.error("Superadmin update manager error:", error);
    return res.status(500).json({ success: false, message: "Failed to update hotel manager." });
  }
});

/**
 * DELETE /api/superadmin/hotels/:id
 * Permanently removes a hotel tenant (cascades automatically to menu categories, items, and orders)
 */
router.delete("/hotels/:id", async (req, res) => {
  const { id } = req.params;
  const client = await db.connect();
  
  try {
    await client.query("BEGIN");

    // 1. Delete ratings referencing menu_items of this hotel
    await client.query(
      "DELETE FROM public.ratings WHERE item_id IN (SELECT item_id FROM public.menu_items WHERE hotel_id = $1)",
      [id]
    );

    // 2. Delete ratings referencing orders of this hotel
    await client.query(
      "DELETE FROM public.ratings WHERE order_id IN (SELECT order_id FROM public.orders WHERE hotel_id = $1)",
      [id]
    );

    // 3. Delete order_items referencing orders of this hotel
    await client.query(
      "DELETE FROM public.order_items WHERE order_id IN (SELECT order_id FROM public.orders WHERE hotel_id = $1)",
      [id]
    );

    // 4. Delete payments referencing orders of this hotel
    await client.query(
      "DELETE FROM public.payments WHERE order_id IN (SELECT order_id FROM public.orders WHERE hotel_id = $1)",
      [id]
    );

    // 5. Delete orders of this hotel
    await client.query(
      "DELETE FROM public.orders WHERE hotel_id = $1",
      [id]
    );

    // 6. Delete order_items referencing menu_items
    await client.query(
      "DELETE FROM public.order_items WHERE item_id IN (SELECT item_id FROM public.menu_items WHERE hotel_id = $1)",
      [id]
    );

    // 7. Delete menu_items of this hotel
    await client.query(
      "DELETE FROM public.menu_items WHERE hotel_id = $1",
      [id]
    );

    // 8. Delete menu_category of this hotel
    await client.query(
      "DELETE FROM public.menu_category WHERE hotel_id = $1",
      [id]
    );

    // 9. Delete sessions referencing admins of this hotel (except the super admin)
    await client.query(
      "DELETE FROM public.sessions WHERE admin_id IN (SELECT admin_id FROM public.admins WHERE hotel_id = $1 AND role <> 'super_admin')",
      [id]
    );

    // 10. Delete admins of this hotel (except the super admin)
    await client.query(
      "DELETE FROM public.admins WHERE hotel_id = $1 AND role <> 'super_admin'",
      [id]
    );

    // 11. Disassociate super_admin from this hotel
    await client.query(
      "UPDATE public.admins SET hotel_id = NULL WHERE hotel_id = $1 AND role = 'super_admin'",
      [id]
    );

    // 12. Delete the hotel itself
    const result = await client.query(
      "DELETE FROM public.hotels WHERE hotel_id = $1 RETURNING hotel_id, name, slug",
      [id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: `Hotel "${result.rows[0].name}" and all its linked categories, menu items, and orders have been deleted successfully!`,
      hotel: result.rows[0]
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Superadmin delete hotel error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete hotel: " + error.message });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/superadmin/admins/:id
 * Removes a manager admin profile securely (preventing deletion of Super Admins)
 */
router.delete("/admins/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Delete query ensuring role is not super_admin
    const result = await db.query(
      "DELETE FROM public.admins WHERE admin_id = $1 AND role <> 'super_admin' RETURNING admin_id, username, name",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Manager not found or unauthorized to delete Super Admin." });
    }

    return res.json({
      success: true,
      message: `Manager "${result.rows[0].username}" deleted successfully!`,
      admin: result.rows[0]
    });
  } catch (error) {
    logger.error("Superadmin delete manager error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete manager." });
  }
});


/**
 * PUT /api/superadmin/hotels/:id/auth-settings
 * Super Admin overrides auth settings for any hotel
 */
router.put("/hotels/:id/auth-settings", async (req, res) => {
  try {
    const { id } = req.params;
    const { requireCustomerAuth, suspiciousActivityMode, note } = req.body;

    const hotelCheck = await db.query("SELECT hotel_id FROM public.hotels WHERE hotel_id = $1", [id]);
    if (hotelCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }

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

    params.push(id);
    await db.query(
      "UPDATE public.hotels SET " + sets.join(', ') + " WHERE hotel_id = $" + params.length,
      params
    );

    for (const action of auditActions) {
      await db.query(
        "INSERT INTO public.auth_logs (hotel_id, admin_id, admin_username, admin_role, action, note) VALUES ($1, $2, $3, $4, $5, $6)",
        [id, req.admin.id, req.admin.username, 'super_admin', action, note || 'Super Admin override']
      );
    }

    return res.json({ success: true, message: "Hotel auth settings overridden successfully." });
  } catch (error) {
    logger.error("Superadmin override auth error:", error);
    return res.status(500).json({ success: false, message: "Failed to override auth settings." });
  }
});

/**
 * GET /api/superadmin/auth-logs
 * Super Admin views all auth logs across all hotels
 */
router.get("/auth-logs", async (req, res) => {
  try {
    const { hotel_id, limit = 200 } = req.query;

    let query = `
      SELECT al.id, al.hotel_id, h.name as hotel_name, h.slug as hotel_slug,
             al.admin_id, al.admin_username, al.admin_role,
             al.action, al.note, al.created_at
      FROM public.auth_logs al
      LEFT JOIN public.hotels h ON al.hotel_id = h.hotel_id
    `;
    const params = [];

    if (hotel_id) {
      params.push(hotel_id);
      query += " WHERE al.hotel_id = $1";
    }

    query += " ORDER BY al.created_at DESC LIMIT $" + (params.length + 1);
    params.push(parseInt(limit) || 200);

    const result = await db.query(query, params);
    return res.json({ success: true, logs: result.rows });
  } catch (error) {
    logger.error("Superadmin get auth logs error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch auth logs." });
  }
});

module.exports = router;
