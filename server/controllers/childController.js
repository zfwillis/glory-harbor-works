import Child from "../models/Child.js";
import User from "../models/User.js";

const getIdValue = (value) => value?._id || value;

// Helper: check if the requesting user is either the primary or accepted second parent
const isParent = (child, userId) =>
  String(getIdValue(child.parent)) === String(userId) ||
  (child.secondParent &&
    String(getIdValue(child.secondParent)) === String(userId) &&
    child.secondParentStatus === "accepted");

// M5 - Create a child under the authenticated member
export const createChild = async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, allergies, notes } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: "First name and last name are required." });
    }

    if (dateOfBirth && new Date(dateOfBirth) > new Date()) {
      return res.status(400).json({ message: "Date of birth cannot be in the future." });
    }

    const child = await Child.create({
      firstName,
      lastName,
      dateOfBirth: dateOfBirth || undefined,
      allergies: allergies || "",
      notes: notes || "",
      parent: req.userId,
    });

    res.status(201).json({ message: "Child profile created.", child });
  } catch (error) {
    console.error("createChild error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// M6 - Get all children where the authenticated user is primary or second parent
export const getMyChildren = async (req, res) => {
  try {
    const children = await Child.find({
      $or: [
        { parent: req.userId },
        { secondParent: req.userId, secondParentStatus: "accepted" },
      ],
    })
      .populate("parent", "firstName lastName email")
      .populate("secondParent", "firstName lastName email")
      .sort({ createdAt: -1 });
    res.json({ children });
  } catch (error) {
    console.error("getMyChildren error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// M6 - Get a single child by ID (either parent)
export const getChildById = async (req, res) => {
  try {
    const child = await Child.findById(req.params.id)
      .populate("parent", "firstName lastName email")
      .populate("secondParent", "firstName lastName email");

    if (!child) {
      return res.status(404).json({ message: "Child not found." });
    }

    if (!isParent(child, req.userId)) {
      return res.status(403).json({ message: "Not authorized to view this child profile." });
    }

    res.json({ child });
  } catch (error) {
    console.error("getChildById error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// M7 - Update a child profile (either parent)
export const updateChild = async (req, res) => {
  try {
    const child = await Child.findById(req.params.id);

    if (!child) {
      return res.status(404).json({ message: "Child not found." });
    }

    if (!isParent(child, req.userId)) {
      return res.status(403).json({ message: "Not authorized to update this child profile." });
    }

    const { firstName, lastName, dateOfBirth, allergies, notes } = req.body;

    if (dateOfBirth !== undefined && dateOfBirth && new Date(dateOfBirth) > new Date()) {
      return res.status(400).json({ message: "Date of birth cannot be in the future." });
    }

    if (firstName !== undefined) child.firstName = firstName;
    if (lastName !== undefined) child.lastName = lastName;
    if (dateOfBirth !== undefined) child.dateOfBirth = dateOfBirth || undefined;
    if (allergies !== undefined) child.allergies = allergies;
    if (notes !== undefined) child.notes = notes;

    await child.save();
    res.json({ message: "Child profile updated.", child });
  } catch (error) {
    console.error("updateChild error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// M8 - Delete a child profile (primary parent only)
export const deleteChild = async (req, res) => {
  try {
    const child = await Child.findById(req.params.id);

    if (!child) {
      return res.status(404).json({ message: "Child not found." });
    }

    if (String(child.parent) !== String(req.userId)) {
      return res.status(403).json({ message: "Only the primary parent can delete a child profile." });
    }

    await child.deleteOne();
    res.json({ message: "Child profile deleted." });
  } catch (error) {
    console.error("deleteChild error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Link a second parent by email (primary parent only)
// Get pending invitations where the authenticated user is the invited second parent
export const getPendingInvitations = async (req, res) => {
  try {
    const invitations = await Child.find({
      secondParent: req.userId,
      secondParentStatus: "pending",
    })
      .populate("parent", "firstName lastName email")
      .sort({ updatedAt: -1 });
    res.json({ invitations });
  } catch (error) {
    console.error("getPendingInvitations error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Accept a pending invitation to be a second parent
export const acceptInvitation = async (req, res) => {
  try {
    const child = await Child.findOne({
      _id: req.params.id,
      secondParent: req.userId,
      secondParentStatus: "pending",
    });

    if (!child) {
      return res.status(404).json({ message: "Invitation not found." });
    }

    child.secondParentStatus = "accepted";
    await child.save();

    res.json({ message: "Invitation accepted. You now have access to this child profile." });
  } catch (error) {
    console.error("acceptInvitation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Decline a pending invitation
export const declineInvitation = async (req, res) => {
  try {
    const child = await Child.findOne({
      _id: req.params.id,
      secondParent: req.userId,
      secondParentStatus: "pending",
    });

    if (!child) {
      return res.status(404).json({ message: "Invitation not found." });
    }

    child.secondParent = null;
    child.secondParentStatus = "pending";
    await child.save();

    res.json({ message: "Invitation declined." });
  } catch (error) {
    console.error("declineInvitation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const linkCoParent = async (req, res) => {
  try {
    const child = await Child.findById(req.params.id);

    if (!child) {
      return res.status(404).json({ message: "Child not found." });
    }

    if (String(child.parent) !== String(req.userId)) {
      return res.status(403).json({ message: "Only the primary parent can add a co-parent." });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const coParent = await User.findOne({ email: email.toLowerCase().trim() });
    if (!coParent) {
      return res.status(404).json({ message: "No member found with that email address." });
    }

    if (String(coParent._id) === String(req.userId)) {
      return res.status(400).json({ message: "You cannot add yourself as a co-parent." });
    }

    child.secondParent = coParent._id;
    child.secondParentStatus = "pending";
    await child.save();

    await child.populate("secondParent", "firstName lastName email");
    res.json({ message: "Invitation sent. The other parent must accept before they can access this profile.", child });
  } catch (error) {
    console.error("linkCoParent error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Unlink the second parent (primary parent only)
export const unlinkCoParent = async (req, res) => {
  try {
    const child = await Child.findById(req.params.id);

    if (!child) {
      return res.status(404).json({ message: "Child not found." });
    }

    if (String(child.parent) !== String(req.userId)) {
      return res.status(403).json({ message: "Only the primary parent can remove a co-parent." });
    }

    child.secondParent = null;
    child.secondParentStatus = "pending";
    await child.save();

    res.json({ message: "Other parent removed.", child });
  } catch (error) {
    console.error("unlinkCoParent error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
