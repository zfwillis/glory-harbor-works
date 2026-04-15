import express from "express";
import { authMiddleware, authorize } from "../middleware/auth.js";
import {
  getMyNotifications,
  markNotificationRead,
  sendAnnouncement,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/me", authMiddleware, getMyNotifications);
router.patch("/:id/read", authMiddleware, markNotificationRead);
router.post("/announcements", authMiddleware, authorize("admin"), sendAnnouncement);

export default router;
