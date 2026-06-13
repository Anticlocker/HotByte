# Fixed Bugs Report

This report documents the bugs, test suite crashes, and JSX syntax errors fixed during the audit.

## Resolved Issues

### 1. Backend Menu Test Failures (`tests/menu.test.js`)
- **Symptoms:** `GET /api/menu/categories` threw `500 Server Error` (TypeError reading `rows` on undefined).
- **Cause:** The `checkSubscription` middleware introduced a new database query. The Jest sequential mock sequencing was off by one query, making the final categories query return `undefined`.
- **Fix:** Rewrote `tests/menu.test.js` to mock database queries dynamically using `db.query.mockImplementation` matching query text content.

### 2. Admin Extended Auth Middleware Failures (`tests/admin.extended.test.js` & `tests/payments.extended.test.js`)
- **Symptoms:** Requests received `403 Forbidden` instead of expected `404` or `200`.
- **Cause:** Mocked admin session structure used camelCase keys (`adminId`, `hotelId`), but the `requireAdmin` middleware checks database snake_case fields (`admin_id`, `hotel_id`), resulting in `hotel_id` evaluating to `undefined` (Access Denied).
- **Fix:** Fixed test database mocks to map and return authentic database snake_case columns.

### 3. Orders Test Failure (`tests/orders.test.js`)
- **Symptoms:** Order creation crashed with `TypeError: Cannot read properties of undefined (reading 'order_id')`.
- **Cause:** Inside database transactions, `client.query` (mockClient.query) returned `{ rows: [] }` for the insertion.
- **Fix:** Properly exposed `mockClient` as a shared mock reference and configured its `query` mock to return the created order object.

### 4. Admin Dashboard Stats Failures (`tests/admin.extended.test.js`)
- **Symptoms:** Dashboard stats endpoint returned `500 Server Error`.
- **Cause:** The query mock checked for `COUNT(order_id)` but the code ran `COUNT(*)` as `count`, which resulted in empty rows and crashed the parser.
- **Fix:** Updated the query checks to match SQL select expressions and map stats columns (`total`, `count`) correctly.
