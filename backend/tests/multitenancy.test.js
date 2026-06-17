const request = require("supertest");

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

describe("Multi-Tenancy Isolation", () => {
  let mockCustomerSession;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomerSession = {
      customerId: 1,
      name: "John Customer",
      phone: "9876543210",
      email: "john@example.com",
      hotelId: 10, // Customer is registered to Hotel 10
    };

    // Default mock for customer session verification in requireAuth
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

  it("should prevent a customer registered to Hotel 10 from placing an order at Hotel 20", async () => {
    // Mock the hotel query to return Hotel 20
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
              hotel_id: 10, // Customer hotelId is 10
            },
          ],
        });
      }
      if (queryText.includes("public.hotels h") && queryText.includes("LEFT JOIN public.subscriptions")) {
        // Return hotel details for whatever slug was queried
        const slug = params[0];
        const hotelId = slug === "hotel-20-slug" ? 20 : 10;
        return Promise.resolve({
          rows: [{ hotel_id: hotelId, is_frozen: false, plan: "pro", trial_ends_at: null, subscription_expiry_date: null, subscription_status: null }]
        });
      }
      if (queryText.includes("SELECT hotel_id, is_open")) {
        return Promise.resolve({
          rows: [
            {
              hotel_id: 20, // Order destination is Hotel 20
              is_open: true,
              latitude: null,
              longitude: null,
              order_radius: 30,
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
        hotel_slug: "hotel-20-slug",
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("You are not registered with this hotel.");
  });

  it("should prevent a customer registered to Hotel 10 from checking table availability at Hotel 20", async () => {
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
              hotel_id: 10,
            },
          ],
        });
      }
      if (queryText.includes("public.hotels h") && queryText.includes("LEFT JOIN public.subscriptions")) {
        const slug = params[0];
        const hotelId = slug === "hotel-20-slug" ? 20 : 10;
        return Promise.resolve({
          rows: [{ hotel_id: hotelId, is_frozen: false, plan: "pro", trial_ends_at: null, subscription_expiry_date: null, subscription_status: null }]
        });
      }
      if (queryText.includes("SELECT hotel_id FROM public.hotels")) {
        return Promise.resolve({
          rows: [{ hotel_id: 20 }], // Target hotel is 20
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .get("/api/orders/table-availability")
      .set("x-session-id", "valid_session_id")
      .query({ hotel_slug: "hotel-20-slug" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("You are not registered with this hotel.");
  });
});
