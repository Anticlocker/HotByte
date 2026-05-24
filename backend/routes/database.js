// Database Connection Pool - PostgreSQL
const { Pool } = require("pg");
require("dotenv").config();

// Set timezone to IST
process.env.TZ = 'Asia/Kolkata';

// Production safety check
if (!process.env.DB_PASSWORD && process.env.NODE_ENV === 'production') {
    console.error("❌ FATAL: DB_PASSWORD must be set in production environment");
    process.exit(1);
}

// Create connection pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME || "hotbyte",
    password: process.env.DB_PASSWORD || "1234",
    port: parseInt(process.env.DB_PORT) || 5432,
    max: 30,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    options: '-c timezone=Asia/Kolkata'
});

// Test initial connection
pool.connect(async (err, client, release) => {
    if (err) {
        console.error("❌ Database connection error:", err.message);
        if (process.env.NODE_ENV === 'production') {
            console.error("❌ FATAL: Cannot connect to database in production");
            process.exit(1);
        }
    } else {
        console.log("✅ Connected to PostgreSQL Database");
        try {
            // 🥶 Check/Alters column to add is_frozen to public.hotels
            await client.query("ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;");
            console.log("✅ Database: Verified is_frozen column exists in hotels table");

            // 📦 Subscription plan column ('trial' | 'basic' | 'pro')
            await client.query("ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'trial';");
            console.log("✅ Database: Verified plan column exists in hotels table");

            // ⏰ Trial expiry timestamp (14 days from creation by default)
            await client.query("ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;");
            // Backfill trial_ends_at for hotels that don't have it
            await client.query("UPDATE public.hotels SET trial_ends_at = created_at + INTERVAL '14 days' WHERE trial_ends_at IS NULL AND plan = 'trial';");
            console.log("✅ Database: Verified trial_ends_at column exists in hotels table");

            // 🪑 Per-hotel configurable table count
            await client.query("ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS table_count INTEGER DEFAULT 5;");
            console.log("✅ Database: Verified table_count column exists in hotels table");

            // 📱 Check/Alters column to add phone to public.admins
            await client.query("ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS phone VARCHAR(15) UNIQUE;");
            console.log("✅ Database: Verified phone column exists in admins table");

            // 👥 Check/Alters column to add hotel_id to public.customers
            await client.query("ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS hotel_id INTEGER REFERENCES public.hotels(hotel_id) ON DELETE CASCADE;");
            console.log("✅ Database: Verified hotel_id column exists in customers table");

            // Safe backfill: associate any legacy customers without hotel_id to the first active hotel
            const hotelRes = await client.query("SELECT hotel_id FROM public.hotels LIMIT 1;");
            if (hotelRes.rows.length > 0) {
                const defaultHotelId = hotelRes.rows[0].hotel_id;
                await client.query("UPDATE public.customers SET hotel_id = $1 WHERE hotel_id IS NULL;", [defaultHotelId]);
                console.log(`✅ Database: Legacy customers safely mapped to hotel ID ${defaultHotelId}`);
            }

            // 🔑 Ensure super admin Admin exists with phone 9356918260 and role super_admin
            // We rename 'ravi' to 'Admin' first if it exists to avoid unique constraint violations
            await client.query("UPDATE public.admins SET username = 'Admin' WHERE username = 'ravi';");

            const adminCheck = await client.query("SELECT * FROM public.admins WHERE username = 'Admin';");
            if (adminCheck.rows.length === 0) {
                await client.query(
                    "INSERT INTO public.admins (username, password, name, email, role, phone) VALUES ('Admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Super Admin', 'admin@HotByte.in', 'super_admin', '9356918260');"
                );
                console.log("✅ Database: Created default Super Admin 'Admin'");
            } else {
                await client.query(
                    "UPDATE public.admins SET role = 'super_admin', phone = '9356918260' WHERE username = 'Admin';"
                );
                console.log("✅ Database: Seeded/Updated 'Admin' phone and role");
            }
        } catch (schemaErr) {
            console.error("❌ Database schema migration failed:", schemaErr.message);
        } finally {
            release();
        }
    }
});

// Handle unexpected errors
pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    pool.end(() => {
        console.log('✅ Database pool closed gracefully');
    });
});

module.exports = pool;
