import express from "express";
import { authMiddleware, authorize } from "../middleware/auth.js";
import {
  getChildProgress,
  getLessons,
  submitLessonQuiz,
  getTeacherLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  getAllChildrenProgress,
} from "../controllers/lessonController.js";

const router = express.Router();

const teacherAuth = [authMiddleware, authorize("teacher", "admin", "leader", "pastor")];

// Teacher routes — must come before /:id to avoid param collision
router.get("/teacher/all", ...teacherAuth, getTeacherLessons);
router.get("/teacher/progress", ...teacherAuth, getAllChildrenProgress);
router.post("/", ...teacherAuth, createLesson);
router.put("/:id", ...teacherAuth, updateLesson);
router.delete("/:id", ...teacherAuth, deleteLesson);

// Parent-facing routes
router.get("/", authMiddleware, getLessons);
router.get("/children/:childId/progress", authMiddleware, getChildProgress);
router.post("/children/:childId/:lessonId/quiz", authMiddleware, submitLessonQuiz);

export default router;
