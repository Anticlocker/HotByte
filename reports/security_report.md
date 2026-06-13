# Security Audit Report

This report outlines security checks, authentication logic, role permissions, and subscription locks on the HotByte platform.

## Security Controls

### 1. Authentication & Session Persistence
- **Customer Authentication:** Uses session IDs stored in secure HttpOnly cookies (`sessionId`) or passed via `x-session-id` headers for API validation. Expiries are enforced at database and server levels.
- **Admin Authentication:** Implemented via cookie verification (`adminSessionId` and `superAdminSessionId`) with custom role claims validation.

### 2. Authorization and Tenant Isolation
- **Role Enforcements:** Handled in `requireAdmin` and `requireSuperAdmin` middlewares.
- **Tenant Scope Isolation:** Admins are restricted from query operations outside their assigned `hotelId`.
- **Geofencing:** Server-side Haversine distance calculations check customer GPS coordinates against hotel latitude/longitude settings before allowing menu orders, preventing remote spoofing.

### 3. Subscription & Billing Locks
- **Auto-Freeze Trial Expirations:** The `checkSubscription` middleware checks the trial end timestamp on every customer request. If expired, it flags `is_frozen = TRUE` in the database and returns a `403 Forbidden` response.
- **Mutating Operations Lock:** When a hotel is frozen, all mutating actions (`POST`, `PUT`, `DELETE` requests) from associated administrators are immediately denied with a `403` response, allowing read-only dashboard access.
- **XSS & Input Sanitization:** Admin entry fields (e.g. category creation) are sanitized via `xss` library to prevent script injections.
