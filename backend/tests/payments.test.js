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

describe("Payments APIs", () => {
  let mockCustomerSession;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomerSession = {
      customerId: 1,
      name: "John Customer",
      phone: "9876543210",
      email: "john@example.com",
      hotelId: 10,
    };

    // Default mock for session verification in requireAuth
    db.query.mockImplementation((queryText, params) => {
      if (queryText.includes("SELECT s.customer_id")) {
        return Promise.resolve({
          rows: [
            {
              customer_id: mockCustomerSession.customerId,
              name: mockCustomerSession.name,
              phone: mockCustomerSession.phone,
              email: mockCustomerSession.email,
              dob: null,
              hotel_id: mockCustomerSession.hotelId,
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  describe("GET /api/payments/razorpay-key", () => {
    it("should return the base64 obfuscated key id", async () => {
      const res = await request(app)
        .get("/api/payments/razorpay-key")
        .set("Cookie", ["sessionId=valid_session_id"]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const decoded = Buffer.from(res.body.key, "base64").toString("utf-8");
      expect(decoded).toBe("rzp_test_key_id");
    });
  });

  describe("POST /api/payments/create-razorpay-order", () => {
    it("should create razorpay order via razorpay sdk", async () => {
      mockCreate.mockResolvedValueOnce({
        id: "order_mock123",
        amount: 50000,
        currency: "INR",
      });

      const res = await request(app)
        .post("/api/payments/create-razorpay-order")
        .set("Cookie", ["sessionId=valid_session_id"])
        .send({ amount: 500 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.razorpay_order.id).toBe("order_mock123");
      expect(mockCreate).toHaveBeenCalledWith({
        amount: 50000,
        currency: "INR",
        receipt: expect.any(String),
      });
    });
  });

  describe("POST /api/payments/verify", () => {
    it("should reject verify if signature does not match", async () => {
      db.query.mockImplementation((queryText, params) => {
        if (queryText.includes("SELECT s.customer_id")) {
          return Promise.resolve({
            rows: [
              {
                customer_id: mockCustomerSession.customerId,
                name: mockCustomerSession.name,
                phone: mockCustomerSession.phone,
                email: mockCustomerSession.email,
                dob: null,
                hotel_id: mockCustomerSession.hotelId,
              },
            ],
          });
        }
        if (queryText.includes("SELECT order_id")) {
          return Promise.resolve({
            rows: [{ order_id: 100, customer_id: 1, total_amount: 500.0 }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post("/api/payments/verify")
        .set("Cookie", ["sessionId=valid_session_id"])
        .send({
          order_id: 100,
          razorpay_order_id: "order_id",
          razorpay_payment_id: "payment_id",
          razorpay_signature: "wrong_sig",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Invalid payment signature");
    });

    it("should accept verify if signature matches and update payment", async () => {
      const razorpay_order_id = "order_id";
      const razorpay_payment_id = "payment_id";
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const razorpay_signature = crypto
        .createHmac("sha256", "rzp_test_key_secret")
        .update(text)
        .digest("hex");

      db.query.mockImplementation((queryText, params) => {
        if (queryText.includes("SELECT s.customer_id")) {
          return Promise.resolve({
            rows: [
              {
                customer_id: mockCustomerSession.customerId,
                name: mockCustomerSession.name,
                phone: mockCustomerSession.phone,
                email: mockCustomerSession.email,
                dob: null,
                hotel_id: mockCustomerSession.hotelId,
              },
            ],
          });
        }
        if (queryText.includes("SELECT order_id, customer_id")) {
          return Promise.resolve({
            rows: [{ order_id: 100, customer_id: 1, total_amount: 500.0 }],
          });
        }
        if (queryText.includes("SELECT payment_id FROM payments WHERE razorpay_payment_id = $1")) {
          return Promise.resolve({ rows: [] }); // no duplicate
        }
        if (queryText.includes("SELECT payment_id FROM payments WHERE order_id = $1")) {
          return Promise.resolve({ rows: [{ payment_id: 200 }] }); // existing record
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post("/api/payments/verify")
        .set("Cookie", ["sessionId=valid_session_id"])
        .send({
          order_id: 100,
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Payment verified and saved");
    });
  });

  describe("POST /api/payments/validate-account", () => {
    it("should return success if username and email are available", async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // username check empty
      db.query.mockResolvedValueOnce({ rows: [] }); // email check empty

      const res = await request(app)
        .post("/api/payments/validate-account")
        .send({ username: "available_user", email: "test@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Username and email are available");
    });
  });
});
