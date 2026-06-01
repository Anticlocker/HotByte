const request = require("supertest");

// Mock routes/database entirely so that its pool/connect code is never run
jest.mock("../routes/database", () => {
  return {
    query: jest.fn(),
  };
});

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.COOKIE_SECRET = "testsecret";
process.env.JWT_SECRET = "testsecret";

const app = require("../index");
const db = require("../routes/database");

describe("Auth APIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/admin/login", () => {
    it("should reject login with missing credentials", async () => {
      const res = await request(app)
        .post("/api/auth/admin/login")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Username, password, and role required.");
    });

    it("should reject login with incorrect credentials", async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // User not found

      const res = await request(app)
        .post("/api/auth/admin/login")
        .send({ username: "wronguser", password: "password", role: "admin" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Invalid credentials.");
    });
  });

  describe("POST /api/auth/admin/signup", () => {
    it("should require authentication to register admins", async () => {
      const res = await request(app)
        .post("/api/auth/admin/signup")
        .send({ username: "newadmin", password: "password", confirmPassword: "password" });

      expect(res.status).toBe(401); // Unauthorized because requireAdmin checks cookie
    });
  });
});
