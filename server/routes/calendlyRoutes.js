import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
	getCalendlyEventTypes,
	getCalendlyScheduledMeetings,
	updateCalendlyMeetingAction,
} from "../controllers/calendlyController.js";

const router = express.Router();

router.get("/event-types", authMiddleware, getCalendlyEventTypes);
router.get("/meetings", authMiddleware, getCalendlyScheduledMeetings);
router.patch("/meetings/:eventUuid/action", authMiddleware, updateCalendlyMeetingAction);

export default router;
