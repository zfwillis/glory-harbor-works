import express from "express";
import {
  createPrayerRequest,
  deletePrayerRequest,
  getPrayerRequests,
  updatePrayerRequest,
} from "../controllers/prayerController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getPrayerRequests);
router.post("/", protect, createPrayerRequest);
router.patch("/:id", protect, updatePrayerRequest);
router.delete("/:id", protect, deletePrayerRequest);

export default router;
