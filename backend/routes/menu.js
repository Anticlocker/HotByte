// Public menu routes for customers

const express = require("express");
const router = express.Router();
const db = require("./database");

router.get("/categories", async (req, res) => {
  try {
    const hotelSlug = req.query.hotel_slug || "hotbyte";
    const hotelResult = await db.query(
      `SELECT hotel_id, name, logo_url, banner_url, is_frozen, is_open, table_count,
              tagline, description, show_logo, show_banner, primary_color, secondary_color,
              enable_online_orders, enable_qr_ordering, settings_json, phone, email,
              latitude, longitude, order_radius
       FROM public.hotels WHERE slug = $1`,
      [hotelSlug]
    );
    
    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }
    const { 
      hotel_id: hotelId, 
      name: hotelName, 
      logo_url: logoUrl, 
      banner_url: bannerUrl, 
      is_frozen: isFrozen, 
      is_open: isOpen, 
      table_count: tableCount,
      tagline,
      description,
      show_logo: showLogo,
      show_banner: showBanner,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      enable_online_orders: enableOnlineOrders,
      enable_qr_ordering: enableQrOrdering,
      settings_json: settingsJson,
      phone,
      email,
      latitude,
      longitude,
      order_radius: orderRadius
    } = hotelResult.rows[0];

    if (isFrozen) {
      return res.status(403).json({ success: false, isFrozen: true, message: "This hotel account is frozen due to payment / subscription trial expiration." });
    }

    const result = await db.query(
      "SELECT category_id, category_name FROM menu_category WHERE hotel_id = $1 ORDER BY category_name",
      [hotelId]
    );
    return res.json({
      success: true,
      categories: result.rows,
      tableCount: tableCount || 5,
      isOpen: isOpen !== false,
      hotelName: hotelName || "HotByte",
      logoUrl: logoUrl || null,
      bannerUrl: bannerUrl || null,
      tagline: tagline || "Served with Love ❤️",
      description: description || null,
      showLogo: showLogo !== false,
      showBanner: showBanner !== false,
      primaryColor: primaryColor || "#FF5A1F",
      secondaryColor: secondaryColor || "#FF5A1F",
      enableOnlineOrders: enableOnlineOrders !== false,
      enableQrOrdering: enableQrOrdering !== false,
      settingsJson: settingsJson || {},
      phone: phone || null,
      email: email || null,
      hotelLatitude: latitude ? parseFloat(latitude) : null,
      hotelLongitude: longitude ? parseFloat(longitude) : null,
      orderRadius: orderRadius || 30
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch categories" });
  }
});

router.get("/items", async (req, res) => {
  try {
    const hotelSlug = req.query.hotel_slug || "hotbyte";
    const categoryId = req.query.category_id;

    const hotelResult = await db.query("SELECT hotel_id, is_frozen FROM public.hotels WHERE slug = $1", [hotelSlug]);
    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }
    const { hotel_id: hotelId, is_frozen: isFrozen } = hotelResult.rows[0];
    
    if (isFrozen) {
      return res.status(403).json({ success: false, isFrozen: true, message: "This hotel account is frozen due to payment / subscription trial expiration." });
    }
    
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
        mi.is_veg,
        COALESCE(ROUND(AVG(r.rating_value)::numeric, 1), 0) as avg_rating,
        COUNT(r.rating_id) as rating_count
      FROM menu_items mi
      INNER JOIN menu_category mc ON mi.category_id = mc.category_id
      LEFT JOIN ratings r ON mi.item_id = r.item_id
      WHERE mi.is_available = true AND mi.hotel_id = $1
    `;
    
    const params = [hotelId];
    if (categoryId && categoryId !== "all") {
      query += " AND mi.category_id = $2";
      params.push(categoryId);
    }
    
    query += `
      GROUP BY mi.item_id, mi.item_name, mi.category_id, mc.category_name, 
               mi.price, mi.image_url, mi.description, mi.is_available, mi.is_veg
      ORDER BY mc.category_name, mi.item_name
    `;
    
    const result = await db.query(query, params);
    
    return res.json({
      success: true,
      items: result.rows,
    });
  } catch (error) {
    console.error("Get menu items error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch menu items" });
  }
});

router.get("/status", async (req, res) => {
  try {
    const hotelSlug = req.query.hotel_slug || "hotbyte";
    const result = await db.query(
      `SELECT name, logo_url, banner_url, is_frozen, is_open,
              tagline, description, show_logo, show_banner, primary_color, secondary_color,
              enable_online_orders, enable_qr_ordering, settings_json, phone, email
       FROM public.hotels WHERE slug = $1`,
      [hotelSlug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }
    const { 
      name: hotelName, 
      logo_url: logoUrl, 
      banner_url: bannerUrl, 
      is_frozen: isFrozen, 
      is_open: isOpen,
      tagline,
      description,
      show_logo: showLogo,
      show_banner: showBanner,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      enable_online_orders: enableOnlineOrders,
      enable_qr_ordering: enableQrOrdering,
      settings_json: settingsJson,
      phone,
      email
    } = result.rows[0];
    return res.json({
      success: true,
      isFrozen: isFrozen || false,
      isOpen: isOpen !== false,
      hotelName: hotelName || "HotByte",
      logoUrl: logoUrl || null,
      bannerUrl: bannerUrl || null,
      tagline: tagline || "Served with Love ❤️",
      description: description || null,
      showLogo: showLogo !== false,
      showBanner: showBanner !== false,
      primaryColor: primaryColor || "#FF5A1F",
      secondaryColor: secondaryColor || "#FF5A1F",
      enableOnlineOrders: enableOnlineOrders !== false,
      enableQrOrdering: enableQrOrdering !== false,
      settingsJson: settingsJson || {},
      phone: phone || null,
      email: email || null
    });
  } catch (error) {
    console.error("Get hotel status error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch hotel status" });
  }
});

module.exports = router;

