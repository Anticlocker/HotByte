// ============================================
// 🍽️ RESTAURANT MANAGEMENT SYSTEM - MAIN SERVER FILE
// ============================================
// Ye file main server setup karta hai
// Express.js framework use karta hai

require('dotenv').config({ path: require('path').join(__dirname, '.env') }); // Load env variables first
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const crypto = require('crypto');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const logger = require('./utils/logger'); // Import structured logger

const app = express();

// Request ID middleware for request tracing
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// HTTPS redirect middleware for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Security headers with strict Content-Security-Policy (CSP)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "checkout.razorpay.com", "accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "*.b-cdn.net", "images.unsplash.com", "lh3.googleusercontent.com"],
      connectSrc: ["'self'", "https://api.razorpay.com", "https://accounts.google.com", "https://oauth2.googleapis.com"],
      frameSrc: ["checkout.razorpay.com", "accounts.google.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com"],
    }
  }
}));

// HTTP request logger piped through structured logger
const morganStream = {
  write: (message) => {
    logger.info('HTTP request', { http_log: message.trim() });
  }
};
app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev', { stream: morganStream }));

// ⏰ IST Timezone set karo (India Standard Time)
// Saare timestamps IST me honge
process.env.TZ = 'Asia/Kolkata';

// 🔒 Trust Proxy - Cloud platforms (Railway, Heroku) ke liye zaroori
// Reverse proxy headers (X-Forwarded-For) ko trust karta hai
app.set('trust proxy', 1);

// 🛡️ Security: X-Powered-By header disable karo
// Ye header batata hai backend kis technology me bana hai
// Disable karne se hackers ko kam information milti hai
app.disable('x-powered-by');

// ================= CORS CONFIGURATION =================
// 🌐 CORS = Cross-Origin Resource Sharing
// Ye decide karta hai kaun se domains se API call aa sakti hai
const allowedOriginEnv = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
const allowedOrigins = allowedOriginEnv.split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin header)
    if (!origin) return callback(null, true);
    
    // Check against configured origins, production domains, local loopbacks, and private network IPs
    const isLocalIP = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isAllowed = allowedOrigins.includes(origin) ||
      origin === 'https://www.rav1.in' ||
      origin === 'https://rav1.in' ||
      isLocalIP;
      
    if (isAllowed) {
      callback(null, true);
    } else {
      // ✅ SECURITY FIX: Reject disallowed origins
      logger.warn('CORS blocked request from disallowed origin', { origin });
      callback(new Error(`CORS policy: Origin '${origin}' is not allowed.`));
    }
  },
  credentials: true // Cookies aur authentication headers allow karta hai
}));

// ================= RATE LIMITING =================
// 🚦 Rate Limiting = Ek IP se kitni baar request aa sakti hai limit karta hai
// Spam aur abuse attacks se bachata hai

// 🔑 Admin Login ke liye rate limiting
// 15 minutes me max 10 attempts per IP
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 requests per IP
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 📱 OTP Send endpoints ke liye rate limiting
// Koi bhi IP 15 minutes me sirf 5 baar OTP request kar sakta hai
// Isse OTP spam aur SMS bombing attacks rukti hain
const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes ka window
  max: 5, // Maximum 5 requests per IP
  message: { success: false, message: 'Too many OTP requests. Please try again after 15 minutes.' },
  standardHeaders: true, // Rate limit info headers me bhejta hai
  legacyHeaders: false, // Purane headers disable karta hai
});

// 📱 OTP Verification endpoints ke liye rate limiting
// 5 attempts limits set karta hai user block/timer ke liye
const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes ka window
  max: 5, // Maximum 5 requests per IP
  message: { success: false, message: 'Too many incorrect verification attempts. Please try again after 15 minutes.' },
  standardHeaders: true, // Rate limit info headers me bhejta hai
  legacyHeaders: false, // Purane headers disable karta hai
});

// 💳 Payment endpoints ke liye rate limiting
// 15 minutes me max 10 payment requests per IP
// Payment fraud aur repeated failed attempts rokta hai
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes ka window
  max: 10, // Maximum 10 requests per IP
  message: { success: false, message: 'Too many payment requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔐 Google Login rate limiting — prevent SSO token hammering
const googleLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 Google SSO attempts per IP
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 👤 Guest check-in rate limiting — prevent anonymous identity farming
const guestCheckinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Max 30 guest check-ins per IP
  message: { success: false, message: 'Too many guest check-in attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ================= MIDDLEWARE SETUP =================
// 📦 Middleware = Request aur Response ke beech me kaam karne wale functions

// JSON request body read karne ke liye
// API calls me JSON data parse karta hai
app.use(express.json({ limit: '10mb' })); // Max 10MB JSON data allow

// Form data read karne ke liye
// HTML forms se aaya hua data parse karta hai
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🍪 Cookies read karne ke liye
// User authentication ke liye cookies use hoti hain
// Secret key se cookies ko encrypt karta hai (security ke liye)
app.use(cookieParser(process.env.COOKIE_SECRET));

// ================= SECURITY HEADERS =================
// 🛡️ Security headers browser ko batate hain ki website ko kaise protect karna hai

app.use((req, res, next) => {
  // Clickjacking attack se bachata hai
  // Website ko iframe me open hone se rokta hai
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS (Cross-Site Scripting) attack se bachata hai
  // Browser ka built-in XSS protection enable karta hai
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy: don't leak full URL to third-party domains
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy: disable browser features this app doesn't use
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  next(); // Agle middleware ko call karta hai
});

// 🔄 Cache Control - Logout ke baad back button issue fix karta hai
// Browser ko pages cache nahi karne deta
// Isse logout ke baad back button dabane par protected pages nahi khulte
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ================= STATIC FILES =================
// 📁 Static files = HTML, CSS, JS, images jo directly serve hoti hain
// public folder me rakhi saari files directly accessible hongi
// Example: public/index.html ko /index.html se access kar sakte hain
app.use(express.static('public'));

// ================= MULTI-TENANCY MIDDLEWARE =================
// 🏨 Hotel slug resolution: customer-facing routes pe X-Hotel-Slug header se hotel resolve karta hai
const validateHotelHeader = require('./middleware/validateHotelHeader');
// 🔐 Subscription check: trial expiry auto-freeze + frozen hotel block karta hai
const checkSubscription = require('./middleware/checkSubscription');

// Apply to all public menu and order routes (customer-facing)
app.use('/api/menu', validateHotelHeader, checkSubscription);
app.use('/api/orders', validateHotelHeader, checkSubscription);

// ================= HEALTH CHECK ENDPOINT =================
// ✅ Server running hai ya nahi check karne ke liye
// Cloud platforms aur monitoring tools ye endpoint use karte hain
// Response me server status, time, aur uptime milta hai
app.get('/health', (req, res) => {
  res.json({
    status: 'ok', // Server chal raha hai
    timestamp: new Date().toISOString(), // Current time (ISO format)
    uptime: process.uptime() // Server kitne seconds se chal raha hai
  });
});

// ================= API ROUTES =================
// 🔌 API Routes = Backend endpoints jo frontend se data exchange karte hain

// Rate limiting apply karo specific endpoints pe
app.use('/api/auth/admin/login', adminLoginLimiter); // Admin login limit
app.use('/api/auth/send-otp', sendOtpLimiter); // OTP bhejne ki limit
app.use('/api/auth/verify-otp', verifyOtpLimiter); // OTP verify karne ki limit
app.use('/api/auth/google-login', googleLoginLimiter); // Google SSO login limit
app.use('/api/auth/guest-checkin', guestCheckinLimiter); // Guest check-in limit
app.use('/api/payments', paymentLimiter); // Payment requests ki limit

// Authentication routes (Login, Signup, OTP, Session)
app.use('/api/auth', require('./routes/auth'));

// Customer profile aur orders
app.use('/api/profile', require('./routes/profile'));

// Menu items aur categories (Public access)
app.use('/api/menu', require('./routes/menu'));

// Admin panel routes (Admin authentication required)
app.use('/api/admin', require('./routes/admin'));

// Super Admin panel routes (Super Admin privileges required)
app.use('/api/superadmin', require('./routes/superadmin'));

// Order creation aur management
app.use('/api/orders', require('./routes/orders'));

// Payment gateway integration (Razorpay)
app.use('/api/payments', require('./routes/payments'));

// Sales reports aur statistics (Admin only)
app.use('/api/sales', require('./routes/sales'));

// Customer ratings aur reviews
app.use('/api/ratings', require('./routes/ratings'));

// Resolve short map links (e.g. maps.app.goo.gl) to bypass CORS and extract coordinates
app.get('/api/geocode/resolve-short-url', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: "URL is required" });
    }
    
    // We make a HEAD request and instruct Node fetch not to follow redirects automatically.
    // This allows us to grab the exact "location" header redirect target.
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual'
    });
    
    const resolvedUrl = response.headers.get('location') || url;
    return res.json({ success: true, resolvedUrl });
  } catch (error) {
    logger.error("Resolve short URL redirect error", error);
    return res.status(500).json({ success: false, message: "Failed to resolve map URL redirect." });
  }
});

// Unified Public Config (Obfuscated IDs)
app.get('/api/config/public', (req, res) => {
  res.json({
    onesignal_app_id: Buffer.from("f74b5208-81e8-4fb0-8083-8160a5665021").toString('base64'),
    onesignal_safari_id: Buffer.from("web.onesignal.auto.4ed285de-faf5-4c6c-a346-3ff91e5aded6").toString('base64')
  });
});

// ================= ADDITIONAL HEALTH CHECK ENDPOINTS =================
// 🏥 Monitoring aur load balancers ke liye extra endpoints

// Detailed health check with environment info
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(), // Seconds me uptime
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple ping endpoint - fast response ke liye
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// ================= PAGE ROUTES (CUSTOMER PAGES) =================
// 🌐 CUSTOMER PAGES (निष्क्रिय / DISABLED):
// अब सभी ग्राहक पेजों को Next.js फ़्रंटएंड हैंडल करता है।
// इसलिए बैकएंड के इन HTML फ़ाइलों को सर्व करने वाले रूट्स को पूरी तरह से हटा दिया गया है।

// ================= ADMIN PAGES =================
// 👨‍💼 ADMIN PAGES (निष्क्रिय / DISABLED):
// एडमिन पैनल के सभी पेजों को भी अब Next.js फ़्रंटएंड हैंडल करता है।
// इसलिए बैकएंड के इन HTML फ़ाइलों को सर्व करने वाले रूट्स को पूरी तरह से हटा दिया गया है।

// ================= USER PREFERENCES (i18n Locale Sync) =================
const db = require('./routes/database');
const { verifySession, verifyAdminSession } = require('./routes/auth');

app.post('/api/user/preferences', async (req, res) => {
  try {
    const { locale } = req.body;
    const allowedLocales = ['en', 'hi', 'mr'];

    if (locale && !allowedLocales.includes(locale)) {
      return res.status(400).json({ success: false, message: 'Unsupported locale.' });
    }

    // Try customer session first
    const customerSessionId = req.cookies.sessionId;
    if (customerSessionId) {
      const session = await verifySession(customerSessionId);
      if (session) {
        if (locale) {
          await db.query('UPDATE public.customers SET locale = $1 WHERE customer_id = $2', [locale, session.customerId]);
        }
        return res.json({ success: true, message: 'Preferences updated.' });
      }
    }

    // Try admin session
    const adminSessionId = req.cookies.superAdminSessionId || req.cookies.adminSessionId;
    if (adminSessionId) {
      const session = await verifyAdminSession(adminSessionId, req);
      if (session) {
        if (locale) {
          await db.query('UPDATE public.admins SET locale = $1 WHERE admin_id = $2', [locale, session.adminId]);
        }
        return res.json({ success: true, message: 'Preferences updated.' });
      }
    }

    // No valid session — still return success (guest users save to localStorage only)
    return res.json({ success: true, message: 'Preferences noted (guest).' });
  } catch (error) {
    logger.error('User preferences update error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update preferences.' });
  }
});

// ================= 404 HANDLER =================
// ❌ जब कोई भी API रूट मैच नहीं होगा, तब यह कोड चलेगा।
// चूंकि यह अब एक स्वतंत्र API सर्वर है, इसलिए हम HTML फ़ाइल भेजने के बजाय JSON एरर रिस्पॉन्स भेजते हैं।
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});

// ================= ERROR HANDLER =================
// 🚨 Global error handler - Koi bhi unhandled error yahan aayega
// Production me detailed error message nahi bhejte (security ke liye)
app.use((err, req, res, next) => {
  logger.error('Unhandled server error', err); // Console me error log karo
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ================= SERVER START =================
// 🚀 Server ko start karta hai
// PORT environment variable se port number leta hai
// Agar PORT set nahi hai to default 3000 use karta hai
const port = process.env.PORT || 8000;
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(port, () => {
    logger.info(`Server running on port ${port}`, { port, env: process.env.NODE_ENV || 'development' });
  });
}

// ================= GRACEFUL SHUTDOWN =================
// Handle both SIGTERM (cloud platforms) and SIGINT (Ctrl+C / Docker stop)
const gracefulShutdown = (signal) => {
  logger.warn(`${signal} received. Shutting down gracefully...`, { signal });
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
      // Close database pool
      const pool = require('./routes/database');
      if (pool && typeof pool.end === 'function') {
        pool.end(() => {
          logger.info('Database pool closed.');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
  } else {
    process.exit(0);
  }
  // Force-kill if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timeout. Force killing.');
    process.exit(1);
  }, 10000);
};

if (process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

module.exports = app;

// Trigger nodemon reload for new environment variables
