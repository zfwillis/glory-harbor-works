import express from "express";
import { createPrayerRequest, getPrayerRequests } from "../controllers/prayerController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getPrayerRequests);
router.post("/", protect, createPrayerRequest);

export default router;
