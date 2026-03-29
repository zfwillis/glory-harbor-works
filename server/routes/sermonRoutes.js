import express from "express";
import {
	addCommentToSermon,
	createSermon,
	deleteCommentFromSermon,
	deleteSermon,
	getSermons,
	likeSermon,
	unlikeSermon,
	updateCommentOnSermon,
	updateSermon,
} from "../controllers/sermonController.js";
import { authMiddleware, authorize, optionalAuthMiddleware } from "../middleware/auth.js";
import { uploadSermonAssets } from "../middleware/upload.js";

const router = express.Router();

router.get("/", optionalAuthMiddleware, getSermons);
router.post(
	"/",
	authMiddleware,
	authorize("leader", "pastor"),
	uploadSermonAssets.fields([
		{ name: "image", maxCount: 1 },
		{ name: "media", maxCount: 1 },
	]),
	createSermon
);
router.patch(
	"/:id",
	authMiddleware,
	authorize("leader", "pastor"),
	uploadSermonAssets.fields([
		{ name: "image", maxCount: 1 },
		{ name: "media", maxCount: 1 },
	]),
	updateSermon
);
router.delete("/:id", authMiddleware, authorize("leader", "pastor"), deleteSermon);
router.post("/:id/comments", authMiddleware, addCommentToSermon);
router.patch("/:id/comments/:commentId", authMiddleware, updateCommentOnSermon);
router.delete("/:id/comments/:commentId", authMiddleware, deleteCommentFromSermon);
router.post("/:id/like", authMiddleware, likeSermon);
router.delete("/:id/like", authMiddleware, unlikeSermon);

export default router;
