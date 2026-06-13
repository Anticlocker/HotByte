const request = require("supertest");

// Mock database
jest.mock("../routes/database", () => {
  return {
    query: jest.fn(),
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn(),
    })),
  };
});

process.env.NODE_ENV = "test";
process.env.COOKIE_SECRET = "testsecret";
process.env.JWT_SECRET = "testsecret";

const app = require("../index");
const db = require("../routes/database");

describe("Admin Extended APIs", () => {
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
      if (queryText.includes("SELECT hotel_type")) {
        return Promise.resolve({
          rows: [{ hotel_type: "both" }],
        });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  describe("DELETE /api/admin/categories/:id", () => {
    it("should return 404 if category to delete is not found", async () => {
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
        if (queryText.includes("DELETE FROM menu_category")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .delete("/api/admin/categories/999")
        .set("Cookie", ["adminSessionId=valid_session_id"]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should delete category successfully", async () => {
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
        if (queryText.includes("DELETE FROM menu_category")) {
          return Promise.resolve({ rows: [{ category_id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .delete("/api/admin/categories/1")
        .set("Cookie", ["adminSessionId=valid_session_id"]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("POST /api/admin/items", () => {
    it("should reject creation if item name, category, or price is missing", async () => {
      const res = await request(app)
        .post("/api/admin/items")
        .set("Cookie", ["adminSessionId=valid_session_id"])
        .send({ item_name: "Burger" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should create item successfully", async () => {
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
        if (queryText.includes("SELECT hotel_type")) {
          return Promise.resolve({ rows: [{ hotel_type: "both" }] });
        }
        if (queryText.includes("INSERT INTO menu_items")) {
          return Promise.resolve({
            rows: [{ item_id: 100, item_name: "Veg Burger", price: 120 }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post("/api/admin/items")
        .set("Cookie", ["adminSessionId=valid_session_id"])
        .send({
          item_name: "Veg Burger",
          category_id: 1,
          price: 120,
          description: "Yummy burger",
          is_available: true,
          is_veg: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.item.item_name).toBe("Veg Burger");
    });
  });

  describe("PUT /api/admin/orders/:id/status", () => {
    it("should reject if status is invalid", async () => {
      const res = await request(app)
        .put("/api/admin/orders/1/status")
        .set("Cookie", ["adminSessionId=valid_session_id"])
        .send({ status: "invalid_status" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should update order status successfully", async () => {
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
        if (queryText.includes("SELECT hotel_id FROM orders")) {
          return Promise.resolve({ rows: [{ hotel_id: mockAdminSession.hotelId }] });
        }
        if (queryText.includes("UPDATE orders")) {
          return Promise.resolve({
            rows: [{ order_id: 1, status: "preparing" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put("/api/admin/orders/1/status")
        .set("Cookie", ["adminSessionId=valid_session_id"])
        .send({ status: "preparing" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order.status).toBe("preparing");
    });
  });

  describe("GET /api/admin/dashboard/stats", () => {
    it("should return dashboard statistics successfully", async () => {
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
        if (queryText.includes("COALESCE(SUM(total_amount)")) {
          // revenue query returns a column named 'total'
          return Promise.resolve({ rows: [{ total: 15400 }] });
        }
        if (queryText.includes("COUNT(*)") || queryText.includes("COUNT(DISTINCT")) {
          // orders count query returns a column named 'count'
          return Promise.resolve({ rows: [{ count: 12 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get("/api/admin/dashboard/stats")
        .set("Cookie", ["adminSessionId=valid_session_id"]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toBeDefined();
    });
  });
});
