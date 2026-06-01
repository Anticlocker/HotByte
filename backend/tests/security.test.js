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

describe("Security Sanitization APIs", () => {
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

  it("should sanitize XSS payloads in category names", async () => {
    const maliciousPayload = "<script>alert('xss')</script>Sweet Appetizer";
    const expectedSanitized = xss(maliciousPayload);

    let capturedInsertParams = null;
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
        capturedInsertParams = params;
        return Promise.resolve({
          rows: [{ category_id: 3, category_name: expectedSanitized }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post("/api/admin/categories")
      .set("Cookie", ["adminSessionId=valid_session_id"])
      .send({ category_name: maliciousPayload });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.category.category_name).toBe(expectedSanitized);
    expect(capturedInsertParams[0]).toBe(expectedSanitized);
    expect(capturedInsertParams[0]).not.toContain("<script>");
  });
});
