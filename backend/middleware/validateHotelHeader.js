// backend/middleware/validateHotelHeader.js
module.exports = async (req, res, next) => {
  const hotelSlug = req.headers['x-hotel-slug'];
  if (!hotelSlug) {
    // No hotel header; proceed (some routes may be global like super-admin)
    return next();
  }
  try {
    const { rows } = await require('../routes/database').query(
      'SELECT hotel_id FROM public.hotels WHERE slug = $1',
      [hotelSlug]
    );
    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Invalid hotel slug.' });
    }
    req.hotel = { slug: hotelSlug, id: rows[0].hotel_id };
    next();
  } catch (err) {
    console.error('Hotel header validation error:', err);
    return res.status(500).json({ success: false, message: 'Server error during hotel validation.' });
  }
};
