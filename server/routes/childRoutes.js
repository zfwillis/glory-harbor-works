import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  createChild,
  getMyChildren,
  getChildById,
  updateChild,
  deleteChild,
  linkCoParent,
  unlinkCoParent,
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
} from "../controllers/childController.js";

const router = express.Router();

/**
 * Child Routes
 * Base path: /api/children
 * All routes require authentication.
 */

// Must be before /:id to avoid "invitations" being treated as an id param
router.get("/invitations/pending", authMiddleware, getPendingInvitations);

router.post("/", authMiddleware, createChild);                    // M5 - Create child
router.get("/", authMiddleware, getMyChildren);                   // M6 - View all my children
router.get("/:id", authMiddleware, getChildById);                 // M6 - View single child
router.put("/:id", authMiddleware, updateChild);                  // M7 - Update child
router.delete("/:id", authMiddleware, deleteChild);               // M8 - Delete child (primary parent only)

router.post("/:id/co-parent", authMiddleware, linkCoParent);      // Invite second parent by email
router.delete("/:id/co-parent", authMiddleware, unlinkCoParent);  // Remove second parent
router.post("/:id/co-parent/accept", authMiddleware, acceptInvitation);   // Accept invitation
router.post("/:id/co-parent/decline", authMiddleware, declineInvitation); // Decline invitation

export default router;
