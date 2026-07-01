const path = require("path");
const request = require("supertest");

jest.mock("../routes/database", () => ({
  query: jest.fn(),
}));

process.env.NODE_ENV = "test";
process.env.COOKIE_SECRET = "testsecret";
process.env.JWT_SECRET = "testsecret";

const app = require("../index");
const db = require("../routes/database");
const {
  validateImageUpload,
  validateMagicBytes,
} = require("../middleware/validateImageUpload");

function createMockFile(size, name = "test.jpg", mimeType = "image/jpeg", buffer = null) {
  if (!buffer) {
    buffer = Buffer.alloc(size);
    if (name.match(/\.jpe?g$/i)) {
      buffer[0] = 0xFF; buffer[1] = 0xD8; buffer[2] = 0xFF;
    } else if (name.match(/\.png$/i)) {
      buffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    } else if (name.match(/\.webp$/i)) {
      buffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50,
      ]);
    }
  }
  return { size, originalname: name, mimetype: mimeType, buffer };
}

describe("validateImageUpload middleware", () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = { file: null };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it("should call next() if no file is present", () => {
    validateImageUpload(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it("should reject files larger than 200 KB", () => {
    mockReq.file = createMockFile(201 * 1024);
    validateImageUpload(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Image size exceeds 200 KB limit.",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should accept files exactly 200 KB", () => {
    mockReq.file = createMockFile(200 * 1024);
    validateImageUpload(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should accept files under 200 KB (199 KB)", () => {
    mockReq.file = createMockFile(199 * 1024);
    validateImageUpload(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should reject invalid file extensions", () => {
    mockReq.file = createMockFile(100 * 1024, "test.exe");
    validateImageUpload(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid image format. Only JPG, JPEG, PNG and WEBP are allowed.",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should reject invalid MIME types", () => {
    mockReq.file = createMockFile(100 * 1024, "test.jpg", "text/plain");
    validateImageUpload(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should reject fake image content (magic bytes mismatch)", () => {
    mockReq.file = createMockFile(100 * 1024, "test.jpg", "image/jpeg", Buffer.alloc(100));
    validateImageUpload(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should accept valid JPEG file", () => {
    mockReq.file = createMockFile(50 * 1024, "photo.jpg");
    validateImageUpload(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should accept valid PNG file", () => {
    mockReq.file = createMockFile(50 * 1024, "photo.png", "image/png");
    validateImageUpload(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should accept valid WEBP file", () => {
    mockReq.file = createMockFile(50 * 1024, "photo.webp", "image/webp");
    validateImageUpload(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should accept JPEG extension with uppercase", () => {
    mockReq.file = createMockFile(50 * 1024, "photo.JPEG", "image/jpeg");
    validateImageUpload(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should reject script files disguised as images", () => {
    mockReq.file = createMockFile(50 * 1024, "script.jpg", "image/jpeg", Buffer.from("<script>alert('xss')</script>"));
    validateImageUpload(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/items image upload validation", () => {
  let mockAdminSession;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminSession = {
      adminId: 5,
      username: "testadmin",
      hotelId: 10,
      role: "admin",
    };

    db.query.mockImplementation((queryText) => {
      if (queryText.includes("SELECT s.admin_id")) {
        return Promise.resolve({
          rows: [{
            admin_id: mockAdminSession.adminId,
            username: mockAdminSession.username,
            hotel_id: mockAdminSession.hotelId,
            role: mockAdminSession.role,
          }],
        });
      }
      if (queryText.includes("SELECT is_frozen")) {
        return Promise.resolve({ rows: [{ is_frozen: false }] });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  it("should reject item creation with image > 200 KB", async () => {
    const bigBuffer = Buffer.alloc(201 * 1024);
    bigBuffer[0] = 0xFF; bigBuffer[1] = 0xD8; bigBuffer[2] = 0xFF;

    const res = await request(app)
      .post("/api/admin/items")
      .set("Cookie", ["adminSessionId=valid_session_id"])
      .field("item_name", "Test Item")
      .field("category_id", "1")
      .field("price", "100")
      .field("is_veg", "true")
      .field("is_available", "true")
      .attach("image", bigBuffer, "test.jpg");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Image size exceeds 200 KB");
  });

  it("should reject item creation with invalid file type", async () => {
    const buffer = Buffer.from("<svg>malicious</svg>");

    const res = await request(app)
      .post("/api/admin/items")
      .set("Cookie", ["adminSessionId=valid_session_id"])
      .field("item_name", "Test Item")
      .field("category_id", "1")
      .field("price", "100")
      .field("is_veg", "true")
      .field("is_available", "true")
      .attach("image", buffer, "test.svg");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should accept item creation with valid small image", async () => {
    const smallBuffer = Buffer.alloc(50 * 1024);
    smallBuffer[0] = 0xFF; smallBuffer[1] = 0xD8; smallBuffer[2] = 0xFF;

    db.query.mockImplementation((queryText, params) => {
      if (queryText.includes("SELECT s.admin_id")) {
        return Promise.resolve({
          rows: [{
            admin_id: mockAdminSession.adminId,
            username: mockAdminSession.username,
            hotel_id: mockAdminSession.hotelId,
            role: mockAdminSession.role,
          }],
        });
      }
      if (queryText.includes("SELECT is_frozen")) {
        return Promise.resolve({ rows: [{ is_frozen: false }] });
      }
      if (queryText.includes("SELECT hotel_type")) {
        return Promise.resolve({ rows: [{ hotel_type: "nonveg" }] });
      }
      if (queryText.includes("INSERT INTO menu_items")) {
        return Promise.resolve({
          rows: [{
            item_id: 1,
            item_name: "Test Item",
            category_id: 1,
            price: "100",
            image_url: "/uploads/menu-items/test.jpg",
            description: null,
            is_available: true,
            is_veg: false,
          }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post("/api/admin/items")
      .set("Cookie", ["adminSessionId=valid_session_id"])
      .field("item_name", "Test Item")
      .field("category_id", "1")
      .field("price", "100")
      .field("is_veg", "false")
      .field("is_available", "true")
      .attach("image", smallBuffer, "test.jpg");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("validateMagicBytes", () => {
  it("should detect valid JPEG header", () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
    expect(validateMagicBytes(buf)).toBe(true);
  });

  it("should detect valid PNG header", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    expect(validateMagicBytes(buf)).toBe(true);
  });

  it("should detect valid WEBP header (RIFF + WEBP)", () => {
    const buf = Buffer.alloc(12);
    buf[0] = 0x52; buf[1] = 0x49; buf[2] = 0x46; buf[3] = 0x46; // RIFF
    buf[8] = 0x57; buf[9] = 0x45; buf[10] = 0x42; buf[11] = 0x50; // WEBP
    expect(validateMagicBytes(buf)).toBe(true);
  });

  it("should reject invalid headers", () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    expect(validateMagicBytes(buf)).toBe(false);
  });

  it("should reject empty buffer", () => {
    expect(validateMagicBytes(Buffer.alloc(0))).toBe(false);
  });

  it("should reject null/undefined buffer", () => {
    expect(validateMagicBytes(null)).toBe(false);
    expect(validateMagicBytes(undefined)).toBe(false);
  });
});
