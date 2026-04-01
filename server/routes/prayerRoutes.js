import express from "express";
import {
  createPrayerRequest,
  deletePrayerRequest,
  getAllPrayerRequests,
  getPrayerRequests,
  updatePrayerRequest,
  updatePrayerStatus,
} from "../controllers/prayerController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getPrayerRequests);
router.get("/all", protect, authorize("prayer_team", "admin", "pastor", "leader"), getAllPrayerRequests);
router.post("/", protect, createPrayerRequest);
router.patch("/:id", protect, updatePrayerRequest);
router.patch("/:id/status", protect, authorize("prayer_team", "admin", "pastor", "leader"), updatePrayerStatus);
router.delete("/:id", protect, deletePrayerRequest);

export default router;
