const request = require("supertest");
const crypto = require("crypto");

const mockClient = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  release: jest.fn(),
};

// Mock routes/database
jest.mock("../routes/database", () => {
  return {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn().mockResolvedValue(mockClient),
  };
});

process.env.NODE_ENV = "test";
process.env.COOKIE_SECRET = "testsecret";
process.env.JWT_SECRET = "testsecret";
process.env.RAZORPAY_KEY_SECRET = "test_razorpay_secret";

const app = require("../index");
const db = require("../routes/database");

describe("Orders APIs", () => {
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

    // Default mock for queries
    db.query.mockImplementation((queryText, params) => {
      // 1. Session verification check
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
      // 2. Subscription check query
      if (queryText.includes("is_frozen, plan, trial_ends_at")) {
        return Promise.resolve({
          rows: [
            {
              hotel_id: 10,
              is_frozen: false,
              plan: "pro",
              trial_ends_at: null,
            },
          ],
        });
      }
      // 3. Hotel get/check query
      if (queryText.includes("SELECT hotel_id, is_open")) {
        return Promise.resolve({
          rows: [
            {
              hotel_id: 10,
              is_open: true,
              latitude: null,
              longitude: null,
              order_radius: 30,
            },
          ],
        });
      }
      // 4. Hotel table count check query
      if (queryText.includes("SELECT table_count")) {
        return Promise.resolve({
          rows: [{ table_count: 5 }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    // Default mock for client queries (transactions)
    mockClient.query.mockImplementation((queryText, params) => {
      if (queryText.includes("INSERT INTO orders")) {
        return Promise.resolve({
          rows: [
            {
              order_id: 100,
              customer_id: 1,
              table_number: "T-1",
              total_amount: 300.0,
              status: "pending",
              created_at: new Date(),
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  describe("POST /api/orders/create", () => {
    it("should reject order if unauthorized", async () => {
      // Mock verifySession to return null (unauthorized)
      db.query.mockImplementation((queryText) => {
        if (queryText.includes("SELECT s.customer_id")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post("/api/orders/create")
        .send({ items: [{ item_id: 1, quantity: 2 }], table_number: "T-1" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject order if items are empty", async () => {
      const res = await request(app)
        .post("/api/orders/create")
        .set("x-session-id", "valid_session_id")
        .send({ items: [], table_number: "T-1" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Cart is empty");
    });

    it("should reject order if table_number is missing", async () => {
      const res = await request(app)
        .post("/api/orders/create")
        .set("x-session-id", "valid_session_id")
        .send({ items: [{ item_id: 1, quantity: 2 }] });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Table number is required");
    });

    it("should process order successfully when valid", async () => {
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
        if (queryText.includes("is_frozen, plan, trial_ends_at")) {
          return Promise.resolve({
            rows: [{ hotel_id: 10, is_frozen: false, plan: "pro", trial_ends_at: null }],
          });
        }
        if (queryText.includes("SELECT hotel_id, is_open")) {
          return Promise.resolve({
            rows: [
              {
                hotel_id: 10,
                is_open: true,
                latitude: null,
                longitude: null,
                order_radius: 30,
              },
            ],
          });
        }
        if (queryText.includes("SELECT order_id FROM orders")) {
          return Promise.resolve({ rows: [] }); // table not occupied
        }
        if (queryText.includes("SELECT item_id, price FROM public.menu_items")) {
          return Promise.resolve({
            rows: [{ item_id: 1, price: 150.0 }],
          });
        }
        if (queryText.includes("INSERT INTO orders")) {
          return Promise.resolve({
            rows: [
              {
                order_id: 100,
                customer_id: 1,
                table_number: "T-1",
                total_amount: 300.0,
                status: "pending",
                created_at: new Date(),
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post("/api/orders/create")
        .set("x-session-id", "valid_session_id")
        .send({
          items: [{ item_id: 1, quantity: 2 }],
          table_number: "T-1",
          hotel_slug: "test-hotel",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order.order_id).toBe(100);
      expect(res.body.order.total_amount).toBe(300.0);
    });

    it("should reject order if location_ordering_enabled is TRUE and customer is outside radius", async () => {
      db.query.mockImplementation((queryText, params) => {
        if (queryText.includes("SELECT s.customer_id")) {
          return Promise.resolve({
            rows: [{ customer_id: 1, name: "John Customer", phone: "9876543210", email: "john@example.com", dob: null, hotel_id: 10 }]
          });
        }
        if (queryText.includes("is_frozen, plan, trial_ends_at")) {
          return Promise.resolve({
            rows: [{ hotel_id: 10, is_frozen: false, plan: "pro", trial_ends_at: null }]
          });
        }
        if (queryText.includes("SELECT hotel_id, is_open")) {
          return Promise.resolve({
            rows: [{ hotel_id: 10, is_open: true, latitude: 18.5204, longitude: 73.8567, order_radius: 30, location_ordering_enabled: true }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post("/api/orders/create")
        .set("x-session-id", "valid_session_id")
        .send({
          items: [{ item_id: 1, quantity: 2 }],
          table_number: "T-1",
          hotel_slug: "test-hotel",
          customerLat: 19.5204,
          customerLng: 74.8567,
        });

      expect(res.status).toBe(403);
      expect(res.body.locationError).toBe(true);
    });

    it("should allow order if location_ordering_enabled is FALSE even if customer is outside radius", async () => {
      db.query.mockImplementation((queryText, params) => {
        if (queryText.includes("SELECT s.customer_id")) {
          return Promise.resolve({
            rows: [{ customer_id: 1, name: "John Customer", phone: "9876543210", email: "john@example.com", dob: null, hotel_id: 10 }]
          });
        }
        if (queryText.includes("is_frozen, plan, trial_ends_at")) {
          return Promise.resolve({
            rows: [{ hotel_id: 10, is_frozen: false, plan: "pro", trial_ends_at: null }]
          });
        }
        if (queryText.includes("SELECT hotel_id, is_open")) {
          return Promise.resolve({
            rows: [{ hotel_id: 10, is_open: true, latitude: 18.5204, longitude: 73.8567, order_radius: 30, location_ordering_enabled: false }]
          });
        }
        if (queryText.includes("SELECT order_id FROM orders")) {
          return Promise.resolve({ rows: [] });
        }
        if (queryText.includes("SELECT item_id, price FROM public.menu_items")) {
          return Promise.resolve({
            rows: [{ item_id: 1, price: 150.0 }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post("/api/orders/create")
        .set("x-session-id", "valid_session_id")
        .send({
          items: [{ item_id: 1, quantity: 2 }],
          table_number: "T-1",
          hotel_slug: "test-hotel",
          customerLat: 19.5204,
          customerLng: 74.8567,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("GET /api/orders/table-availability", () => {
    it("should return occupied and available tables", async () => {
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
        if (queryText.includes("is_frozen, plan, trial_ends_at")) {
          return Promise.resolve({
            rows: [{ hotel_id: 10, is_frozen: false, plan: "pro", trial_ends_at: null }],
          });
        }
        if (queryText.includes("SELECT hotel_id FROM public.hotels")) {
          return Promise.resolve({
            rows: [{ hotel_id: 10 }],
          });
        }
        if (queryText.includes("DISTINCT table_number")) {
          return Promise.resolve({
            rows: [{ table_number: "T-1" }, { table_number: "T-3" }],
          });
        }
        if (queryText.includes("SELECT table_count FROM public.hotels")) {
          return Promise.resolve({
            rows: [{ table_count: 5 }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get("/api/orders/table-availability")
        .set("x-session-id", "valid_session_id")
        .query({ hotel_slug: "test-hotel" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.occupied).toContain("T-1");
      expect(res.body.occupied).toContain("T-3");
      expect(res.body.available).toContain("T-2");
      expect(res.body.available).toContain("T-4");
      expect(res.body.available).toContain("T-5");
    });
  });

  describe("DELETE /api/orders/cancel/:id", () => {
    it("should cancel pending unpaid order successfully", async () => {
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
        if (queryText.includes("SELECT order_id, status FROM orders")) {
          return Promise.resolve({
            rows: [{ order_id: 100, status: "pending" }],
          });
        }
        if (queryText.includes("SELECT payment_status FROM payments")) {
          return Promise.resolve({
            rows: [{ payment_status: "pending" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .delete("/api/orders/cancel/100")
        .set("x-session-id", "valid_session_id");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("cancelled successfully");
    });

    it("should prevent cancellation if order is already preparing", async () => {
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
        if (queryText.includes("SELECT order_id, status FROM orders")) {
          return Promise.resolve({
            rows: [{ order_id: 100, status: "preparing" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .delete("/api/orders/cancel/100")
        .set("x-session-id", "valid_session_id");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Cannot cancel order");
    });
  });
});
