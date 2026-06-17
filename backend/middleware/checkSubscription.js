const db = require('../routes/database');
const logger = require('../utils/logger');

module.exports = async (req, res, next) => {
  const hotelSlug =
    req.query.hotel_slug ||
    req.body?.hotel_slug ||
    req.headers['x-hotel-slug'];

  if (!hotelSlug) {
    return next();
  }

  try {
    const { rows } = await db.query(
      `SELECT h.hotel_id, h.is_frozen, h.plan, h.trial_ends_at,
              s.expiry_date AS subscription_expiry_date, s.status AS subscription_status
       FROM public.hotels h
       LEFT JOIN public.subscriptions s ON s.hotel_id = h.hotel_id AND s.status = 'active'
       WHERE h.slug = $1`,
      [hotelSlug]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Hotel not found.' });
    }

    const hotel = rows[0];
    const now = new Date();
    let expired = false;
    let expiryReason = null;
    let expiryDate = null;

    // Check trial expiry
    if (hotel.plan === 'trial' && hotel.trial_ends_at) {
      const trialEnd = new Date(hotel.trial_ends_at);
      if (now > trialEnd) {
        expired = true;
        expiryReason = 'trial';
        expiryDate = trialEnd;
      }
    }

    // Check subscription expiry (for non-trial plans)
    if (!expired && hotel.plan !== 'trial' && hotel.subscription_expiry_date) {
      const subEnd = new Date(hotel.subscription_expiry_date);
      if (now > subEnd) {
        expired = true;
        expiryReason = 'subscription';
        expiryDate = subEnd;
      }
    }

    // Auto-freeze if expired and not already frozen
    if (expired && !hotel.is_frozen) {
      await db.query(
        'UPDATE public.hotels SET is_frozen = TRUE WHERE hotel_id = $1',
        [hotel.hotel_id]
      );
      hotel.is_frozen = true;
      logger.warn(`Auto-froze hotel "${hotelSlug}" — ${expiryReason} expired at ${expiryDate}`);
    }

    // Check grace period
    let daysSinceExpiry = 0;
    let gracePeriodRemaining = null;
    if (expired && expiryDate) {
      daysSinceExpiry = Math.floor((now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));
      const settingsRows = await db.query(
        "SELECT value FROM public.super_admin_settings WHERE key = 'grace_period_days'"
      );
      const graceDays = settingsRows.rows.length > 0 ? parseInt(settingsRows.rows[0].value) : 0;
      if (graceDays > 0) {
        gracePeriodRemaining = Math.max(0, graceDays - daysSinceExpiry);
      }
    }

    if (hotel.is_frozen) {
      return res.status(403).json({
        success: false,
        isFrozen: true,
        plan: hotel.plan,
        trialEndsAt: hotel.trial_ends_at,
        subscriptionExpiryDate: hotel.subscription_expiry_date,
        expired: true,
        expiryReason: expiryReason || (hotel.plan === 'trial' ? 'trial' : 'subscription'),
        daysSinceExpiry,
        gracePeriodRemaining,
        message: hotel.plan === 'trial'
          ? 'Your free trial has expired. Please upgrade to continue using HotByte.'
          : 'Your subscription has expired. Please renew to continue using HotByte.'
      });
    }

    // Days until expiry for notification
    let daysUntilExpiry = null;
    if (hotel.plan === 'trial' && hotel.trial_ends_at) {
      daysUntilExpiry = Math.ceil((new Date(hotel.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else if (hotel.plan !== 'trial' && hotel.subscription_expiry_date) {
      daysUntilExpiry = Math.ceil((new Date(hotel.subscription_expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    req.hotel = {
      slug: hotelSlug,
      id: hotel.hotel_id,
      plan: hotel.plan,
      daysUntilExpiry: daysUntilExpiry !== null && daysUntilExpiry > 0 ? daysUntilExpiry : null
    };
    next();
  } catch (err) {
    logger.error('Subscription check middleware error:', err);
    return res.status(500).json({ success: false, message: 'Server error during subscription validation.' });
  }
};
