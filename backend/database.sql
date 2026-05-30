-- ============================================================
-- HotByte - Complete Database Schema
-- ============================================================
-- IMPORTANT: Run this script on a fresh PostgreSQL database.
-- All tables are created with IF NOT EXISTS so it is safe to
-- run on an existing database (it will not drop existing data).
-- ============================================================

BEGIN;

-- ============================================================
-- 1. HOTELS (must be created first — other tables FK to it)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hotels (
    hotel_id        serial PRIMARY KEY,
    name            varchar(200) NOT NULL,
    slug            varchar(100) UNIQUE NOT NULL,
    phone           varchar(20),
    email           varchar(100),
    address         text,
    tagline         varchar(300),
    description     text,
    logo_url        text,
    banner_url      text,
    plan            varchar(20)  DEFAULT 'trial',
    trial_ends_at   timestamp,
    is_frozen       boolean      DEFAULT false,
    is_open         boolean      DEFAULT true,
    is_order_accept boolean      DEFAULT true,
    table_count     integer      DEFAULT 5,
    latitude        numeric(10,8),
    longitude       numeric(11,8),
    order_radius    integer      DEFAULT 30,
    primary_color   varchar(20)  DEFAULT '#FF5A1F',
    secondary_color varchar(20)  DEFAULT '#FF5A1F',
    show_logo       boolean      DEFAULT true,
    show_banner     boolean      DEFAULT true,
    enable_online_orders  boolean DEFAULT true,
    enable_qr_ordering    boolean DEFAULT true,
    settings_json   jsonb        DEFAULT '{}',
    created_at      timestamp    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hotels_slug ON public.hotels(slug);

-- ============================================================
-- 2. ADMINS (hotel_id FK to hotels; role = 'admin' | 'super_admin')
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admins
(
    admin_id   serial      NOT NULL,
    username   varchar(50) NOT NULL,
    password   varchar(200) NOT NULL,
    name       varchar(100),
    email      varchar(100),
    phone      varchar(20),
    hotel_id   integer REFERENCES public.hotels(hotel_id) ON DELETE SET NULL,
    role       varchar(20)  DEFAULT 'admin',
    created_at timestamp    DEFAULT CURRENT_TIMESTAMP,
    is_order_accept boolean DEFAULT true,
    CONSTRAINT admins_pkey PRIMARY KEY (admin_id),
    CONSTRAINT admins_email_key UNIQUE (email),
    CONSTRAINT admins_username_key UNIQUE (username)
);

CREATE INDEX IF NOT EXISTS idx_admins_hotel_id ON public.admins(hotel_id);

CREATE TABLE IF NOT EXISTS public.customers
(
    customer_id serial NOT NULL,
    name character varying(100) COLLATE pg_catalog."default",
    phone character varying(15) COLLATE pg_catalog."default",
    email character varying(100) COLLATE pg_catalog."default",
    google_id character varying(100) COLLATE pg_catalog."default",
    hotel_id integer REFERENCES public.hotels(hotel_id) ON DELETE SET NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    dob date,
    CONSTRAINT customers_pkey PRIMARY KEY (customer_id)
);

CREATE INDEX IF NOT EXISTS idx_customers_hotel_id ON public.customers(hotel_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

CREATE TABLE IF NOT EXISTS public.menu_category
(
    category_id serial NOT NULL,
    category_name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    hotel_id integer REFERENCES public.hotels(hotel_id) ON DELETE CASCADE,
    CONSTRAINT menu_category_pkey PRIMARY KEY (category_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_category_hotel_id ON public.menu_category(hotel_id);

CREATE TABLE IF NOT EXISTS public.menu_items
(
    item_id serial NOT NULL,
    item_name character varying(150) COLLATE pg_catalog."default" NOT NULL,
    category_id integer,
    price numeric(10, 2) NOT NULL,
    image_url text COLLATE pg_catalog."default",
    description text COLLATE pg_catalog."default",
    is_available boolean DEFAULT true,
    is_veg boolean DEFAULT true,
    hotel_id integer REFERENCES public.hotels(hotel_id) ON DELETE CASCADE,
    CONSTRAINT menu_items_pkey PRIMARY KEY (item_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_items_hotel_id ON public.menu_items(hotel_id);

CREATE TABLE IF NOT EXISTS public.order_items
(
    order_item_id serial NOT NULL,
    order_id integer,
    item_id integer,
    quantity integer NOT NULL,
    price numeric(10, 2) NOT NULL,
    CONSTRAINT order_items_pkey PRIMARY KEY (order_item_id)
);

CREATE TABLE IF NOT EXISTS public.orders
(
    order_id serial NOT NULL,
    customer_id integer,
    table_number character varying(20) COLLATE pg_catalog."default" NOT NULL,
    total_amount numeric(10, 2) DEFAULT 0,
    status character varying(20) COLLATE pg_catalog."default" DEFAULT 'pending'::character varying,
    hotel_id integer REFERENCES public.hotels(hotel_id) ON DELETE CASCADE,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT orders_pkey PRIMARY KEY (order_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_hotel_id ON public.orders(hotel_id);

CREATE TABLE IF NOT EXISTS public.payments
(
    payment_id serial NOT NULL,
    order_id integer,
    amount numeric(10, 2),
    payment_status character varying(20) COLLATE pg_catalog."default",
    payment_method character varying(50) COLLATE pg_catalog."default",
    razorpay_payment_id character varying(200) COLLATE pg_catalog."default" UNIQUE,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payments_pkey PRIMARY KEY (payment_id)
);

-- Payment Sessions Table for Onboarding Flow
CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id serial PRIMARY KEY,
  session_token varchar(64) UNIQUE NOT NULL,
  razorpay_order_id varchar(100),
  razorpay_payment_id varchar(100),
  plan varchar(20) NOT NULL,
  billing_cycle varchar(10) DEFAULT 'monthly',
  status varchar(30) DEFAULT 'pending_payment',
  username varchar(50),
  email varchar(100),
  password varchar(200),
  hotel_name varchar(200),
  hotel_slug varchar(100),
  hotel_phone varchar(20),
  hotel_address text,
  admin_name varchar(100),
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamp DEFAULT (CURRENT_TIMESTAMP + INTERVAL '2 hours')
);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_token ON public.payment_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_email ON public.payment_sessions(email);

CREATE TABLE IF NOT EXISTS public.ratings
(
    rating_id serial NOT NULL,
    customer_id integer NOT NULL,
    rating_value integer NOT NULL,
    review_text text COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    item_id integer,
    order_id integer,
    CONSTRAINT ratings_pkey PRIMARY KEY (rating_id),
    CONSTRAINT unique_customer_item_rating UNIQUE (customer_id, item_id),
    CONSTRAINT unique_customer_order_rating UNIQUE (customer_id, order_id)
);

COMMENT ON TABLE public.ratings
    IS 'Customer ratings and reviews - normalized design with customer_id reference only';

COMMENT ON COLUMN public.ratings.rating_id
    IS 'Primary key - unique rating identifier';

COMMENT ON COLUMN public.ratings.customer_id
    IS 'Foreign key to customers table - one rating per customer';

COMMENT ON COLUMN public.ratings.rating_value
    IS 'Rating value from 1 to 5 stars';

COMMENT ON COLUMN public.ratings.review_text
    IS 'Optional text review from customer';

COMMENT ON COLUMN public.ratings.created_at
    IS 'Timestamp when rating was created';

CREATE TABLE IF NOT EXISTS public.sessions
(
    session_id character varying(255) COLLATE pg_catalog."default" NOT NULL,
    customer_id integer,
    ip_address character varying(45) COLLATE pg_catalog."default",
    user_agent text COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone NOT NULL,
    last_activity timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id serial NOT NULL,
    admin_id integer,
    CONSTRAINT sessions_pkey PRIMARY KEY (id)
);

ALTER TABLE IF EXISTS public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id)
    REFERENCES public.menu_category (category_id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_menu_items_category
    ON public.menu_items(category_id);


ALTER TABLE IF EXISTS public.order_items
    ADD CONSTRAINT order_items_item_id_fkey FOREIGN KEY (item_id)
    REFERENCES public.menu_items (item_id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_order_items_item_id
    ON public.order_items(item_id);


ALTER TABLE IF EXISTS public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id)
    REFERENCES public.orders (order_id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
    ON public.order_items(order_id);


ALTER TABLE IF EXISTS public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customers (customer_id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_orders_customer_id
    ON public.orders(customer_id);


ALTER TABLE IF EXISTS public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id)
    REFERENCES public.orders (order_id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_payments_order_id
    ON public.payments(order_id);


ALTER TABLE IF EXISTS public.ratings
    ADD CONSTRAINT fk_ratings_customer FOREIGN KEY (customer_id)
    REFERENCES public.customers (customer_id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_ratings_customer_id
    ON public.ratings(customer_id);


ALTER TABLE IF EXISTS public.ratings
    ADD CONSTRAINT fk_ratings_item FOREIGN KEY (item_id)
    REFERENCES public.menu_items (item_id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_ratings_item_id
    ON public.ratings(item_id);


ALTER TABLE IF EXISTS public.ratings
    ADD CONSTRAINT fk_ratings_order FOREIGN KEY (order_id)
    REFERENCES public.orders (order_id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_ratings_order_id
    ON public.ratings(order_id);


ALTER TABLE IF EXISTS public.sessions
    ADD CONSTRAINT fk_sessions_admin FOREIGN KEY (admin_id)
    REFERENCES public.admins (admin_id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sessions_admin_id
    ON public.sessions(admin_id);


ALTER TABLE IF EXISTS public.sessions
    ADD CONSTRAINT sessions_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customers (customer_id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sessions_customer_id
    ON public.sessions(customer_id);

-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    plan_id serial NOT NULL,
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    price_monthly numeric(10,2) NOT NULL,
    price_yearly numeric(10,2),
    features text COLLATE pg_catalog."default",
    trial_days integer DEFAULT 14,
    CONSTRAINT subscription_plans_pkey PRIMARY KEY (plan_id)
);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    subscription_id serial NOT NULL,
    hotel_id integer NOT NULL,
    plan_id integer NOT NULL,
    start_date date NOT NULL DEFAULT CURRENT_DATE,
    expiry_date date,
    status varchar(20) NOT NULL DEFAULT 'active',
    CONSTRAINT subscriptions_pkey PRIMARY KEY (subscription_id),
    CONSTRAINT fk_subscriptions_hotel FOREIGN KEY (hotel_id) REFERENCES public.hotels (hotel_id) ON DELETE CASCADE,
    CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES public.subscription_plans (plan_id) ON DELETE RESTRICT
);


-- Subscription Plans Seed
INSERT INTO public.subscription_plans (name, price_monthly, price_yearly, features) VALUES
  ('trial', 0, 0, '{"menu_items":20,"admin_managers":1,"qr_dining":true,"checkout_dashboard":true,"sandbox":true}'),
  ('basic', 999, 11988, '{"menu_items":"unlimited","admin_managers":3,"razorpay":true,"kds":true,"dynamic_qr":true,"pdf_reports":true}'),
  ('pro', 2499, 29988, '{"all_basic":true,"unlimited_staff":true,"advanced_analytics":true,"occupancy_tracking":true,"priority_support":true,"menu_assistant":true}');

-- Data Seeding
INSERT INTO public.admins (username, password, name, email) 
VALUES ('ravi', '8ff9538e65e6781d654b811f88161d12455935ffb8f470815063b6ab6cb7fdff', 'Ravi Admin', 'ravi@HotByte.in')
ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password;

INSERT INTO public.menu_category (category_id, category_name) VALUES
(1, 'Starters'),
(2, 'Main Course'),
(3, 'Desserts'),
(4, 'Beverages')
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO public.menu_items (item_name, category_id, price, image_url, description, is_available, is_veg) VALUES
('Paneer Tikka Angara', 1, 249.00, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=500&q=80', 'Spicy grilled cottage cheese with bell peppers.', true, true),
('Crispy Corn', 1, 179.00, 'https://images.unsplash.com/photo-1517093602195-b40af9688b46?auto=format&fit=crop&w=500&q=80', 'Golden fried sweet corn kernels with spices.', true, true),
('Hara Bhara Kabab', 1, 189.00, 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=500&q=80', 'Healthy spinach and green pea patties.', true, true),
('Veg Manchurian', 1, 199.00, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=500&q=80', 'Indo-Chinese style vegetable balls in spicy gravy.', true, true),
('Spring Rolls', 1, 169.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80', 'Crispy rolls stuffed with sautéed vegetables.', true, true),
('Chilli Paneer', 1, 229.00, 'https://images.unsplash.com/photo-1624462966581-bc6d768cbce5?auto=format&fit=crop&w=500&q=80', 'Cottage cheese cubes tossed in spicy chilli sauce.', true, true),
('Butter Chicken', 2, 299.00, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=500&q=80', 'Classic creamy chicken curry in tomato gravy.', true, false),
('Hyderabadi Biryani', 2, 279.00, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80', 'Authentic slow-cooked basmati rice with spices.', true, false),
('Veg Diwani Handi', 2, 239.00, 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=500&q=80', 'Assorted vegetables cooked in a rich handi gravy.', true, true),
('Fish Curry', 2, 329.00, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80', 'Traditional coastal style fish curry.', true, false),
('Paneer Butter Masala', 2, 259.00, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80', 'Cottage cheese in a rich and creamy tomato sauce.', true, true),
('Dal Tadka', 2, 179.00, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80', 'Yellow lentils tempered with aromatic spices.', true, true),
('Laccha Paratha', 2, 59.00, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80', 'Multi-layered flaky whole wheat flatbread.', true, true),
('Butter Naan', 2, 49.00, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=500&q=80', 'Soft and buttery leavened flatbread.', true, true),
('Jeera Rice', 2, 149.00, 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=500&q=80', 'Basmati rice tempered with cumin seeds.', true, true),
('Kesari Firni', 3, 129.00, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=500&q=80', 'Traditional saffron infused ground rice pudding.', true, true),
('Gulab Jamun', 3, 99.00, 'https://images.unsplash.com/photo-1605333396915-47ed6b68a00e?auto=format&fit=crop&w=500&q=80', 'Soft khoya balls soaked in sugar syrup.', true, true),
('Ras Malai', 3, 139.00, 'https://images.unsplash.com/photo-1589135306090-e5552a196d86?auto=format&fit=crop&w=500&q=80', 'Flattened cottage cheese balls in thickened milk.', true, true),
('Masala Chaas', 4, 49.00, 'https://images.unsplash.com/photo-1550507992-eb63ffee0847?auto=format&fit=crop&w=500&q=80', 'Refreshing spiced buttermilk with mint.', true, true),
('Mango Lassi', 4, 89.00, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=500&q=80', 'Thick yogurt drink blended with sweet mangoes.', true, true),
('Fresh Lime Soda', 4, 59.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=80', 'Zesty lime soda served sweet or salted.', true, true),
('Mineral Water', 4, 20.00, 'https://images.unsplash.com/photo-1608889175123-8ec330b86f84?auto=format&fit=crop&w=500&q=80', 'Packaged 1L drinking water.', true, true);

END;

