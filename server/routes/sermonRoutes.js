import express from "express";
import { getSermons, likeSermon } from "../controllers/sermonController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getSermons);
router.post("/:id/like", authMiddleware, likeSermon);

export default router;
