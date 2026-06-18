const express = require("express");
const logger = require("../utils/logger");
const router = express.Router();
const db = require("./database");
const { requireAdmin } = require("./auth");
const crypto = require("crypto");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");

// ─── Helpers ───────────────────────────────────────────────────────────

const resolveHotelId = async (req) => {
  if (req.admin.role !== "super_admin") return req.admin.hotelId;
  const slug = req.query.hotel_slug || req.body?.hotel_slug;
  if (!slug) return null;
  const result = await db.query("SELECT hotel_id FROM public.hotels WHERE slug = $1", [slug]);
  if (result.rows.length === 0) return -1;
  return result.rows[0].hotel_id;
};

const generateQrSlug = () => crypto.randomBytes(24).toString("hex");

const getBaseUrl = (req) => {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
};

// ─── CREATE TABLE ──────────────────────────────────────────────────────

router.post("/", requireAdmin, async (req, res) => {
  try {
    const { table_number, table_name, capacity } = req.body;
    const hotelId = await resolveHotelId(req);
    if (!hotelId || hotelId === -1) {
      return res.status(400).json({ success: false, message: "Hotel context required." });
    }
    if (!table_number || !table_number.trim()) {
      return res.status(400).json({ success: false, message: "Table number is required." });
    }

    const qr_slug = generateQrSlug();
    const result = await db.query(
      `INSERT INTO public.restaurant_tables (hotel_id, table_number, table_name, capacity, qr_slug, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, table_number, table_name, capacity, qr_slug, is_active, created_at`,
      [hotelId, table_number.trim(), table_name?.trim() || null, parseInt(capacity) || null, qr_slug]
    );

    return res.json({ success: true, table: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ success: false, message: "Table number already exists for this hotel." });
    }
    logger.error("Create table error:", error);
    return res.status(500).json({ success: false, message: "Failed to create table." });
  }
});

// ─── LIST TABLES ───────────────────────────────────────────────────────

router.get("/", requireAdmin, async (req, res) => {
  try {
    const hotelId = await resolveHotelId(req);
    if (hotelId === -1) return res.status(404).json({ success: false, message: "Hotel slug not found." });

    let query = `SELECT id, hotel_id, table_number, table_name, capacity, qr_slug, is_active, created_at
                 FROM public.restaurant_tables`;
    const params = [];
    if (hotelId) {
      query += " WHERE hotel_id = $1";
      params.push(hotelId);
    }
    query += " ORDER BY table_number ASC";

    const result = await db.query(query, params);
    return res.json({ success: true, tables: result.rows });
  } catch (error) {
    logger.error("List tables error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch tables." });
  }
});

// ─── DOWNLOAD ALL QR CODES AS PDF ────────────────────────────────────

router.get("/qr-pdf", requireAdmin, async (req, res) => {
  try {
    const hotelId = await resolveHotelId(req);
    if (!hotelId || hotelId === -1) {
      return res.status(400).json({ success: false, message: "Hotel context required." });
    }

    const tablesResult = await db.query(
      `SELECT rt.*, h.slug AS hotel_slug, h.name AS hotel_name
       FROM public.restaurant_tables rt
       JOIN public.hotels h ON rt.hotel_id = h.hotel_id
       WHERE rt.hotel_id = $1 AND rt.is_active = TRUE
       ORDER BY rt.table_number ASC`,
      [hotelId]
    );

    if (tablesResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "No active tables found for this hotel." });
    }

    const tables = tablesResult.rows;
    const baseUrl = getBaseUrl(req);
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margins: { top: 40, bottom: 40, left: 40, right: 40 } });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${tables[0].hotel_slug}-all-tables-qr.pdf"`);
    doc.pipe(res);

    // Title
    doc.fontSize(22).font("Helvetica-Bold").text(tables[0].hotel_name || "QR Codes", { align: "center" });
    doc.fontSize(12).font("Helvetica").text(`All Active Tables - ${tables.length} tables`, { align: "center" });
    doc.moveDown(1.5);

    let itemsOnPage = 0;
    const maxPerPage = 6;

    for (const table of tables) {
      if (itemsOnPage > 0 && itemsOnPage % maxPerPage === 0) {
        doc.addPage();
      }

      const qrUrl = `${baseUrl}/menu/${table.hotel_slug}/table/${table.table_number}`;
      const qrBuffer = await QRCode.toBuffer(qrUrl, { type: "png", width: 200, margin: 1 });

      const col = itemsOnPage % maxPerPage;
      const x = 40 + (col % 3) * 200;
      const y = 100 + Math.floor(col / 3) * 200;

      doc.image(qrBuffer, x, y, { width: 140 });
      doc.fontSize(10).font("Helvetica-Bold").text(`Table ${table.table_number}`, x + 140, y + 10, { width: 150 });
      if (table.table_name) {
        doc.fontSize(9).font("Helvetica").text(table.table_name, x + 140, y + 28, { width: 150 });
      }

      itemsOnPage++;
    }

    doc.end();
  } catch (error) {
    logger.error("QR PDF generation error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate QR PDF." });
  }
});

// ─── GET SINGLE TABLE ──────────────────────────────────────────────────

router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, hotel_id, table_number, table_name, capacity, qr_slug, is_active, created_at
       FROM public.restaurant_tables WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Table not found." });
    }
    // Tenant check
    if (req.admin.role !== "super_admin" && result.rows[0].hotel_id !== req.admin.hotelId) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }
    return res.json({ success: true, table: result.rows[0] });
  } catch (error) {
    logger.error("Get table error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch table." });
  }
});

// ─── UPDATE TABLE ──────────────────────────────────────────────────────

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { table_number, table_name, capacity, is_active } = req.body;
    const hotelId = await resolveHotelId(req);
    if (!hotelId || hotelId === -1) {
      return res.status(400).json({ success: false, message: "Hotel context required." });
    }

    // Tenant check
    const existing = await db.query("SELECT hotel_id FROM public.restaurant_tables WHERE id = $1", [id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: "Table not found." });
    if (req.admin.role !== "super_admin" && existing.rows[0].hotel_id !== hotelId) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    const result = await db.query(
      `UPDATE public.restaurant_tables
       SET table_number = COALESCE($1, table_number),
           table_name = $2,
           capacity = COALESCE($3, capacity),
           is_active = COALESCE($4, is_active)
       WHERE id = $5
       RETURNING id, table_number, table_name, capacity, qr_slug, is_active, created_at`,
      [table_number?.trim() || null, table_name !== undefined ? (table_name?.trim() || null) : undefined,
       capacity !== undefined ? (parseInt(capacity) || null) : undefined,
       is_active !== undefined ? (is_active === true || is_active === "true") : undefined, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Table not found." });
    }

    return res.json({ success: true, table: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ success: false, message: "Table number already exists for this hotel." });
    }
    logger.error("Update table error:", error);
    return res.status(500).json({ success: false, message: "Failed to update table." });
  }
});

// ─── DELETE TABLE ──────────────────────────────────────────────────────

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const hotelId = await resolveHotelId(req);

    const existing = await db.query("SELECT hotel_id FROM public.restaurant_tables WHERE id = $1", [id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: "Table not found." });
    if (req.admin.role !== "super_admin" && existing.rows[0].hotel_id !== hotelId) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    await db.query("DELETE FROM public.restaurant_tables WHERE id = $1", [id]);
    return res.json({ success: true, message: "Table deleted successfully." });
  } catch (error) {
    logger.error("Delete table error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete table." });
  }
});

// ─── REGENERATE QR SLUG ────────────────────────────────────────────────

router.post("/:id/regenerate-qr", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const hotelId = await resolveHotelId(req);

    const existing = await db.query("SELECT hotel_id FROM public.restaurant_tables WHERE id = $1", [id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: "Table not found." });
    if (req.admin.role !== "super_admin" && existing.rows[0].hotel_id !== hotelId) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    const newSlug = generateQrSlug();
    const result = await db.query(
      "UPDATE public.restaurant_tables SET qr_slug = $1 WHERE id = $2 RETURNING qr_slug",
      [newSlug, id]
    );
    return res.json({ success: true, qr_slug: result.rows[0].qr_slug });
  } catch (error) {
    logger.error("Regenerate QR error:", error);
    return res.status(500).json({ success: false, message: "Failed to regenerate QR." });
  }
});

// ─── GET QR CODE IMAGE (PNG) ──────────────────────────────────────────

router.get("/:id/qr-image", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { size = 400 } = req.query;

    const result = await db.query(
      `SELECT rt.*, h.slug AS hotel_slug, h.name AS hotel_name
       FROM public.restaurant_tables rt
       JOIN public.hotels h ON rt.hotel_id = h.hotel_id
       WHERE rt.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Table not found." });

    const table = result.rows[0];
    if (req.admin.role !== "super_admin" && table.hotel_id !== req.admin.hotelId) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    const baseUrl = getBaseUrl(req);
    const qrUrl = `${baseUrl}/menu/${table.hotel_slug}/table/${table.table_number}`;

    const qrBuffer = await QRCode.toBuffer(qrUrl, {
      type: "png",
      width: parseInt(size) || 400,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `inline; filename="table-${table.table_number}-qr.png"`);
    return res.send(qrBuffer);
  } catch (error) {
    logger.error("QR image generation error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate QR image." });
  }
});

// ─── PUBLIC: VALIDATE TABLE QR ────────────────────────────────────────
// Called from customer frontend when scanning a QR — validates & returns table info

router.get("/validate/:qr_slug", async (req, res) => {
  try {
    const { qr_slug } = req.params;
    const { hotel_slug } = req.query;

    if (!hotel_slug) {
      return res.status(400).json({ success: false, message: "Hotel slug is required." });
    }

    const result = await db.query(
      `SELECT rt.id, rt.table_number, rt.table_name, rt.hotel_id, rt.is_active, h.slug AS hotel_slug
       FROM public.restaurant_tables rt
       JOIN public.hotels h ON rt.hotel_id = h.hotel_id
       WHERE rt.qr_slug = $1 AND h.slug = $2`,
      [qr_slug, hotel_slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Invalid QR code for this hotel." });
    }

    const table = result.rows[0];

    if (!table.is_active) {
      return res.status(400).json({ success: false, message: "This table is currently inactive." });
    }

    return res.json({
      success: true,
      table: {
        id: table.id,
        table_number: table.table_number,
        table_name: table.table_name,
        hotel_id: table.hotel_id,
      },
    });
  } catch (error) {
    logger.error("Validate table QR error:", error);
    return res.status(500).json({ success: false, message: "Failed to validate QR code." });
  }
});

// ─── ANALYTICS: ORDERS PER TABLE ───────────────────────────────────────

router.get("/analytics/orders-per-table", requireAdmin, async (req, res) => {
  try {
    const hotelId = await resolveHotelId(req);
    if (!hotelId || hotelId === -1) {
      return res.status(400).json({ success: false, message: "Hotel context required." });
    }

    const { period = "all" } = req.query;
    let dateFilter = "";
    if (period === "today") dateFilter = " AND DATE(o.created_at) = CURRENT_DATE";
    else if (period === "week") dateFilter = " AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'";
    else if (period === "month") dateFilter = " AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'";

    const result = await db.query(
      `SELECT o.table_number,
              COUNT(*) AS order_count,
              COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END), 0) AS revenue
       FROM public.orders o
       WHERE o.hotel_id = $1${dateFilter}
       GROUP BY o.table_number
       ORDER BY order_count DESC`,
      [hotelId]
    );

    // Map table numbers to names
    const tablesResult = await db.query(
      "SELECT table_number, table_name FROM public.restaurant_tables WHERE hotel_id = $1",
      [hotelId]
    );
    const tableMap = {};
    tablesResult.rows.forEach((t) => {
      tableMap[t.table_number] = t.table_name;
    });

    const enriched = result.rows.map((r) => ({
      table_number: r.table_number,
      table_name: tableMap[r.table_number] || null,
      order_count: parseInt(r.order_count),
      revenue: parseFloat(r.revenue),
    }));

    return res.json({ success: true, analytics: enriched });
  } catch (error) {
    logger.error("Table analytics error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch table analytics." });
  }
});

module.exports = router;
