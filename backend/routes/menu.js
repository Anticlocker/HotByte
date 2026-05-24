// Public menu routes for customers

const express = require("express");
const router = express.Router();
const db = require("./database");

router.get("/categories", async (req, res) => {
  try {
    const hotelSlug = req.query.hotel_slug || "hotbyte";
    const hotelResult = await db.query("SELECT hotel_id, is_frozen, table_count FROM public.hotels WHERE slug = $1", [hotelSlug]);
    
    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }
    const { hotel_id: hotelId, is_frozen: isFrozen, table_count: tableCount } = hotelResult.rows[0];

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
      tableCount: tableCount || 5
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

module.exports = router;

