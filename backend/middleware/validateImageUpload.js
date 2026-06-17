const path = require("path");

const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const ALLOWED_MIMETYPES = /^image\/(jpeg|jpg|png|webp)$/;

function getMaxSize(req) {
  return req.body?.type === "banner" ? 300 * 1024 : 200 * 1024;
}

const MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  webp: [0x52, 0x49, 0x46, 0x46],
};

function validateMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return false;

  const check = (magic) => {
    for (let i = 0; i < magic.length; i++) {
      if (buffer[i] !== magic[i]) return false;
    }

    if (magic === MAGIC_BYTES.webp) {
      if (buffer.length < 12) return false;
      const webpMarker = [0x57, 0x45, 0x42, 0x50];
      for (let i = 0; i < webpMarker.length; i++) {
        if (buffer[8 + i] !== webpMarker[i]) return false;
      }
    }

    return true;
  };

  return (
    check(MAGIC_BYTES.jpeg) ||
    check(MAGIC_BYTES.png) ||
    check(MAGIC_BYTES.webp)
  );
}

function validateImageUpload(req, res, next) {
  const file = req.file;

  if (!file) return next();

  const maxSize = getMaxSize(req);
  if (file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: `Image size exceeds ${maxSize / 1024} KB limit.`,
    });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.test(ext)) {
    return res.status(400).json({
      success: false,
      message: "Invalid image format. Only JPG, JPEG, PNG and WEBP are allowed.",
    });
  }

  if (!ALLOWED_MIMETYPES.test(file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: "Invalid image format. Only JPG, JPEG, PNG and WEBP are allowed.",
    });
  }

  if (!validateMagicBytes(file.buffer)) {
    return res.status(400).json({
      success: false,
      message: "Invalid image format. Only JPG, JPEG, PNG and WEBP are allowed.",
    });
  }

  next();
}

module.exports = { validateImageUpload, ALLOWED_EXTENSIONS, ALLOWED_MIMETYPES, validateMagicBytes };
