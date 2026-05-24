// backend/middleware/checkSubscription.js
// Checks if a hotel's trial has expired and auto-freezes it if so.
// Applied to customer-facing routes (/api/menu, /api/orders) that use hotel_slug.

const db = require('../routes/database');

module.exports = async (req, res, next) => {
  // Determine hotel slug from query, body, or header
  const hotelSlug =
    req.query.hotel_slug ||
    req.body?.hotel_slug ||
    req.headers['x-hotel-slug'];

  if (!hotelSlug) {
    return next(); // No hotel context — skip (global routes)
  }

  try {
    const { rows } = await db.query(
      'SELECT hotel_id, is_frozen, plan, trial_ends_at FROM public.hotels WHERE slug = $1',
      [hotelSlug]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Hotel not found.' });
    }

    const hotel = rows[0];

    // Auto-freeze expired trials
    if (hotel.plan === 'trial' && hotel.trial_ends_at && new Date() > new Date(hotel.trial_ends_at) && !hotel.is_frozen) {
      await db.query(
        'UPDATE public.hotels SET is_frozen = TRUE WHERE hotel_id = $1',
        [hotel.hotel_id]
      );
      hotel.is_frozen = true;
      console.log(`⚠️ Auto-froze hotel "${hotelSlug}" — trial expired at ${hotel.trial_ends_at}`);
    }

    if (hotel.is_frozen) {
      return res.status(403).json({
        success: false,
        isFrozen: true,
        plan: hotel.plan,
        trialEndsAt: hotel.trial_ends_at,
        message: hotel.plan === 'trial'
          ? 'Your free trial has expired. Please upgrade to continue using HotByte.'
          : 'This hotel account is frozen. Please contact HotByte support.'
      });
    }

    // Attach hotel context to request for downstream use
    req.hotel = { slug: hotelSlug, id: hotel.hotel_id, plan: hotel.plan };
    next();
  } catch (err) {
    console.error('Subscription check middleware error:', err);
    return res.status(500).json({ success: false, message: 'Server error during subscription validation.' });
  }
};
