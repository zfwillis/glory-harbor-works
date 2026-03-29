import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  createAppointment,
  deleteAppointment,
  getAppointments,
  getPastorAppointments,
  updateAppointmentStatus,
  updateAppointment,
} from "../controllers/appointmentController.js";

const router = express.Router();

router.get("/", authMiddleware, getAppointments);
router.get("/pastor", authMiddleware, getPastorAppointments);
router.post("/", authMiddleware, createAppointment);
router.patch("/:id/status", authMiddleware, updateAppointmentStatus);
router.patch("/:id", authMiddleware, updateAppointment);
router.delete("/:id", authMiddleware, deleteAppointment);

export default router;
