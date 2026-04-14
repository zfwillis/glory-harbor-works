import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "../routes/authRoutes.js";
import userRoutes from "../routes/userRoutes.js";
import contactRoutes from "../routes/contactRoutes.js";
import sermonRoutes from "../routes/sermonRoutes.js";
import prayerRoutes from "../routes/prayerRoutes.js";
import { getDatabaseHealth } from "./db.js";
import calendlyRoutes from "../routes/calendlyRoutes.js";
import meetingRoutes from "../routes/meetingRoutes.js";
import childRoutes from "../routes/childRoutes.js";
import lessonRoutes from "../routes/lessonRoutes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
const allowedOrigins = new Set(
  [process.env.CLIENT_URL, "http://127.0.0.1:5173", "http://localhost:5173"].filter(Boolean)
);

const isAllowedDevOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin) || isAllowedDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/sermons", sermonRoutes);
app.use("/api/prayers", prayerRoutes);
app.use("/api/calendly", calendlyRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/children", childRoutes);
app.use("/api/lessons", lessonRoutes);

// Health check
app.get("/api/health", (req, res) => {
  const uploadsDir = path.join(__dirname, "..", "uploads");
  const database = getDatabaseHealth();
  const uploadsAvailable = fs.existsSync(uploadsDir);
  const isHealthy = database.status === "up";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database,
    storage: {
      uploadsStatus: uploadsAvailable ? "available" : "missing",
      uploadsPath: "/uploads",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error", error: err.message });
});

export default app;
