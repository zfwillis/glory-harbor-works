import express from "express";
import { register, login, logout, getCurrentUser, verifyPassword } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authMiddleware, getCurrentUser);
router.post("/verify-password", authMiddleware, verifyPassword);

export default router;
