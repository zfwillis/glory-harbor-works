import express from "express";
import { createPrayerRequest } from "../controllers/prayerController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, createPrayerRequest);

export default router;
