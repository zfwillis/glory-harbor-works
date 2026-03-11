import express from "express";
import {
  createPrayerRequest,
  getPrayerRequests,
  updatePrayerRequest,
} from "../controllers/prayerController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getPrayerRequests);
router.post("/", protect, createPrayerRequest);
router.patch("/:id", protect, updatePrayerRequest);

export default router;
