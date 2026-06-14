const request = require("supertest");

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

const app = require("../index");
const db = require("../routes/database");

describe("Superadmin APIs", () => {
  let mockSuperAdminSession;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSuperAdminSession = {
      adminId: 1,
      username: "superadmin",
      hotelId: null,
      role: "super_admin",
    };

    // Default mock for superadmin session verification
    db.query.mockImplementation((queryText, params) => {
      if (queryText.includes("SELECT s.admin_id")) {
        return Promise.resolve({
          rows: [
            {
              admin_id: mockSuperAdminSession.adminId,
              username: mockSuperAdminSession.username,
              hotel_id: mockSuperAdminSession.hotelId,
              role: mockSuperAdminSession.role,
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  describe("GET /api/superadmin/hotels", () => {
    it("should reject access if logged in as regular admin", async () => {
      // Mock session to be a regular admin
      db.query.mockImplementation((queryText, params) => {
        if (queryText.includes("SELECT s.admin_id")) {
          return Promise.resolve({
            rows: [
              {
                admin_id: 5,
                username: "regularadmin",
                hotel_id: 10,
                role: "admin",
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

      const res = await request(app)
        .get("/api/superadmin/hotels")
        .set("x-session-id", "valid_session_id");

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Super Admin privileges required");
    });

    it("should return the list of hotels when requested by superadmin", async () => {
      db.query.mockImplementation((queryText, params) => {
        if (queryText.includes("SELECT s.admin_id")) {
          return Promise.resolve({
            rows: [
              {
                admin_id: 1,
                username: "superadmin",
                hotel_id: null,
                role: "super_admin",
              },
            ],
          });
        }
        if (queryText.includes("public.hotels h")) {
          return Promise.resolve({
            rows: [
              {
                hotel_id: 10,
                name: "Test Hotel",
                slug: "test-hotel",
                phone: "1234567890",
                address: "Hotel Address",
                created_at: new Date(),
                is_frozen: false,
                plan: "pro",
                trial_ends_at: null,
                table_count: 5,
                latitude: 12.9716,
                longitude: 77.5946,
                order_radius: 30,
                hotel_type: "both",
                require_customer_auth: false,
                customer_auth_required: false,
                suspicious_activity_mode: false,
                manager_count: 1,
                item_count: 15,
                order_count: 25,
                total_revenue: 5500.0,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get("/api/superadmin/hotels")
        .set("x-session-id", "valid_session_id");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.hotels.length).toBe(1);
      expect(res.body.hotels[0].name).toBe("Test Hotel");
      expect(res.body.hotels[0].totalRevenue).toBe(5500.0);
    });
  });

  describe("PUT /api/superadmin/hotels/:id/location-ordering", () => {
    it("should allow superadmin to override location ordering setting", async () => {
      db.query.mockImplementation((queryText, params) => {
        if (queryText.includes("SELECT s.admin_id")) {
          return Promise.resolve({
            rows: [{ admin_id: 1, username: "superadmin", hotel_id: null, role: "super_admin" }]
          });
        }
        if (queryText.includes("SELECT hotel_id FROM public.hotels")) {
          return Promise.resolve({
            rows: [{ hotel_id: 10 }]
          });
        }
        if (queryText.includes("UPDATE public.hotels")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put("/api/superadmin/hotels/10/location-ordering")
        .set("x-session-id", "valid_session_id")
        .send({ locationOrderingEnabled: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("setting overridden successfully");
    });
  });
});
