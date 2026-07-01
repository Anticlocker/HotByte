# HotByte — Complete System Architecture & Developer Brain (BRAIN.md)

> **Document Version:** 1.0.0  
> **Status:** Production-Grade Reference  
> **Target Audience:** Developers & AI Coding Agents  
> **Last Updated:** June 26, 2026

Welcome to the **HotByte** developer brain. This document serves as the absolute single source of truth for the entire HotByte codebase. Before reading, modifying, or creating any feature, you must read and understand this document in full to ensure code consistency, security, and structural integrity.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture & Directory Structure](#3-architecture--directory-structure)
4. [Database Design & Models](#4-database-design--models)
5. [Key Application Flows](#5-key-application-flows)
6. [Authentication & Session Management](#6-authentication--session-management)
7. [Multi-Tenancy Architecture](#7-multi-tenancy-architecture)
8. [Security Audit & Hardening](#8-security-audit--hardening)
9. [SaaS Billing & Onboarding Lifecycle](#9-saas-billing--onboarding-lifecycle)
10. [Testing & QA Workflows](#10-testing--qa-workflows)
11. [Developer Workflows & Guidelines](#11-developer-workflows--guidelines)

---

## 1. Project Overview

### What is HotByte?
HotByte is a production-grade, multi-tenant **Smart Digital Menu & Restaurant Ordering Platform**. It operates as a SaaS (Software as a Service) application, allowing multiple restaurants (tenants) to register, configure their digital menu, generate table-specific QR codes, and receive orders directly from customers browsing their menus.

### Business Goal
To eliminate manual menu cards, streamline order management, reduce staffing overheads, and improve tables' occupancy turnover by providing dynamic digital menus, instant UPI/online checkout, and real-time Kitchen Display System (KDS) order tracking.

### Product Vision
To empower stand-alone restaurants and large food courts with enterprise-grade technology—enabling table-side ordering, subscription-based plans, and robust analytics with zero complex hardware dependencies.

### Target Users
*   **Restaurant Owners / Managers (Admins):** Manage menu items, categories, pricing, table layouts, and view sales reports.
*   **Kitchen & Service Staff:** Use the kitchen interface (KDS) to track incoming orders, change states, and manage tables.
*   **Customers:** Scan table QR codes to view the interactive menu (localized in English, Hindi, or Marathi), place orders, and pay online or via cash.
*   **Super Admins:** Monitor platform-wide metrics, approve/freeze hotels, manage subscription plans, and resolve billing issues.

### SaaS Tenant Plans
1.  **Trial Plan:** 14 days free trial. Limited to 20 menu items and 1 admin manager. Sandbox payment environment.
2.  **Basic Plan (₹999/mo):** Unlimited menu items, up to 3 admin managers, live KDS access, dynamic table QR codes, and PDF reports.
3.  **Pro Plan (₹2499/mo):** All Basic features + unlimited staff, advanced analytics, occupancy tracking, AI Menu Assistant, and priority support.

---

## 2. Tech Stack

### 💻 Frontend
*   **Framework:** Next.js (v16.2.6) App Router
*   **Base Library:** React (v19.2.4)
*   **Styling:** Tailwind CSS (v4) with Custom Theme Tokens
*   **Animations:** Framer Motion (v12.40.0)
*   **Data Fetching & Caching:** SWR (v2.4.1) for optimistic UI updates and real-time polling
*   **Internationalization:** i18next (v26.3.1) & react-i18next (v17.0.8) supporting English (`en`), Hindi (`hi`), and Marathi (`mr`)
*   **UI Components:** Lucide React icons, Leaflet maps (for coordinate pinning), SweetAlert2, and Canvas Confetti (celebration effects)

### ⚙️ Backend
*   **Runtime:** Node.js (v18+)
*   **Framework:** Express.js (v4)
*   **Database Client:** `pg` (node-postgres) with connection pooling and raw SQL query parameters
*   **Timezone Enforcement:** `process.env.TZ = 'Asia/Kolkata'` (India Standard Time)

### 🗄️ Database
*   **Engine:** PostgreSQL (v12+) hosted with transactional consistency and indexing

### 🔌 Third-Party & Infrastructure Services
*   **Razorpay:** Integrated for customer-facing order checkout and admin SaaS subscription billing
*   **MessageCentral CPaaS:** SMS Gateway used for OTP sending and verification
*   **BunnyCDN:** Image storage and content delivery network (CDN) for fast menu images
*   **Google OAuth:** Customer authentication via Google SSO credentials
*   **OneSignal:** Web push notifications for instant order and billing alerts

---

## 3. Architecture & Directory Structure

```
hotbyte/
│
├── TESTING_DOCUMENTATION.md      # Security and unit test coverage audits
├── BRAIN.md                      # Developer Brain & Single Source of Truth
├── package.json                  # Root dependencies
│
├── backend/                      # Node.js/Express.js Backend API Service
│   ├── index.js                  # App Entry Point & Middleware Configuration
│   ├── database.sql              # Clean SQL schema setup & initial plan seeding
│   ├── nodemon.json              # Development reloading watch rules
│   │
│   ├── middleware/               # Express Request Interceptors
│   │   ├── checkSubscription.js  # Enforces active plan checks & auto-freezes
│   │   ├── validateHotelHeader.js# Resolves hotel_id from 'x-hotel-slug' header
│   │   └── validateImageUpload.js# Validates image types (magic bytes) & file limits
│   │
│   ├── routes/                   # Endpoint handlers (scoped by domains)
│   │   ├── auth.js               # Sessions, Google SSO, and Guest Check-ins
│   │   ├── admin.js              # Categories, Items, and Admin stats
│   │   ├── menu.js               # Customer-facing menu retrieval
│   │   ├── orders.js             # Order placement, table status, and cancel
│   │   ├── payments.js           # Razorpay checkouts & SaaS onboarding integrations
│   │   ├── profile.js            # Customer history & DOB settings
│   │   ├── ratings.js            # Customer star-rating submissions
│   │   ├── sales.js              # Advanced analytics & reporting charts
│   │   ├── superadmin.js         # Global hotels management & audit configurations
│   │   ├── database.js           # PostgreSQL pool client instance
│   │   ├── bunnyCDN.js           # Image uploads helper
│   │   ├── messageCentral.js     # SMS OTP API services
│   │   └── seedDefaultMenu.js    # Default categories & items onboarding seed data
│   │
│   ├── utils/
│   │   ├── logger.js             # Structured morgan stream logger
│   │   └── hotelUtils.js         # String helper & slug sanitization utilities
│   │
│   └── tests/                    # Jest + Supertest Unit Testing suites
│       ├── auth.test.js
│       ├── auth.extended.test.js
│       ├── admin.test.js
│       ├── admin.extended.test.js
│       ├── menu.test.js
│       ├── orders.test.js
│       ├── payments.test.js
│       ├── payments.extended.test.js
│       ├── imageUpload.test.js
│       ├── multitenancy.test.js
│       ├── security.test.js
│       └── superadmin.test.js
│
└── frontend/                     # Next.js Next-Gen Single Page Application
    ├── next.config.js            # Next config, routing rewrite rules
    ├── postcss.config.mjs
    ├── tsconfig.json
    │
    ├── src/
    │   ├── app/                  # Next.js App Router folders
    │   │   ├── layout.tsx        # Base template (Providers setup)
    │   │   ├── page.tsx          # Landing / SaaS Home
    │   │   ├── onboarding/       # SaaS Signup & Razorpay subscription setup
    │   │   ├── [hotel_slug]/     # Multi-tenant customer menus & checkout
    │   │   ├── admin/            # Dashboard, categories, items, and orders
    │   │   └── super-admin/      # Global platform metrics dashboard
    │   │
    │   ├── components/           # Reusable Client/Server components
    │   │   ├── AdminSidebar.tsx
    │   │   ├── CustomerNavbar.tsx
    │   │   ├── MenuItemCard.tsx
    │   │   ├── PaymentSettings.tsx
    │   │   ├── landing/          # Visual presentation animations
    │   │   │   ├── CountUp.tsx
    │   │   │   └── FloatingElements.tsx
    │   │   └── ui/               # Modular modals & custom alerts
    │   │
    │   ├── context/              # Context Providers
    │   │   ├── AdminSessionContext.tsx
    │   │   ├── LocaleContext.tsx
    │   │   └── NotificationContext.tsx
    │   │
    │   ├── i18n/                 # i18n configuration module
    │   ├── locales/              # Translation maps (en, hi, mr)
    │   └── lib/
    │       ├── hooks/            # useSubscription & usePlanComparison
    │       └── utils/            # logger.ts
```

---

## 4. Database Design & Models

HotByte utilizes a highly-indexed, normalized PostgreSQL relational schema. Tenancy isolation is maintained logically using `hotel_id` references across all tables.

```
                  ┌─────────────────┐
                  │     hotels      │
                  └────────┬────────┘
                           │ 1
                           ├───────────────────────────────┐
                           │ N                             │ N
                  ┌────────▼────────┐             ┌────────▼────────┐
                  │     admins      │             │    customers    │
                  └────────┬────────┘             └────────┬────────┘
                           │ 1                             │ 1
                           │                               │
                  ┌────────▼────────┐             ┌────────▼────────┐
                  │    sessions     │◄────────────┤    sessions     │
                  └─────────────────┘             └─────────────────┘
```

### Table Specifications

#### 1. `hotels` (Tenant Definition)
*   `hotel_id` (serial PRIMARY KEY)
*   `name` (varchar(200)), `slug` (varchar(100) UNIQUE)
*   `plan` (varchar(20) DEFAULT 'trial') — Options: `trial`, `basic`, `pro`
*   `trial_ends_at`, `subscription_expiry_date` (timestamp)
*   `is_frozen` (boolean DEFAULT false) — Locks mutations if past expiry
*   `is_open`, `is_order_accept` (boolean DEFAULT true)
*   `latitude`, `longitude` (numeric) — For geo-fenced ordering bounds
*   `order_radius` (integer DEFAULT 30) — Geofence radius in meters
*   `hotel_type` (VARCHAR(10) CHECK CHECK IN ('veg', 'nonveg', 'both'))
*   `location_ordering_enabled` (boolean DEFAULT true)

#### 2. `admins` (Staff & Managers)
*   `admin_id` (serial PRIMARY KEY)
*   `username` (varchar(50) UNIQUE), `password` (varchar(200) - bcrypt hash)
*   `role` (varchar(20) DEFAULT 'admin') — `admin` or `super_admin`
*   `hotel_id` (integer REFERENCES `hotels(hotel_id)`)

#### 3. `customers` (User Profiles)
*   `customer_id` (serial PRIMARY KEY)
*   `name` (varchar(100)), `phone` (varchar(15)), `email` (varchar(100))
*   `google_id` (varchar(100)) — Filled if authenticated via SSO
*   `hotel_id` (integer REFERENCES `hotels(hotel_id)`)
*   `dob` (date) — Optional, for offering birthday discounts
*   *Constraint:* `idx_customers_email_hotel` UNIQUE index on `(email, hotel_id)` ensuring email lookup scopes correctly to the specific hotel tenant.

#### 4. `menu_category` (Organizational Headers)
*   `category_id` (serial PRIMARY KEY)
*   `category_name` (varchar(100))
*   `hotel_id` (integer REFERENCES `hotels(hotel_id) ON DELETE CASCADE`)

#### 5. `menu_items` (Dishes)
*   `item_id` (serial PRIMARY KEY)
*   `item_name` (varchar(150))
*   `category_id` (integer REFERENCES `menu_category(category_id)`)
*   `price` (numeric(10,2))
*   `image_url` (text - BunnyCDN path)
*   `is_available`, `is_veg` (boolean)
*   `hotel_id` (integer REFERENCES `hotels(hotel_id) ON DELETE CASCADE`)

#### 6. `menu_item_variants` (Item Add-ons / Sizes)
*   `id` (serial PRIMARY KEY)
*   `menu_item_id` (integer REFERENCES `menu_items(item_id) ON DELETE CASCADE`)
*   `variant_name` (varchar(100)), `price` (numeric(10,2))

#### 7. `orders` (Order Ledger)
*   `order_id` (serial PRIMARY KEY)
*   `order_display_id` (varchar(20) UNIQUE) — Human-readable customer code
*   `customer_id` (integer REFERENCES `customers(customer_id)`)
*   `table_number` (varchar(20))
*   `total_amount` (numeric(10,2))
*   `status` (varchar(20) DEFAULT 'pending') — `pending` | `preparing` | `ready` | `completed` | `cancelled`
*   `hotel_id` (integer REFERENCES `hotels(hotel_id) ON DELETE CASCADE`)

#### 8. `order_items` (Line Items)
*   `order_item_id` (serial PRIMARY KEY)
*   `order_id` (integer REFERENCES `orders(order_id) ON DELETE CASCADE`)
*   `item_id` (integer REFERENCES `menu_items(item_id)`)
*   `variant_id` (integer REFERENCES `menu_item_variants(id) ON DELETE SET NULL`)
*   `variant_name` (varchar(100)), `quantity` (integer), `price` (numeric(10,2))

#### 9. `payments` (Transaction ledger)
*   `payment_id` (serial PRIMARY KEY)
*   `order_id` (integer REFERENCES `orders(order_id)`)
*   `amount` (numeric(10,2)), `payment_status` (varchar(20)), `payment_method` (`cash` | `razorpay`)
*   `razorpay_payment_id` (varchar(200) UNIQUE)

#### 10. `sessions` (Session Tracking)
*   `session_id` (varchar(255) PRIMARY KEY)
*   `customer_id` (integer REFERENCES `customers(customer_id) ON DELETE CASCADE`)
*   `admin_id` (integer REFERENCES `admins(admin_id) ON DELETE CASCADE`)
*   `expires_at` (timestamp NOT NULL)
*   `last_activity` (timestamp DEFAULT CURRENT_TIMESTAMP)

#### 11. `payment_sessions` (Onboarding Lifecycle Store)
*   `session_token` (varchar(255) PRIMARY KEY)
*   `razorpay_order_id` (varchar(200) UNIQUE), `razorpay_payment_id` (varchar(200) UNIQUE)
*   `status` (varchar(20) DEFAULT 'pending') — `pending_payment` | `paid` | `consumed`
*   `username`, `email`, `password` (varchar) — Hashed credentials stored temporarily before transaction commit

#### 12. `otp_store` (Authentication Codes)
*   `otp_key` (varchar(255) PRIMARY KEY) — Format: `{phone_number}_login` or `{phone_number}_admin_forgot`
*   `data` (jsonb) — `{ type, attempts, verificationId, expiresAt, username }`
*   `expires_at` (timestamp)

---

## 5. Key Application Flows

### 🛒 Dine-in Customer Journey
```
[Scan Table QR] ➔ [Guest/Google Checkin] ➔ [Browse Scoped Menu]
                        │
                        ▼
                [Add to Cart] ➔ [Geofence Check]
                                      │
                                      ▼
                             [Select Payment]
                                💼   💳
                    ┌────────────┘     └────────────┐
                    ▼                               ▼
                 [Cash]                        [Razorpay]
                    │                               │
           [Pending Status]                 [Verify Signature]
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
                         [KDS Status Processing]
              Pending ➔ Preparing ➔ Ready ➔ Completed
```

1.  **QR Scanning:** Customers scan the table QR code (resolving `/[hotel_slug]?table=T-1` in the routing layout).
2.  **Authentication Guard:** If the hotel setting `customer_auth_required` is enabled, they must log in using Google OAuth. Otherwise, they can proceed using the **Guest Check-in** flow.
3.  **Geofence Validation:** Before placing the order, the API verifies if the customer's browser coordinates (`latitude`, `longitude`) are within the restaurant's `order_radius` configuration. If outside the fence, ordering is blocked.
4.  **Order Placement & Payment:**
    *   **Cash:** The order starts as `pending` and payment as `pending`. The admin completes payment at the counter.
    *   **Razorpay:** Customer completes checkout via SDK. The server verifies signature matches `HMAC-SHA256(order_id + "|" + payment_id, secret)` and records payment as `completed`.
5.  **KDS Lifecycle:** Kitchen staff view the order in real-time. Status transitions follow:
    $$\text{pending} \longrightarrow \text{preparing} \longrightarrow \text{ready} \longrightarrow \text{completed}$$

---

## 6. Authentication & Session Management

### 📱 Customer OTP Flow (MessageCentral API)
1.  **OTP Request (`/api/auth/send-otp`):** Checks rate limits, generates a cryptographically random verification request, and posts to MessageCentral URL:
    `https://cpaas.messagecentral.com/verification/v3/send`
2.  **Database Storage:** The OTP transaction metadata is stored in `public.otp_store` with `expires_at = NOW() + INTERVAL '10 minutes'`.
3.  **Verification (`/api/auth/verify-otp`):** Submits the token to MessageCentral validate URL. On success, the OTP entry is deleted to prevent reuse. The customer session is generated.

### 🔐 Google SSO Flow
1.  Frontend handles credentials retrieval using Google One Tap / Sign In.
2.  Backend validates the ID Token via `https://oauth2.googleapis.com/tokeninfo?id_token={token}`.
3.  **Security Constraint:** The backend strictly checks `aud === process.env.GOOGLE_CLIENT_ID` to prevent attackers from using Google tokens from other OAuth projects.

### 👨‍💼 Admin & Password Management
*   **Hashing Standard:** All password inserts are cryptographically salted and hashed using `bcrypt` (12 work factors).
*   **Legacy SHA-256 Migration:**
    1.  Older systems used SHA-256 hashes for admin passwords.
    2.  Upon a successful password match on login, the server checks if the hash in DB matches SHA-256 formats.
    3.  If verified, the server dynamically regenerates a secure `bcrypt` hash and updates the `admins` table.

```javascript
if (admin.password.startsWith("$2b$") || admin.password.startsWith("$2a$")) {
  passwordMatch = await bcrypt.compare(password, admin.password);
} else {
  // Fallback check
  const sha256 = crypto.createHash("sha256").update(password).digest("hex");
  passwordMatch = (sha256 === admin.password);
  if (passwordMatch) {
    // Re-hash and migrate to bcrypt
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.query("UPDATE admins SET password = $1 WHERE admin_id = $2", [hashedPassword, admin.admin_id]);
  }
}
```

### 🍪 Session Lifecycle
*   **Cookies:** Sessions utilize HTTP-Only, cryptographically signed cookies.
*   **Tenancy Cookies:**
    *   `sessionId`: LAX SameSite configuration for customers (duration: 90 days).
    *   `adminSessionId`: STRICT SameSite configuration for hotel staff (duration: 24 hours).
    *   `superAdminSessionId`: STRICT SameSite configuration for platform operators (duration: 90 days).
*   **Cleanup:** Expired sessions are pruned transactionally on session creation calls via:
    `DELETE FROM sessions WHERE expires_at < NOW()`

### 🌐 User Preferences Sync
*   Both customers and admins can update their locale preference via `/api/user/preferences`.
*   Locales are synced database-side (`UPDATE customers SET locale = $1` or `UPDATE admins SET locale = $1`) if an authenticated session exists.
*   Guest users save their language settings dynamically in `localStorage` in the frontend client.

---

## 7. Multi-Tenancy Architecture

HotByte operates on a **Single Database, Shared Schema** tenancy architecture.

```
       [Request] ➔ [validateHotelHeader Middleware] 
                          │
                          ▼
            [Read Header 'x-hotel-slug']
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
       [Slug Found]               [Slug Missing]
            │                           │
    [Fetch hotel_id]                    ▼
            │                   [Allow Next Route]
            ▼
    [Set req.hotel.id]
            │
            ▼
    [Enforce SQL Scoping] 
    WHERE hotel_id = req.hotel.id
```

### Tenant Isolation Enforcement
1.  **Header Verification:** The frontend injects the current tenant header `x-hotel-slug` in API requests.
2.  **Routing Interception (`validateHotelHeader.js`):**
    *   Reads `x-hotel-slug` and runs `SELECT hotel_id FROM public.hotels WHERE slug = $1`.
    *   Saves resolved ID as `req.hotel = { id, slug }` for downstream query mapping.
    *   Ensures that a user from Restaurant A can never query or view resources matching Restaurant B.

### Subscription Checking & Auto-Freeze (`checkSubscription.js`)
On every state-changing route (menu, orders, ratings), the `checkSubscription` middleware resolves the hotel context:
*   Checks if the trial date (`trial_ends_at`) or active subscription (`subscription_expiry_date`) has passed.
*   If expired, it triggers `UPDATE public.hotels SET is_frozen = TRUE WHERE hotel_id = $1`.
*   A 403 Forbidden is returned, locking the tenant out of database mutations (creating orders, editing menu) until billing is settled.

---

## 8. Security Hardening & Audit Findings

### 🛡️ Core Protections

#### 1. SQL Injection Protection
*   No dynamic query string building (`LIKE '%` + input + `%'`) is permitted.
*   All queries must use parameterized syntax:
    ```javascript
    db.query("SELECT * FROM menu_items WHERE hotel_id = $1 AND price > $2", [hotelId, minPrice])
    ```

#### 2. Cross-Site Scripting (XSS)
*   Admin-input fields (e.g. Category names, Menu descriptions, item titles) are sanitized through the backend `xss` npm package before committing to the database to remove script injection payloads.

#### 3. CSRF Mitigation (Double-Submit Cookie Pattern)
*   The `/api/auth/csrf-token` route sets a `csrfToken` cookie on the client.
*   All non-idempotent mutations (POST, PUT, DELETE) inside the `/api` route check:
    `req.headers['x-csrf-token'] === req.cookies.csrfToken`
*   If mismatch, request is rejected with `403 Forbidden`.

#### 4. Image Upload Security
*   Validations check magic bytes (headers) of the image rather than file extensions:
    *   `FF D8 FF` for JPEG
    *   `89 50 4E 47` for PNG
    *   `52 49 46 46` for WEBP
*   Maximum size limits: Logo (200KB), Banner/Menu Items (300KB).

#### 5. Geolocation Geo-Fence
*   Location ordering matches client-provided lat/long coordinates against stored hotel coordinates.
*   Calculates distance using the Haversine formula. If the offset is higher than `order_radius`, order submission fails.

### ⚠️ Security Audit Warnings & Hardening Guidance
1.  **Customer OTP Rate Limiting:** Apply rate limit rules on the customer OTP endpoint `/api/auth/send-otp` to mitigate SMS bombing.
2.  **SHA-256 Legacy Passwords:** Once legacy databases are successfully migrated, remove fallback SHA-256 checks to keep hash evaluation uniform.
3.  **Strict HSTS Settings:** Configure HSTS headers explicitly in production:
    ```javascript
    strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: true }
    ```

---

## 9. SaaS Billing & Onboarding Lifecycle

### Onboarding Flow (State Machine)
To prevent creating active hotels in the DB prior to billing authorization, the platform uses a pre-registration queue:

```
[Form Input validation] ➔ [Validate Unique Email/User] ➔ [Create Inactive payment_session]
                                                                │
                                                                ▼
                                                        [Razorpay Checkout]
                                                                │
                                                                ▼
                                                      [Verify Signature]
                                                                │
                                                                ▼
                                                     [Complete Onboarding]
                                                   • Transaction starts
                                                   • Hotel & Admin created
                                                   • Default menu seeded
                                                   • Set session cookies
                                                   • Session state ➔ consumed
```

*   **Step 1:** Onboarding forms validate unique username/emails using `/api/payments/validate-account`.
*   **Step 2:** `/create-inactive-session` hashes the password using bcrypt, locks trial restrictions, issues a token, and writes to `payment_sessions` as `pending_payment`.
*   **Step 3:** The client triggers Razorpay. Once paid, backend verifies signature and updates `payment_sessions` state to `paid`.
*   **Step 4:** `/complete-onboarding` commits the tenant database transactions (inserting hotel, creating the admin, and seeding 22 items across 4 default categories in `seedDefaultMenu.js`). It marks the session token as `consumed`.

---

## 10. Testing & QA Workflows

### Testing Framework
*   **Backend:** Jest (v30) + Supertest (v7).
*   **Frontend:** Playwright (accessibility & flow verification).

### Run Test Suites
Sequential mode (`--runInBand`) is critical to avoid transactional collisions inside mocked `pg` Pool wrappers.
```bash
cd backend
npm test
```

### Mocking database patterns
Backend unit tests mock the database queries so they can execute fast in a sandboxed environment without requiring a running PostgreSQL server:
```javascript
jest.mock('./database', () => ({
  query: jest.fn()
}));
```

---

## 11. Developer Workflows & Guidelines

### Local Setup
1.  **Clone & Install Root:**
    ```bash
    npm install
    ```
2.  **Database Configuration:**
    Ensure PostgreSQL is running locally, create a database named `DigiMenu`, and execute:
    ```bash
    psql -U postgres -d DigiMenu -f backend/database.sql
    ```
3.  **Configuration:** Create local `.env` files in both the `backend/` and `frontend/` directories following `.env.example` templates.
4.  **Launch Local Servers:**
    *   Backend (Port 8000 default): `cd backend && npm run dev`
    *   Frontend (Port 3000 default): `cd frontend && npm run dev`

### Environment Variables Template (.env)
```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=DigiMenu
DB_PASSWORD=your_secure_password
DB_PORT=5432

RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

MESSAGE_CENTRAL_AUTH_TOKEN=your_auth_token
MESSAGE_CENTRAL_CUSTOMER_ID=your_customer_id

JWT_SECRET=your_jwt_secret
COOKIE_SECRET=your_cookie_secret
ALLOWED_ORIGIN=http://localhost:3000
PORT=8000
NODE_ENV=development
```

### 🤖 Coding Conventions for AI Agents
*   **Multi-tenant Scope:** Always ensure database queries querying items, orders, or categories include `hotel_id` checks.
*   **Security Header Integrity:** Never disable CSP settings or modify header middleware configurations unless matching a strict audit finding recommendation.
*   **No Placeholders:** When modifying logic or implementing pages, write complete, fully functional codes with precise error logging.
*   **Structured Logs:** Always log server actions through `utils/logger.js`.
