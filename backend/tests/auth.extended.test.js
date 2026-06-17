const request = require("supertest");

// Mock routes/database entirely so that its pool/connect code is never run
jest.mock("../routes/database", () => {
  return {
    query: jest.fn(),
  };
});

jest.mock("../routes/messageCentral", () => {
  return {
    sendOTP: jest.fn(),
    verifyOTP: jest.fn(),
  };
});

process.env.NODE_ENV = "test";
process.env.COOKIE_SECRET = "testsecret";
process.env.JWT_SECRET = "testsecret";

const app = require("../index");
const db = require("../routes/database");
const messageCentral = require("../routes/messageCentral");

describe("Auth Extended APIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/auth/session-check", () => {
    it("should return authenticated false if no session cookie exists", async () => {
      const res = await request(app).get("/api/auth/session-check");
      expect(res.body).toEqual({ authenticated: false });
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should clear session cookie and return success", async () => {
      const res = await request(app).post("/api/auth/logout");
      expect(res.body.success).toBe(true);
      expect(res.headers["set-cookie"]).toBeDefined();
    });
  });

  describe("POST /api/auth/guest-checkin", () => {
    it("should reject guest checkin with invalid name", async () => {
      const res = await request(app)
        .post("/api/auth/guest-checkin")
        .send({ name: "", hotel_slug: "test-hotel" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject guest checkin if hotel is frozen", async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ hotel_id: 1, customer_auth_required: false, is_frozen: true }],
      });

      const res = await request(app)
        .post("/api/auth/guest-checkin")
        .send({ name: "John Doe", hotel_slug: "test-hotel" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("frozen");
    });

    it("should reject guest checkin if hotel requires google auth", async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ hotel_id: 1, customer_auth_required: true, is_frozen: false }],
      });

      const res = await request(app)
        .post("/api/auth/guest-checkin")
        .send({ name: "John Doe", hotel_slug: "test-hotel" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.requireAuth).toBe(true);
    });

    it("should register guest and return session cookie when hotel is open and active", async () => {
      db.query
        // hotel check
        .mockResolvedValueOnce({
          rows: [{ hotel_id: 1, customer_auth_required: false, is_frozen: false }],
        })
        // check existing customer
        .mockResolvedValueOnce({ rows: [] })
        // insert customer
        .mockResolvedValueOnce({
          rows: [{ customer_id: 42, name: "John Doe", hotel_id: 1, email: "guest_john_doe_1@hotbyte.guest" }],
        })
        // delete old sessions
        .mockResolvedValueOnce({ rows: [] })
        // insert new session
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post("/api/auth/guest-checkin")
        .send({ name: "John Doe", hotel_slug: "test-hotel" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.customer.name).toBe("John Doe");
      expect(res.headers["set-cookie"]).toBeDefined();
    });
  });

  describe("POST /api/auth/admin/forgot-otp", () => {
    it("should reject if username or phone is missing", async () => {
      const res = await request(app)
        .post("/api/auth/admin/forgot-otp")
        .send({ username: "admin" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject if phone number is invalid", async () => {
      const res = await request(app)
        .post("/api/auth/admin/forgot-otp")
        .send({ username: "admin", phone: "123" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject if admin does not exist", async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post("/api/auth/admin/forgot-otp")
        .send({ username: "nonexistent", phone: "9876543210" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should reject if admin is not super_admin", async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ admin_id: 2, username: "subadmin", role: "admin", phone: "9876543210" }],
      });

      const res = await request(app)
        .post("/api/auth/admin/forgot-otp")
        .send({ username: "subadmin", phone: "9876543210" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should send OTP successfully for valid Super Admin matching phone number", async () => {
      // Admin query
      db.query.mockResolvedValueOnce({
        rows: [{ admin_id: 1, username: "superadmin", role: "super_admin", phone: "9876543210" }],
      });
      // otpStoreGet — no existing OTP
      db.query.mockResolvedValueOnce({ rows: [] });
      // otpStoreDelete
      db.query.mockResolvedValueOnce({ rows: [] });
      // otpStoreSet (INSERT)
      db.query.mockResolvedValueOnce({ rows: [] });
      messageCentral.sendOTP.mockResolvedValueOnce({
        success: true,
        verificationId: "test-v-id",
      });

      const res = await request(app)
        .post("/api/auth/admin/forgot-otp")
        .send({ username: "superadmin", phone: "9876543210" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(messageCentral.sendOTP).toHaveBeenCalledWith("9876543210");
    });
  });
});
