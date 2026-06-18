const db = require('../routes/database');

const resolveHotelSlug = async (req) => {
  if (req.admin.role !== 'super_admin') return req.admin.hotelId;
  const slug = req.query.hotel_slug || req.body?.hotel_slug;
  if (!slug) return null;
  const result = await db.query('SELECT hotel_id FROM public.hotels WHERE slug = $1', [slug]);
  if (result.rows.length === 0) return -1;
  return result.rows[0].hotel_id;
};

module.exports = { resolveHotelSlug };
