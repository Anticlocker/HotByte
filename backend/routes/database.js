// Database Connection Pool - PostgreSQL
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

// Set timezone to IST
process.env.TZ = 'Asia/Kolkata';

// Create connection pool
const isLocal = process.env.DATABASE_URL && (process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1"));

const poolConfig = {
    connectionString: process.env.DATABASE_URL
};

if (!isLocal) {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

const pool = new Pool(poolConfig);


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
                // subscription_plans table
                `CREATE TABLE IF NOT EXISTS public.subscription_plans (
                    plan_id serial NOT NULL,
                    name character varying(100) NOT NULL,
                    price_monthly numeric(10,2) NOT NULL,
                    price_yearly numeric(10,2),
                    features text,
                    trial_days integer DEFAULT 14,
                    CONSTRAINT subscription_plans_pkey PRIMARY KEY (plan_id)
                );`,
                // subscriptions table
                `CREATE TABLE IF NOT EXISTS public.subscriptions (
                    subscription_id serial NOT NULL,
                    hotel_id integer NOT NULL,
                    plan_id integer NOT NULL,
                    start_date date NOT NULL DEFAULT CURRENT_DATE,
                    expiry_date date,
                    status varchar(20) NOT NULL DEFAULT 'active',
                    CONSTRAINT subscriptions_pkey PRIMARY KEY (subscription_id),
                    CONSTRAINT fk_subscriptions_hotel FOREIGN KEY (hotel_id) REFERENCES public.hotels (hotel_id) ON DELETE CASCADE,
                    CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES public.subscription_plans (plan_id) ON DELETE RESTRICT
                );`,
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
                // hotel type configuration
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS hotel_type VARCHAR(10) DEFAULT 'both';",
                `DO $$
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'hotels_hotel_type_check' 
                    AND conrelid = 'public.hotels'::regclass
                  ) THEN
                    ALTER TABLE public.hotels
                      ADD CONSTRAINT hotels_hotel_type_check 
                      CHECK (hotel_type IN ('veg', 'nonveg', 'both'));
                  END IF;
                END $$;`,
                // admins table
                "ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS phone VARCHAR(15) UNIQUE;",
                "ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en';",
                // customers, menu_category, menu_items
                "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS hotel_id INTEGER REFERENCES public.hotels(hotel_id) ON DELETE CASCADE;",
                "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email VARCHAR(100);",
                "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);",
                "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS avatar_url TEXT;",
                "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en';",
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email_hotel ON public.customers (email, hotel_id);",
                "ALTER TABLE public.menu_category ADD COLUMN IF NOT EXISTS hotel_id INTEGER REFERENCES public.hotels(hotel_id) ON DELETE CASCADE;",
                "ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS hotel_id INTEGER REFERENCES public.hotels(hotel_id) ON DELETE CASCADE;",
                // payment_sessions table
                `CREATE TABLE IF NOT EXISTS public.payment_sessions (
                    session_token VARCHAR(255) PRIMARY KEY,
                    razorpay_order_id VARCHAR(200) UNIQUE,
                    razorpay_payment_id VARCHAR(200) UNIQUE,
                    plan VARCHAR(50) NOT NULL,
                    billing_cycle VARCHAR(50) NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,
                // Add columns to payment_sessions for onboarding credentials
                "ALTER TABLE public.payment_sessions ADD COLUMN IF NOT EXISTS username VARCHAR(50);",
                "ALTER TABLE public.payment_sessions ADD COLUMN IF NOT EXISTS email VARCHAR(100);",
                "ALTER TABLE public.payment_sessions ADD COLUMN IF NOT EXISTS password VARCHAR(200);",
                "ALTER TABLE public.payment_sessions ADD COLUMN IF NOT EXISTS name VARCHAR(100);",
                // Customer Auth Controls settings & logging
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS require_customer_auth BOOLEAN DEFAULT FALSE;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS customer_auth_required BOOLEAN DEFAULT FALSE;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS suspicious_activity_mode BOOLEAN DEFAULT FALSE;",
                // Additional Payment & QR Configurations (Priority 7)
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS merchant_name VARCHAR(200);",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS qr_code_url TEXT;",
                `CREATE TABLE IF NOT EXISTS public.auth_logs (
                     id serial PRIMARY KEY,
                     hotel_id integer REFERENCES public.hotels(hotel_id) ON DELETE CASCADE,
                     admin_id integer REFERENCES public.admins(admin_id) ON DELETE SET NULL,
                     admin_username varchar(50) NOT NULL,
                     admin_role varchar(20) NOT NULL,
                     action varchar(50) NOT NULL,
                     note text,
                     created_at timestamp DEFAULT CURRENT_TIMESTAMP
                 );`,
                `CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON public.sessions (session_id);`,
                `CREATE INDEX IF NOT EXISTS idx_orders_hotel_status ON public.orders (hotel_id, status);`,
                `DO $$
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'ratings_rating_value_check' 
                    AND conrelid = 'public.ratings'::regclass
                  ) THEN
                    ALTER TABLE public.ratings
                      ADD CONSTRAINT ratings_rating_value_check 
                      CHECK (rating_value BETWEEN 1 AND 5);
                  END IF;
                END $$;`
            ];
            for (const sql of migrations) {
                await client.query(sql);
            }
            // Cleanup expired payment sessions (older than 24 hours and still pending)
            await client.query("DELETE FROM public.payment_sessions WHERE created_at < NOW() - INTERVAL '24 hours' AND status = 'pending_payment';");
            console.log("✅ Database: Expired payment sessions cleaned up.");
            // Seed subscription plans if empty
            const plansCount = await client.query("SELECT COUNT(*) FROM public.subscription_plans;");
            if (parseInt(plansCount.rows[0].count) === 0) {
                await client.query(`
                    INSERT INTO public.subscription_plans (name, price_monthly, price_yearly, features) VALUES
                    ('trial', 1, 1, '{"all_basic":true,"unlimited_staff":true,"advanced_analytics":true,"occupancy_tracking":true,"priority_support":true,"menu_assistant":true,"is_trial_pro":true}'),
                    ('basic', 999, 11988, '{"menu_items":"unlimited","admin_managers":3,"razorpay":true,"kds":true,"dynamic_qr":true,"pdf_reports":true}'),
                    ('pro', 2499, 29988, '{"all_basic":true,"unlimited_staff":true,"advanced_analytics":true,"occupancy_tracking":true,"priority_support":true,"menu_assistant":true}');
                `);
                console.log("✅ Database: Seeded default subscription plans");
            } else {
                // Backfill/upgrade existing trial plan price and features in database
                await client.query(`
                    UPDATE public.subscription_plans 
                    SET price_monthly = 1, 
                        price_yearly = 1, 
                        features = '{"all_basic":true,"unlimited_staff":true,"advanced_analytics":true,"occupancy_tracking":true,"priority_support":true,"menu_assistant":true,"is_trial_pro":true}' 
                    WHERE name = 'trial';
                `);
                console.log("✅ Database: Upgraded existing Trial plan price to ₹1 and loaded Pro features");
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
