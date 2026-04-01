import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  approveOrDeclineMeeting,
  cancelMeeting,
  deleteMeeting,
  getMeetingById,
  listMeetings,
  updateMeeting,
} from "../controllers/meetingController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", listMeetings);
router.get("/:id", getMeetingById);
router.patch("/:id", updateMeeting);
router.patch("/:id/status", approveOrDeclineMeeting);
router.patch("/:id/cancel", cancelMeeting);
router.delete("/:id", deleteMeeting);

export default router;
