import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getChildProgress, getLessons, submitLessonQuiz } from "../controllers/lessonController.js";

const router = express.Router();

router.get("/", authMiddleware, getLessons);
router.get("/children/:childId/progress", authMiddleware, getChildProgress);
router.post("/children/:childId/:lessonId/quiz", authMiddleware, submitLessonQuiz);

export default router;
