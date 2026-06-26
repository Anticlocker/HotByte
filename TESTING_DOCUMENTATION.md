# HotByte — Testing & Security Analysis Documentation

> **Project:** HotByte — Smart Digital Menu & Restaurant Ordering Platform  
> **Date:** June 25, 2026  
> **Backend Tests:** 12 suites, 80 tests — PASS  
> **Security Audit:** Completed — 7 findings catalogued

---

## Table of Contents

1. [Test Suite Overview](#1-test-suite-overview)
2. [Backend Unit Tests](#2-backend-unit-tests)
   - 2.1 Auth Tests
   - 2.2 Admin Tests
   - 2.3 Menu Tests
   - 2.4 Orders Tests
   - 2.5 Payments Tests
   - 2.6 Multi-Tenancy Tests
   - 2.7 Security Tests
   - 2.8 Super Admin Tests
   - 2.9 Image Upload Tests
3. [Running Tests](#3-running-tests)
4. [Dependency Audit](#4-dependency-audit)
5. [Vulnerability Analysis (10x)](#5-vulnerability-analysis-10x)
   - 5.1 Dependency Vulnerabilities
   - 5.2 Code-Level Vulnerabilities
   - 5.3 Configuration Weaknesses
   - 5.4 Multi-Tenant Isolation
   - 5.5 Input Validation
   - 5.6 Authentication & Session Management
   - 5.7 Rate Limiting Coverage
6. [Security Recommendations](#6-security-recommendations)
7. [Test Coverage Gaps](#7-test-coverage-gaps)

---

## 1. Test Suite Overview

| # | Test File | Tests | Status |
|---|---|---|---|
| 1 | `tests/auth.test.js` | 7 | ✅ PASS |
| 2 | `tests/auth.extended.test.js` | 10 | ✅ PASS |
| 3 | `tests/admin.test.js` | 8 | ✅ PASS |
| 4 | `tests/admin.extended.test.js` | 11 | ✅ PASS |
| 5 | `tests/menu.test.js` | 7 | ✅ PASS |
| 6 | `tests/orders.test.js` | 8 | ✅ PASS |
| 7 | `tests/payments.test.js` | 6 | ✅ PASS |
| 8 | `tests/payments.extended.test.js` | 8 | ✅ PASS |
| 9 | `tests/imageUpload.test.js` | 4 | ✅ PASS |
| 10 | `tests/multitenancy.test.js` | 2 | ✅ PASS |
| 11 | `tests/security.test.js` | 1 | ✅ PASS |
| 12 | `tests/superadmin.test.js` | 8 | ✅ PASS |
| **Total** | **12 files** | **80** | **ALL PASS** |

### Test Results (Run: June 25, 2026)

```
Test Suites: 12 passed, 12 total
Tests:       80 passed, 80 total
Snapshots:   0 total
Time:        15.362 s
```

---

## 2. Backend Unit Tests

Framework: **Jest v30** + **Supertest v7**  
Database: All tests use mocked `pg` Pool (no real database required)

### 2.1 Auth Tests (`auth.test.js` — 7 tests)

Covers customer authentication flow:

| Test | Description |
|---|---|
| POST `/api/auth/admin/login` — missing fields | Returns 400 when username/password/role missing |
| POST `/api/auth/admin/login` — wrong credentials | Returns 401 for invalid login |
| POST `/api/auth/admin/signup` — no auth | Returns 401 when no session cookie provided |
| GET `/api/auth/session-check` — no session | Returns `{ authenticated: false }` |
| POST `/api/auth/logout` — clears cookie | Returns success |
| POST `/api/auth/guest-checkin` — valid payload | Returns 200 and session cookie |
| POST `/api/auth/guest-checkin` — missing name | Returns 400 |

### 2.2 Extended Auth Tests (`auth.extended.test.js` — 10 tests)

| Test | Description |
|---|---|
| Guest checkin with short name | Returns 400 (min 2 chars) |
| Guest checkin to auth-required hotel | Returns 403 with `requireAuth: true` |
| Guest checkin to frozen hotel | Returns 403 |
| Guest checkin creates customer + session | Full flow validation |
| Forgot OTP — missing fields | Returns 400 |
| Forgot OTP — invalid phone | Returns 400 |
| Forgot OTP — unknown username | Returns 404 |
| Forgot OTP — non-super-admin account | Returns 403 |
| Forgot OTP — successful send | Returns 200 |

### 2.3 Admin Tests (`admin.test.js` — 8 tests, `admin.extended.test.js` — 11 tests)

Covers menu category CRUD, menu items, order management, dashboard stats:

| Test | Description |
|---|---|
| GET `/api/admin/categories` — no auth | Returns 401 |
| GET `/api/admin/categories` — valid session | Returns 200 with categories |
| POST `/api/admin/categories` — missing name | Returns 400 |
| POST `/api/admin/categories` — valid | Creates category successfully |
| PUT `/api/admin/categories/:id` — update | Updates category name |
| DELETE `/api/admin/categories/:id` — not found | Returns 404 |
| DELETE `/api/admin/categories/:id` — valid | Deletes successfully |
| POST `/api/admin/items` — missing fields | Returns 400 |
| POST `/api/admin/items` — valid | Creates item successfully |
| PUT `/api/admin/orders/:id/status` — invalid status | Returns 400 |
| PUT `/api/admin/orders/:id/status` — valid | Updates successfully |
| GET `/api/admin/dashboard/stats` | Returns aggregated stats |

### 2.4 Menu Tests (`menu.test.js` — 7 tests)

Covers public menu endpoints:

| Test | Description |
|---|---|
| GET `/api/menu/categories` — nonexistent hotel | Returns 404 |
| GET `/api/menu/categories` — frozen hotel | Returns 403 with `isFrozen` |
| GET `/api/menu/categories` — valid hotel | Returns categories + hotel config |
| GET `/api/menu/items` — nonexistent hotel | Returns 404 |
| GET `/api/menu/items` — frozen hotel | Returns 403 |
| GET `/api/menu/items` — valid hotel | Returns items with ratings |
| GET `/api/menu/status` — valid hotel | Returns hotel status flags |

### 2.5 Orders Tests (`orders.test.js` — 8 tests)

Covers order creation, cancellation, table availability:

| Test | Description |
|---|---|
| POST `/api/orders/create` — no auth | Returns 401 |
| POST `/api/orders/create` — empty cart | Returns 400 |
| POST `/api/orders/create` — missing table | Returns 400 |
| POST `/api/orders/create` — valid payload | Creates order successfully |
| POST `/api/orders/create` — location outside radius | Returns 403 with `locationError` |
| POST `/api/orders/create` — with customer name | Stores custom name |
| GET `/api/orders/table-availability` | Returns table status map |
| DELETE `/api/orders/cancel/:id` — valid | Cancels successfully |

### 2.6 Payments Tests (`payments.test.js` — 6 tests, `payments.extended.test.js` — 8 tests)

Covers Razorpay integration, subscription payments, onboarding flow:

| Test | Description |
|---|---|
| GET `/api/payments/razorpay-key` — valid | Returns key (base64) |
| POST `/api/payments/create-razorpay-order` | Creates mock Razorpay order |
| POST `/api/payments/verify` — missing fields | Returns 400 |
| POST `/api/payments/verify` — valid | Verifies signature + saves payment |
| POST `/api/payments/validate-account` | Validates username/email uniqueness |
| POST `/api/payments/create-subscription-order` — invalid plan | Returns 400 |
| POST `/api/payments/create-inactive-session` — duplicate | Returns 409 |
| Subscription verification flow | End-to-end plan upgrade |

### 2.7 Multi-Tenancy Tests (`multitenancy.test.js` — 2 tests)

Covers tenant isolation enforcement:

| Test | Description |
|---|---|
| Customer from Hotel 10 cannot order at Hotel 20 | Returns 403 |
| Customer from Hotel 10 cannot check tables at Hotel 20 | Returns 403 |

### 2.8 Security Tests (`security.test.js` — 1 test)

Covers XSS sanitization:

| Test | Description |
|---|---|
| XSS payload in category name | Sanitized by `xss()` package, `<script>` tags removed |

### 2.9 Image Upload Tests (`imageUpload.test.js` — 4 tests)

Covers image validation:

| Test | Description |
|---|---|
| Valid JPEG upload | ✅ Accepted |
| Invalid file (no magic bytes) | ❌ Rejected |
| File size exceeds limit | ❌ Rejected |
| Invalid extension | ❌ Rejected |

### 2.10 Super Admin Tests (`superadmin.test.js` — 8 tests)

Covers super admin functionality:

| Test | Description |
|---|---|
| GET `/api/superadmin/hotels` — non-admin | Returns 403 |
| GET `/api/superadmin/hotels` — super admin | Returns hotel list |
| PUT `/api/superadmin/hotels/:id/location-ordering` | Updates setting |
| ... plus additional CRUD tests | ... |

---

## 3. Running Tests

### Backend Tests

```bash
cd backend
npm test
```

This runs: `jest --runInBand --detectOpenHandles --forceExit`

| Flag | Purpose |
|---|---|
| `--runInBand` | Sequential test execution (avoids DB mock conflicts) |
| `--detectOpenHandles` | Identifies unclosed handles (handles, sockets) |
| `--forceExit` | Forces Jest to exit after tests complete |

### Frontend Tests

Frontend has Playwright-based a11y tests. Run:

```bash
npx playwright test
```

Test results (screenshots, videos) are stored in `test-results/`.

### Test Environment

Tests use:
- `NODE_ENV=test` — disables CSRF protection, rate limiting, server listen
- Mocked `pg` database pool (no real DB connection required)
- Environment variables from `.env` at project root

---

## 4. Dependency Audit

### Backend (`hotbyte`)

| Package | Severity | Issue | Fix |
|---|---|---|---|
| `form-data` (4.0.0–4.0.5) | **HIGH** | CRLF injection via unescaped multipart field names/filenames | `npm audit fix` |
| `js-yaml` (≤4.1.1 via jest deps) | moderate | DoS via repeated aliases | Requires jest major upgrade |

### Frontend (`frontend`)

| Package | Severity | Issue | Fix |
|---|---|---|---|
| `postcss` (via next) | moderate | XSS via unescaped `</style>` in CSS stringify | Next.js upgrade |
| `js-yaml` (≤4.1.1) | moderate | DoS via repeated aliases | `npm audit fix` |

### Action Items

1. **Fix backend high severity:** `cd backend && npm audit fix`
2. **Fix frontend moderate:** `cd frontend && npm audit fix`
3. **Next.js version:** Current v16.2.6 — check for newer patches

---

## 5. Vulnerability Analysis (10x)

### 5.1 Dependency Vulnerabilities

| # | Severity | Component | CVSS-like | Description |
|---|---|---|---|---|
| V-01 | **HIGH** | `form-data` | ~7.5 | CRLF injection allows HTTP request smuggling via multipart filename |
| V-02 | moderate | `js-yaml` | ~5.9 | Quadratic complexity DoS in YAML parser |
| V-03 | moderate | `postcss` | ~5.4 | XSS via CSS stringify output |

### 5.2 Code-Level Vulnerabilities

| # | Severity | Location | Issue |
|---|---|---|---|
| V-04 | **MEDIUM** | `routes/auth.js:531-534` | **SHA-256 password fallback** — Legacy password migration uses unsalted SHA-256. Migrated immediately on successful login, but stored SHA-256 hashes are rainbow-table vulnerable. **Impact:** If database is compromised, legacy passwords recoverable. |
| V-05 | **LOW** | `routes/auth.js:913` | **Predictable guest email pattern** — Guest emails follow `guest_{name}_{hotelId}@hotbyte.guest`. An attacker knowing a guest's name and hotel could enumerate accounts. |
| V-06 | **LOW** | `index.js:353-357` | **OneSignal keys obfuscated, not encrypted** — Base64 encoding is trivially reversible. These are public SDK keys, but exposing them violates principle of least privilege. |
| V-07 | **INFO** | `routes/payments.js:775-786` | **Mock payment orders in non-production** — When Razorpay is unavailable outside production, mock orders are created. If `NODE_ENV` is ever misconfigured in production, this bypasses payment. |

### 5.3 Configuration Weaknesses

| # | Severity | Location | Issue |
|---|---|---|---|
| V-08 | **MEDIUM** | `index.js:42` | **CSP allows `'unsafe-inline'` for scripts** — Weakens XSS protection. Razorpay checkout and Google SSO require inline scripts, but a stricter nonce-based CSP would be more secure. |
| V-09 | **LOW** | `index.js:38-52` | **No HSTS header** — Helmet's default HSTS is not explicitly configured. In production, missing HSTS allows protocol downgrade attacks. |
| V-10 | **LOW** | `index.js:233` | **Geolocation disabled via Permissions-Policy** — But location-based ordering (`location_ordering_enabled`) requires customer geolocation. |
| V-11 | **LOW** | `index.js:242` | **Cache-Control: no-store on ALL routes** — While secure for auth pages, this prevents caching of public assets like menu images, increasing load times. |

### 5.4 Multi-Tenant Isolation — **VERIFIED SECURE**

| Check | Status | Evidence |
|---|---|---|
| Orders scoped by hotel_id | ✅ | `orders.js:83,117,288,402,642` |
| Menu items scoped by hotel_id | ✅ | `menu.js:148`, `admin.js:187,340` |
| Customers scoped by hotel_id | ✅ | `auth.js:303-305,914-918` |
| Admin sessions scoped by hotel_id | ✅ | `auth.js:174-178` |
| Categories scoped by hotel_id | ✅ | `admin.js:51,90` |
| Ratings scoped by hotel_id | ✅ | `admin.js:1266-1267` |
| Super admin bypass blocked for regular admins | ✅ | `auth.js:157-213`, `superadmin.js:17-22` |

### 5.5 Input Validation — **STRONG**

| Check | Status | Notes |
|---|---|---|
| SQL injection via parameterized queries | ✅ | All queries use `$1, $2, ...` parameterized style |
| XSS via `xss()` package | ✅ | Applied on category names, item names, descriptions, admin fields |
| Image upload — magic byte validation | ✅ | `validateImageUpload.js` checks JPEG/PNG/WEBP magic bytes |
| Image upload — MIME type + extension | ✅ | Double validation |
| Image upload — file size limit | ✅ | 200KB (logo) / 300KB (banner) |
| Mobile number regex | ✅ | `/^[6-9]\d{9}$/` |
| OTP 6-digit validation | ✅ | `/^\d{6}$/` |
| Email validation | ✅ | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| Username length constraint | ✅ | 3-50 characters |
| Password length constraint | ✅ | 6-128 characters |
| Slug sanitization | ✅ | `[^a-z0-9\-]` stripped |
| Menu price numeric validation | ✅ | `parseFloat()` |

### 5.6 Authentication & Session Management

| Check | Status | Notes |
|---|---|---|
| bcrypt password hashing (12 rounds) | ✅ | Industry standard |
| Cryptographically random session IDs | ✅ | `crypto.randomBytes(32)` |
| Session expiry | ✅ | Customer: 90 days, Admin: 24h, Super admin: 90 days |
| HTTP-only cookies | ✅ | `sessionId`, `adminSessionId` |
| SameSite=Strict/Lax | ✅ | Strict for admin, Lax for customer |
| Secure flag in production | ✅ | `secure: process.env.NODE_ENV === "production"` |
| CSRF double-submit cookie pattern | ✅ | `x-csrf-token` header vs `csrfToken` cookie |
| OTP expiry (10 min) | ✅ | DB-backed with auto-cleanup |
| OTP attempt limit (5) | ✅ | Hardcoded `MAX_OTP_ATTEMPTS = 5` |
| Google SSO audience verification | ✅ | `aud` claim verified against `GOOGLE_CLIENT_ID` |
| Session invalidation on password change | ✅ | `DELETE FROM sessions WHERE admin_id = $1` |
| Admin brute-force protection | ✅ | 10 attempts / 15 min via rate-limiter |

### 5.7 Rate Limiting Coverage

| Endpoint | Limit | Window |
|---|---|---|
| Admin login | 10 requests | 15 min |
| Admin signup | 5 requests | 15 min |
| Admin forgot-otp | 5 requests | 15 min |
| Admin reset-password | 5 requests | 15 min |
| Google SSO login | 20 requests | 15 min |
| Guest check-in | 30 requests | 15 min |
| Payment endpoints | 10 requests | 15 min |
| Onboarding endpoints | 5 requests | 1 hour |
| Super admin routes | 30 requests | 15 min |
| Inactive session creation | 5 requests | 10 min (in-memory) |
| **Customer OTP send** | ❌ **NOT RATE LIMITED** | — |

> **Gap:** Customer OTP sending endpoint (`/api/auth/send-otp`) does not have a specific rate limiter applied in `index.js`. Only the admin auth endpoints have explicit limiters.

---

## 6. Security Recommendations

### High Priority

1. **Fix `form-data` vulnerability** — Run `npm audit fix` in backend to patch CRLF injection (V-01).

2. **Add rate limiting for customer OTP** — Add a rate limiter for the customer OTP sending endpoint to prevent SMS bombing:
   ```js
   const otpLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 5,
     message: { success: false, message: 'Too many OTP requests. Please try again after 15 minutes.' }
   });
   app.use('/api/auth/send-otp', otpLimiter);
   ```

### Medium Priority

3. **Remove SHA-256 password fallback** — After all legacy accounts are migrated, remove the SHA-256 path (V-04). Consider a one-time migration script instead of inline fallback.

4. **Add HSTS header in production** — Configure Helmet's `strictTransportSecurity` with a long `maxAge` for production:
   ```js
   app.use(helmet({
     strictTransportSecurity: {
       maxAge: 31536000,
       includeSubDomains: true,
       preload: true
     }
   }));
   ```

5. **Strengthen CSP with nonces** — Replace `'unsafe-inline'` with nonce-based script loading for Razorpay and Google SSO (V-08).

### Low Priority

6. **Fix Permissions-Policy vs geolocation conflict** — Allow geolocation in Permissions-Policy since location-based ordering needs it (V-10).

7. **Conditional cache headers** — Apply `Cache-Control: no-store` only to auth routes, allow caching for public menu assets (V-11).

---

## 7. Test Coverage Gaps

| Area | Gap | Suggested Tests |
|---|---|---|
| **Rate limiting** | No tests verify rate limiters trigger correctly | Test 10+ rapid admin login attempts → 429 |
| **Google SSO** | No tests for Google login flow | Mock token verification, test audience check |
| **CSRF protection** | CSRF disabled in test mode — no tests | Enable in dedicated CSRF test suite |
| **Razorpay webhook** | No webhook signature verification tests | Test HMAC verification + replay detection |
| **Subscription expiry** | No tests for trial/subscription auto-freeze | Mock dates, verify `is_frozen` field |
| **Admin password change** | No tests for password change flow | Test old password invalidated after change |
| **Session invalidation** | No tests for session expiry or forced logout | Test expired sessions return 401 |
| **Frontend** | No unit tests for React components | Component-level rendering + interaction tests |
| **API input fuzzing** | No fuzz/edge-case tests | Boundary values, unicode, very long strings |
| **Race conditions** | No concurrent request tests | Double order submission, double payment |
| **File upload security** | No path traversal tests | `../../../etc/passwd` in filename |
| **Super admin audit logs** | No verification of audit log entries | Check `auth_logs` after sensitive operations |

---

## Architecture Security Summary

```
┌─────────────────────────────────────────────────────────────┐
│                      HotByte Security                       │
├─────────────────────────────────────────────────────────────┤
│  ✅ SQL Injection Protection   (Parameterized queries)      │
│  ✅ XSS Sanitization           (xss npm package)             │
│  ✅ CSRF Protection            (Double-submit cookie)        │
│  ✅ Rate Limiting              (express-rate-limit)          │
│  ✅ Security Headers           (Helmet + custom headers)     │
│  ✅ Secure Cookies             (httpOnly, sameSite, secure)  │
│  ✅ Password Hashing           (bcrypt, 12 rounds)           │
│  ✅ Multi-Tenant Isolation     (hotel_id scoping)            │
│  ✅ Input Validation           (regex + whitelist)           │
│  ✅ Image Upload Security      (magic bytes + MIME + size)   │
│  ✅ Razorpay Signature Verify  (HMAC-SHA256)                 │
│  ✅ Graceful Shutdown          (SIGTERM/SIGINT handling)     │
│  ✅ Request Tracing            (X-Request-Id)                │
├─────────────────────────────────────────────────────────────┤
│  ⚠️ CSP uses unsafe-inline     (needs nonce-based CSP)      │
│  ⚠️ Missing HSTS               (Helmet default not set)      │
│  ⚠️ No customer OTP rate limit (SMS bombing risk)           │
│  ⚠️ SHA-256 password fallback  (legacy migration only)      │
│  ⚠️ Permissions-Policy blocks  (geolocation conflict)       │
└─────────────────────────────────────────────────────────────┘
```

---

*Generated by HotByte Security Audit — June 25, 2026*
