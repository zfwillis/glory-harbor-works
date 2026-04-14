import express from "express";
import { authMiddleware, authorize } from "../middleware/auth.js";
import {
  getAllUsers,
  getUserById,
  getCurrentUser,
  updateUser,
  updatePassword,
  updateUserAvatar,
  deleteUserAvatar,
  deleteUser,
  getUsersByRole,
  getUserByEmail,
  changeUserRole,
  respondToRoleChange
} from "../controllers/userController.js";
import { uploadUserAvatar } from "../middleware/upload.js";

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
router.patch("/:id/password", authMiddleware, updatePassword); // Update current user's password
router.patch("/me/role-change", authMiddleware, respondToRoleChange); // Accept or decline pending role change
router.patch("/:id/role", authMiddleware, authorize("admin"), changeUserRole); // Change user role (admin only)
router.patch("/:id/avatar", authMiddleware, uploadUserAvatar.single("image"), updateUserAvatar); // Upload profile picture
router.delete("/:id/avatar", authMiddleware, deleteUserAvatar); // Remove profile picture

router.delete("/:id", authMiddleware, authorize("admin"), deleteUser); // Deactivate user (admin only)

export default router;
