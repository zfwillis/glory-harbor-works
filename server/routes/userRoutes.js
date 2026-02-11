import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getAllUsers,
  getUserById,
  getCurrentUser,
  updateUser,
  deleteUser,
  getUsersByRole,
  getUserByEmail,
  changeUserRole
} from "../controllers/userController.js";

const router = express.Router();

/**
 * User Routes
 * Base path: /api/users
 */

// Protected routes
router.get("/", authMiddleware, getAllUsers); // Get all users (requires auth)
router.get("/me", authMiddleware, getCurrentUser); // Get current user profile
router.get("/email/:email", authMiddleware, getUserByEmail); // Get user by email
router.get("/role/:role", authMiddleware, getUsersByRole); // Get users by role
router.get("/:id", authMiddleware, getUserById); // Get user by ID

router.put("/:id", authMiddleware, updateUser); // Update user (owner or pastor)
router.patch("/:id/role", authMiddleware, changeUserRole); // Change user role (pastor only)

router.delete("/:id", authMiddleware, deleteUser); // Delete user (owner or pastor)

export default router;
