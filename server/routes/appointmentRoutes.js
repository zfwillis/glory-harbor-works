import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  createAppointment,
  deleteAppointment,
  getAppointments,
  updateAppointment,
} from "../controllers/appointmentController.js";

const router = express.Router();

router.get("/", authMiddleware, getAppointments);
router.post("/", authMiddleware, createAppointment);
router.patch("/:id", authMiddleware, updateAppointment);
router.delete("/:id", authMiddleware, deleteAppointment);

export default router;
