import express from "express";
import {
	createSermon,
	deleteSermon,
	getSermons,
	likeSermon,
	unlikeSermon,
	updateSermon,
} from "../controllers/sermonController.js";
import { authMiddleware, authorize, optionalAuthMiddleware } from "../middleware/auth.js";
import { uploadSermonImage } from "../middleware/upload.js";

const router = express.Router();

router.get("/", optionalAuthMiddleware, getSermons);
router.post("/", authMiddleware, authorize("leader", "pastor"), uploadSermonImage.single("image"), createSermon);
router.patch("/:id", authMiddleware, authorize("leader", "pastor"), uploadSermonImage.single("image"), updateSermon);
router.delete("/:id", authMiddleware, authorize("leader", "pastor"), deleteSermon);
router.post("/:id/like", authMiddleware, likeSermon);
router.delete("/:id/like", authMiddleware, unlikeSermon);

export default router;
