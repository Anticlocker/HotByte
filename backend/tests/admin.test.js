const request = require("supertest");
const xss = require("xss");

// Mock database
jest.mock("../routes/database", () => {
  return {
    query: jest.fn(),
  };
});

process.env.NODE_ENV = "test";
process.env.COOKIE_SECRET = "testsecret";
process.env.JWT_SECRET = "testsecret";

const app = require("../index");
const db = require("../routes/database");

describe("Admin APIs", () => {
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

  describe("GET /api/admin/categories", () => {
    it("should reject access if unauthorized", async () => {
      // Mock verifyAdminSession to return null
      db.query.mockImplementation((queryText) => {
        if (queryText.includes("SELECT s.admin_id")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app).get("/api/admin/categories");
      expect(res.status).toBe(401);
    });

    it("should return categories for the assigned hotel", async () => {
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
        if (queryText.includes("SELECT category_id, category_name FROM menu_category")) {
          return Promise.resolve({
            rows: [
              { category_id: 1, category_name: "Appetizers" },
              { category_id: 2, category_name: "Desserts" },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get("/api/admin/categories")
        .set("Cookie", ["adminSessionId=valid_session_id"]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.categories.length).toBe(2);
      expect(res.body.categories[0].category_name).toBe("Appetizers");
    });
  });

  describe("POST /api/admin/categories", () => {
    it("should reject creation if category name is missing", async () => {
      const res = await request(app)
        .post("/api/admin/categories")
        .set("Cookie", ["adminSessionId=valid_session_id"])
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Category name is required");
    });

    it("should create category successfully and return it", async () => {
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
        if (queryText.includes("INSERT INTO menu_category")) {
          return Promise.resolve({
            rows: [{ category_id: 3, category_name: "Main Course" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post("/api/admin/categories")
        .set("Cookie", ["adminSessionId=valid_session_id"])
        .send({ category_name: "Main Course" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.category.category_name).toBe("Main Course");
    });
  });

  describe("PUT /api/admin/categories/:id", () => {
    it("should update category successfully", async () => {
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
        if (queryText.includes("UPDATE menu_category")) {
          return Promise.resolve({
            rows: [{ category_id: 1, category_name: "Starters" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put("/api/admin/categories/1")
        .set("Cookie", ["adminSessionId=valid_session_id"])
        .send({ category_name: "Starters" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.category.category_name).toBe("Starters");
    });
  });
});
