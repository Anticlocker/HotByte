// backend/middleware/validateHotelHeader.js
// Lightweight middleware: validates x-hotel-slug header format and resolves hotel.
// The full DB query (incl. subscription check) is handled by checkSubscription.js
// which runs after this middleware on applicable routes.
const logger = require('../utils/logger');
module.exports = async (req, res, next) => {
  const hotelSlug = req.headers['x-hotel-slug'];
  if (!hotelSlug) {
    return next();
  }
  try {
    const db = require('../routes/database');
    const { rows } = await db.query(
      'SELECT hotel_id, is_frozen, plan, trial_ends_at FROM public.hotels WHERE slug = $1',
      [hotelSlug]
    );
    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Invalid hotel slug.' });
    }
    req.hotel = { slug: hotelSlug, id: rows[0].hotel_id, _found: true };
    next();
  } catch (err) {
    logger.error('Hotel header validation error:', { message: err.message });
    return res.status(500).json({ success: false, message: 'Server error during hotel validation.' });
  }
};
