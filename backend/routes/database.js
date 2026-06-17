// Database Connection Pool - PostgreSQL
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const logger = require("../utils/logger");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

// Set timezone to IST
process.env.TZ = 'Asia/Kolkata';

// Create connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false'
        ? false
        : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
});

// Test initial connection
pool.connect(async (err, client, release) => {
    if (err) {
        logger.error("Database connection error:", { message: err.message });
        if (process.env.NODE_ENV === 'production') {
            logger.error("FATAL: Cannot connect to database in production");
            process.exit(1);
        }
    } else {
        logger.info("Connected to PostgreSQL Database");
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
                "ALTER TABLE public.payment_sessions ADD COLUMN IF NOT EXISTS hotel_name VARCHAR(200);",
                "ALTER TABLE public.payment_sessions ADD COLUMN IF NOT EXISTS hotel_slug VARCHAR(100);",
                "ALTER TABLE public.payment_sessions ADD COLUMN IF NOT EXISTS hotel_phone VARCHAR(20);",
                "ALTER TABLE public.payment_sessions ADD COLUMN IF NOT EXISTS hotel_address TEXT;",
                "ALTER TABLE public.payment_sessions ADD COLUMN IF NOT EXISTS admin_name VARCHAR(100);",
                "ALTER TABLE public.payment_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '2 hours');",
                // Customer Auth Controls settings & logging
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS require_customer_auth BOOLEAN DEFAULT FALSE;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS customer_auth_required BOOLEAN DEFAULT FALSE;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS suspicious_activity_mode BOOLEAN DEFAULT FALSE;",
                "ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS location_ordering_enabled BOOLEAN DEFAULT TRUE;",
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
                END $$;`,
                `CREATE TABLE IF NOT EXISTS public.menu_item_variants (
                    id SERIAL PRIMARY KEY,
                    menu_item_id INTEGER REFERENCES public.menu_items(item_id) ON DELETE CASCADE,
                    variant_name VARCHAR(100) NOT NULL,
                    price NUMERIC(10, 2) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,
                `CREATE INDEX IF NOT EXISTS idx_menu_item_variants_item_id ON public.menu_item_variants(menu_item_id);`,
                `ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id INTEGER REFERENCES public.menu_item_variants(id) ON DELETE SET NULL;`,
                `ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_name VARCHAR(100);`,
                // restaurant_tables table for table-wise QR ordering
                `CREATE TABLE IF NOT EXISTS public.restaurant_tables (
                    id SERIAL PRIMARY KEY,
                    hotel_id INTEGER NOT NULL REFERENCES public.hotels(hotel_id) ON DELETE CASCADE,
                    table_number VARCHAR(20) NOT NULL,
                    table_name VARCHAR(100),
                    capacity INTEGER DEFAULT 2,
                    qr_slug VARCHAR(64) NOT NULL UNIQUE,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT unique_table_per_hotel UNIQUE (hotel_id, table_number)
                );`,
                `CREATE INDEX IF NOT EXISTS idx_restaurant_tables_hotel ON public.restaurant_tables(hotel_id);`,
                `CREATE INDEX IF NOT EXISTS idx_restaurant_tables_qr_slug ON public.restaurant_tables(qr_slug);`,
                // super_admin_settings table for global platform config
                `CREATE TABLE IF NOT EXISTS public.super_admin_settings (
                    key VARCHAR(100) PRIMARY KEY,
                    value TEXT NOT NULL,
                    description TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,
                // Insert default grace period setting (0 = no grace period)
                `INSERT INTO public.super_admin_settings (key, value, description) 
                 VALUES ('grace_period_days', '0', 'Grace period in days after subscription/trial expiry before freezing')
                 ON CONFLICT (key) DO NOTHING;`,
                // expiry_history table for tracking all expiry events
                `CREATE TABLE IF NOT EXISTS public.expiry_history (
                    id SERIAL PRIMARY KEY,
                    hotel_id INTEGER NOT NULL REFERENCES public.hotels(hotel_id) ON DELETE CASCADE,
                    event_type VARCHAR(50) NOT NULL,
                    previous_plan VARCHAR(20),
                    new_plan VARCHAR(20),
                    previous_expiry TIMESTAMP,
                    new_expiry TIMESTAMP,
                    triggered_by VARCHAR(50) DEFAULT 'system',
                    admin_id INTEGER REFERENCES public.admins(admin_id) ON DELETE SET NULL,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,
                `CREATE INDEX IF NOT EXISTS idx_expiry_history_hotel ON public.expiry_history(hotel_id);`,
                `CREATE INDEX IF NOT EXISTS idx_expiry_history_created ON public.expiry_history(created_at);`,
                // hotels grace period tracking
                `ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP;`,
                // subscription auto-renewal flag
                `ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE;`,
                // plan changed_at tracking
                `ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS plan_changed_at TIMESTAMP;`,
                // Hotel-specific QR payment fields (renamed for clarity)
                `ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS payment_qr_url TEXT;`,
                `ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS payment_instructions TEXT;`,
                // subscription_expiry_date on hotels (read by menu.js, auth.js)
                `ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS subscription_expiry_date TIMESTAMP;`,
                // is_order_accept on admins for manual order toggle
                `ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS is_order_accept BOOLEAN DEFAULT true;`,
                // Missing indexes for performance
                `CREATE INDEX IF NOT EXISTS idx_subscriptions_hotel_id ON public.subscriptions(hotel_id);`,
                `CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);`,
                `CREATE INDEX IF NOT EXISTS idx_sessions_admin_id ON public.sessions(admin_id);`,
                `CREATE INDEX IF NOT EXISTS idx_auth_logs_hotel_id ON public.auth_logs(hotel_id);`,
                `CREATE INDEX IF NOT EXISTS idx_auth_logs_admin_id ON public.auth_logs(admin_id);`,
                // OTP store table (DB-backed, replaces in-memory Map)
                `CREATE TABLE IF NOT EXISTS public.otp_store (
                    id SERIAL PRIMARY KEY,
                    otp_key VARCHAR(255) UNIQUE NOT NULL,
                    data JSONB NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`,
                `CREATE INDEX IF NOT EXISTS idx_otp_store_key ON public.otp_store(otp_key);`,
                `CREATE INDEX IF NOT EXISTS idx_otp_store_expires ON public.otp_store(expires_at);`,
                // NOT NULL constraints on critical FK columns
                `ALTER TABLE public.order_items ALTER COLUMN order_id SET NOT NULL;`,
                `ALTER TABLE public.payments ALTER COLUMN order_id SET NOT NULL;`,
                `ALTER TABLE public.orders ALTER COLUMN customer_id SET NOT NULL;`,
                // Add hotel_id to ratings table for multi-tenant isolation
                `ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS hotel_id INTEGER REFERENCES public.hotels(hotel_id) ON DELETE CASCADE;`,
                `CREATE INDEX IF NOT EXISTS idx_ratings_hotel_id ON public.ratings(hotel_id);`,
                // Table-based UPI payment reference system
                `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100);`,
                `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_display_id VARCHAR(20);`,
                `ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(200);`,
                `CREATE INDEX IF NOT EXISTS idx_orders_order_display_id ON public.orders(order_display_id);`,
                `CREATE INDEX IF NOT EXISTS idx_payments_payment_reference ON public.payments(payment_reference);`
            ];
            for (const sql of migrations) {
                await client.query(sql);
            }
            // Cleanup expired payment sessions (older than 24 hours and still pending)
            await client.query("DELETE FROM public.payment_sessions WHERE created_at < NOW() - INTERVAL '24 hours' AND status IN ('pending', 'pending_payment');");
            console.log("✅ Database: Expired payment sessions cleaned up.");
            // Seed subscription plans if empty
            const plansCount = await client.query("SELECT COUNT(*) FROM public.subscription_plans;");
            if (parseInt(plansCount.rows[0].count) === 0) {
                await client.query(`
                    INSERT INTO public.subscription_plans (name, price_monthly, price_yearly, features) VALUES
                    ('trial', 1, 1, '{"QR Menu System":"5 Tables","Digital Menu Card":true,"Online Ordering":"Basic","Table QR Codes":"5 Tables","Menu Items":"Up to 30","Categories":"Up to 5","Email Support":true}'),
                    ('basic', 999, 11988, '{"QR Menu System":"Unlimited Tables","Digital Menu Card":true,"Online Ordering":"Full","Dynamic QR per Table":true,"Menu Items":"Unlimited","Categories":"Unlimited","Razorpay Payments":true,"Kitchen Display System":true,"PDF Reports & Invoices":true,"Admin Managers":"Up to 3","Customer Auth":true,"Analytics Dashboard":true}'),
                    ('pro', 2499, 29988, '{"QR Menu System":"Unlimited Tables","Digital Menu Card":true,"Online Ordering":"Full","Dynamic QR per Table":true,"Menu Items":"Unlimited","Categories":"Unlimited","Razorpay Payments":true,"Kitchen Display System":true,"PDF Reports & Invoices":true,"Admin Managers":"Unlimited","Customer Auth":true,"Analytics Dashboard":"Advanced","Occupancy Tracking":true,"24/7 Priority Support":true,"AI Menu Assistant":true,"Multi-Branch Support":true,"Custom Branding":true,"Dedicated Account Manager":true,"Priority Feature Access":true}');
                `);
                console.log("✅ Database: Seeded default subscription plans");
            } else {
                // Backfill/upgrade existing trial plan price and features in database
                await client.query(`
                    UPDATE public.subscription_plans 
                    SET price_monthly = 1, 
                        price_yearly = 1, 
                        features = '{"QR Menu System":"5 Tables","Digital Menu Card":true,"Online Ordering":"Basic","Table QR Codes":"5 Tables","Menu Items":"Up to 30","Categories":"Up to 5","Email Support":true}' 
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

            // Backfill hotel_id for existing ratings via menu_items or orders join
            await client.query(`
                UPDATE public.ratings r
                SET hotel_id = COALESCE(
                    (SELECT mi.hotel_id FROM public.menu_items mi WHERE mi.item_id = r.item_id LIMIT 1),
                    (SELECT o.hotel_id FROM public.orders o WHERE o.order_id = r.order_id LIMIT 1)
                )
                WHERE r.hotel_id IS NULL;
            `);

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
                { name: 'public.ratings', pk: 'rating_id' },
                { name: 'public.restaurant_tables', pk: 'id' }
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
                    logger.warn(`Sequence sync skipped for ${table.name}: ${seqErr.message}`);
                }
            }
            logger.info("Database: Sequences synchronized");
        } catch (schemaErr) {
            logger.error("Database schema migration failed:", { message: schemaErr.message });
        } finally {
            release();
        }
    }
});

// Handle unexpected errors
pool.on('error', (err) => {
    logger.error('Unexpected database error:', { message: err.message });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    pool.end(() => {
        logger.info('Database pool closed gracefully');
    });
});

module.exports = pool;
