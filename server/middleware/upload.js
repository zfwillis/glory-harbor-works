import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const createStorage = (prefix) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = ext || ".jpg";
      cb(null, `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    },
  });

const imageFileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    return cb(null, true);
  }

  return cb(new Error("Only image files are allowed"));
};

const sermonAssetFileFilter = (req, file, cb) => {
  if (file.fieldname === "image") {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(new Error("Thumbnail must be an image file"));
  }

  if (file.fieldname === "media") {
    if (
      file.mimetype &&
      (file.mimetype.startsWith("audio/") || file.mimetype.startsWith("video/"))
    ) {
      return cb(null, true);
    }
    return cb(new Error("Media must be an audio or video file"));
  }

  return cb(new Error("Unsupported upload field"));
};

export const uploadSermonImage = multer({
  storage: createStorage("sermon"),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const uploadSermonAssets = multer({
  storage: createStorage("sermon"),
  fileFilter: sermonAssetFileFilter,
  limits: {
    fileSize: 300 * 1024 * 1024,
  },
});

export const uploadUserAvatar = multer({
  storage: createStorage("avatar"),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
