import express from "express";
import {
  registerUser,
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

// Public routes
router.post("/register", registerUser); // Register new user

// Protected routes (add auth middleware later)
router.get("/", getAllUsers); // Get all users
router.get("/me", getCurrentUser); // Get current user profile
router.get("/email/:email", getUserByEmail); // Get user by email
router.get("/role/:role", getUsersByRole); // Get users by role
router.get("/:id", getUserById); // Get user by ID

router.put("/:id", updateUser); // Update user
router.patch("/:id/role", changeUserRole); // Change user role

router.delete("/:id", deleteUser); // Delete user

export default router;
