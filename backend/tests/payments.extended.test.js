const request = require("supertest");
const crypto = require("crypto");

// Mock Razorpay
const mockCreate = jest.fn();
jest.mock("razorpay", () => {
  return jest.fn().mockImplementation(() => {
    return {
      orders: {
        create: mockCreate,
      },
    };
  });
});

// Mock database
jest.mock("../routes/database", () => {
  const mClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  };
  return {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn().mockResolvedValue(mClient),
  };
});

process.env.NODE_ENV = "test";
process.env.COOKIE_SECRET = "testsecret";
process.env.JWT_SECRET = "testsecret";
process.env.RAZORPAY_KEY_ID = "rzp_test_key_id";
process.env.RAZORPAY_KEY_SECRET = "rzp_test_key_secret";

const app = require("../index");
const db = require("../routes/database");

describe("Payments Extended APIs", () => {
  let mockAdminSession;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminSession = {
      adminId: 5,
      username: "testadmin",
      hotelId: 10,
      role: "admin",
    };

    // Default mock for admin session verification
    db.query.mockImplementation((queryText, params) => {
      if (queryText.includes("SELECT s.admin_id")) {
        return Promise.resolve({
          rows: [
            {
              admin_id: mockAdminSession.adminId,
              username: mockAdminSession.username,
              hotel_id: mockAdminSession.hotelId,
              role: mockAdminSession.role,
            },
          ],
        });
      }
      if (queryText.includes("SELECT is_frozen")) {
        return Promise.resolve({
          rows: [{ is_frozen: false }],
        });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  describe("POST /api/payments/create-subscription-order", () => {
    it("should reject if plan is missing or invalid", async () => {
      const res = await request(app)
        .post("/api/payments/create-subscription-order")
        .set("Cookie", ["adminSessionId=valid_session_id"])
        .send({ hotel_slug: "test-slug" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      const res2 = await request(app)
        .post("/api/payments/create-subscription-order")
        .set("Cookie", ["adminSessionId=valid_session_id"])
        .send({ plan: "invalid-plan", hotel_slug: "test-slug" });

      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
    });

    it("should create subscription order via Razorpay for valid plan", async () => {
      db.query.mockImplementation((queryText) => {
        if (queryText.includes("SELECT s.admin_id")) {
          return Promise.resolve({
            rows: [
              {
                admin_id: mockAdminSession.adminId,
                username: mockAdminSession.username,
                hotel_id: mockAdminSession.hotelId,
                role: mockAdminSession.role,
              },
            ],
          });
        }
        if (queryText.includes("SELECT is_frozen")) {
          return Promise.resolve({ rows: [{ is_frozen: false }] });
        }
        if (queryText.includes("SELECT slug FROM public.hotels")) {
          return Promise.resolve({ rows: [{ slug: "test-slug" }] });
        }
        if (queryText.includes("SELECT price_monthly")) {
          return Promise.resolve({ rows: [{ price_monthly: 999, price_yearly: 11988 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      mockCreate.mockResolvedValueOnce({
        id: "sub_order_mock123",
        amount: 99900,
        currency: "INR",
      });

      const res = await request(app)
        .post("/api/payments/create-subscription-order")
        .set("Cookie", ["adminSessionId=valid_session_id"])
        .send({ plan: "basic", hotel_slug: "test-slug", billing_cycle: "monthly" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.razorpay_order.id).toBe("sub_order_mock123");
    });
  });

  describe("POST /api/payments/verify-subscription", () => {
    it("should reject verify-subscription if signature is invalid", async () => {
      db.query.mockImplementation((queryText) => {
        if (queryText.includes("SELECT s.admin_id")) {
          return Promise.resolve({
            rows: [
              {
                admin_id: mockAdminSession.adminId,
                username: mockAdminSession.username,
                hotel_id: mockAdminSession.hotelId,
                role: mockAdminSession.role,
              },
            ],
          });
        }
        if (queryText.includes("SELECT is_frozen")) {
          return Promise.resolve({ rows: [{ is_frozen: false }] });
        }
        if (queryText.includes("SELECT slug FROM public.hotels")) {
          return Promise.resolve({ rows: [{ slug: "test-slug" }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post("/api/payments/verify-subscription")
        .set("Cookie", ["adminSessionId=valid_session_id"])
        .send({
          plan: "basic",
          hotel_slug: "test-slug",
          razorpay_order_id: "order_id",
          razorpay_payment_id: "payment_id",
          razorpay_signature: "invalid_sig",
          billing_cycle: "monthly",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Invalid payment signature");
    });
  });

  describe("POST /api/payments/create-inactive-session", () => {
    it("should reject if plan is invalid", async () => {
      const res = await request(app)
        .post("/api/payments/create-inactive-session")
        .send({
          plan: "invalid-plan",
          billing_cycle: "monthly",
          username: "testuser",
          email: "test@example.com",
          password: "password123",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject if username or email already exists", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ admin_id: 10 }] }); // username check conflicts

      const res = await request(app)
        .post("/api/payments/create-inactive-session")
        .send({
          plan: "basic",
          billing_cycle: "monthly",
          username: "existinguser",
          email: "test@example.com",
          password: "password123",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Username is already taken");
    });
  });
});
