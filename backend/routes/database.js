// Database Connection Pool - PostgreSQL
const { Pool } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

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
        // ─── Schema Migrations (hotels, admins, customers) ───────────────────
            const migrations = [
                // hotels table
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT TRUE;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS logo_url TEXT;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS banner_url TEXT;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS description TEXT;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS email VARCHAR(100);",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS tagline VARCHAR(200) DEFAULT 'Served with Love ❤️';",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS show_logo BOOLEAN DEFAULT TRUE;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS show_banner BOOLEAN DEFAULT TRUE;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS primary_color VARCHAR(30) DEFAULT '#FF5A1F';",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(30) DEFAULT '#FF5A1F';",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS enable_online_orders BOOLEAN DEFAULT TRUE;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS enable_qr_ordering BOOLEAN DEFAULT TRUE;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS settings_json JSONB DEFAULT '{}'::jsonb;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'trial';",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS table_count INTEGER DEFAULT 5;",
                // hotel location & geofence
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS order_radius INTEGER DEFAULT 30;",
                // admins table
                "ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS phone VARCHAR(15) UNIQUE;",
                // customers, menu_category, menu_items
                "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS hotel_id INTEGER REFERENCES public.hotels(hotel_id) ON DELETE CASCADE;",
                "ALTER TABLE public.menu_category ADD COLUMN IF NOT EXISTS hotel_id INTEGER REFERENCES public.hotels(hotel_id) ON DELETE CASCADE;",
                "ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS hotel_id INTEGER REFERENCES public.hotels(hotel_id) ON DELETE CASCADE;",
            ];
            for (const sql of migrations) {
                await client.query(sql);
            }
            // Backfill trial_ends_at
            await client.query("UPDATE public.hotels SET trial_ends_at = created_at + INTERVAL '14 days' WHERE trial_ends_at IS NULL AND plan = 'trial';");
            console.log("✅ Database: Schema up to date");

            // Legacy customer backfill
            const hotelRes = await client.query("SELECT hotel_id FROM public.hotels LIMIT 1;");
            if (hotelRes.rows.length > 0) {
                const defaultHotelId = hotelRes.rows[0].hotel_id;
                await client.query("UPDATE public.customers SET hotel_id = $1 WHERE hotel_id IS NULL;", [defaultHotelId]);
            }

            // ─── Sync sequences ───────────────────────────────────────────────
            const tablesToSync = [
                { name: 'public.hotels', pk: 'hotel_id' },
                { name: 'public.admins', pk: 'admin_id' },
                { name: 'public.customers', pk: 'customer_id' },
                { name: 'public.menu_category', pk: 'category_id' },
                { name: 'public.menu_items', pk: 'item_id' },
                { name: 'public.orders', pk: 'order_id' },
                { name: 'public.order_items', pk: 'order_item_id' },
                { name: 'public.payments', pk: 'payment_id' },
                { name: 'public.ratings', pk: 'rating_id' }
            ];
            for (const table of tablesToSync) {
                try {
                    await client.query(`
                        SELECT setval(
                            pg_get_serial_sequence('${table.name}', '${table.pk}'),
                            COALESCE((SELECT MAX(${table.pk}) FROM ${table.name}), 1)
                        );
                    `);
                } catch (seqErr) {
                    console.warn(`⚠️  Sequence sync skipped for ${table.name}: ${seqErr.message}`);
                }
            }
            console.log("✅ Database: Sequences synchronized");

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
