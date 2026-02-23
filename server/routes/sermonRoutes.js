import express from "express";
import { getSermons, likeSermon, unlikeSermon } from "../controllers/sermonController.js";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/", optionalAuthMiddleware, getSermons);
router.post("/:id/like", authMiddleware, likeSermon);
router.delete("/:id/like", authMiddleware, unlikeSermon);

export default router;
