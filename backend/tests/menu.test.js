const request = require("supertest");

// Mock routes/database
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

describe("Menu APIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    db.query.mockImplementation((queryText, params) => {
      const slug = params && params[0];

      // 1. Subscription check query
      if (queryText.includes("is_frozen, plan, trial_ends_at")) {
        if (slug === "nonexistent") {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({
          rows: [
            {
              hotel_id: 1,
              is_frozen: slug === "frozen-hotel",
              plan: "pro",
              trial_ends_at: null,
            },
          ],
        });
      }

      // 2. Hotel categories/status query
      if (queryText.includes("SELECT hotel_id, name, logo_url") || queryText.includes("SELECT name, logo_url")) {
        if (slug === "nonexistent") {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({
          rows: [
            {
              hotel_id: 1,
              name: "Tasty Bytes",
              logo_url: "logo.png",
              is_frozen: slug === "frozen-hotel",
              is_open: true,
              table_count: 8,
              hotel_type: "both",
            },
          ],
        });
      }

      // 3. Hotel items query check
      if (queryText.includes("SELECT hotel_id, is_frozen, hotel_type")) {
        if (slug === "nonexistent") {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({
          rows: [
            {
              hotel_id: 1,
              is_frozen: slug === "frozen-hotel",
              hotel_type: "both",
            },
          ],
        });
      }

      // 4. Categories query
      if (queryText.includes("SELECT category_id, category_name")) {
        return Promise.resolve({
          rows: [
            { category_id: 1, category_name: "Starters" },
            { category_id: 2, category_name: "Desserts" },
          ],
        });
      }

      // 5. Items query
      if (queryText.includes("menu_items")) {
        return Promise.resolve({
          rows: [
            { item_id: 10, item_name: "Veg Burger", price: 120 },
            { item_id: 11, item_name: "Chicken Burger", price: 180 },
          ],
        });
      }

      return Promise.resolve({ rows: [] });
    });
  });

  describe("GET /api/menu/categories", () => {
    it("should return 404 if hotel not found", async () => {
      const res = await request(app)
        .get("/api/menu/categories")
        .query({ hotel_slug: "nonexistent" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("not found");
    });

    it("should return 403 if hotel is frozen", async () => {
      const res = await request(app)
        .get("/api/menu/categories")
        .query({ hotel_slug: "frozen-hotel" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.isFrozen).toBe(true);
    });

    it("should return categories, table count, and configurations if hotel is open", async () => {
      const res = await request(app)
        .get("/api/menu/categories")
        .query({ hotel_slug: "open-hotel" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.categories).toHaveLength(2);
      expect(res.body.tableCount).toBe(8);
      expect(res.body.hotelName).toBe("Tasty Bytes");
    });
  });

  describe("GET /api/menu/items", () => {
    it("should return 404 if hotel is not found", async () => {
      const res = await request(app)
        .get("/api/menu/items")
        .query({ hotel_slug: "nonexistent" });

      expect(res.status).toBe(404);
    });

    it("should return 403 if hotel is frozen", async () => {
      const res = await request(app)
        .get("/api/menu/items")
        .query({ hotel_slug: "frozen-hotel" });

      expect(res.status).toBe(403);
      expect(res.body.isFrozen).toBe(true);
    });

    it("should return menu items for valid active hotel", async () => {
      const res = await request(app)
        .get("/api/menu/items")
        .query({ hotel_slug: "open-hotel" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toHaveLength(2);
    });
  });

  describe("GET /api/menu/status", () => {
    it("should return 404 if hotel not found", async () => {
      const res = await request(app)
        .get("/api/menu/status")
        .query({ hotel_slug: "nonexistent" });

      expect(res.status).toBe(404);
    });

    it("should return hotel metadata successfully", async () => {
      const res = await request(app)
        .get("/api/menu/status")
        .query({ hotel_slug: "tasty-bytes" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isOpen).toBe(true);
      expect(res.body.hotelName).toBe("Tasty Bytes");
    });
  });
});
