import express from "express";
import {
  submitContactForm,
  getContactSubmissions,
  updateContactStatus,
} from "../controllers/contactController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Public route - submit contact form
router.post("/", submitContactForm);

// Protected routes - admin/pastor only
router.get("/", protect, authorize("pastor", "leader"), getContactSubmissions);
router.patch("/:id/status", protect, authorize("pastor", "leader"), updateContactStatus);

export default router;
