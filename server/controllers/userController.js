import User from "../models/User.js";

/**
 * Create a new user account
 * POST /api/users/register
 */
export const registerUser = async (req, res) => {
  try {
    const { email, firstName, lastName, role } = req.body;

    // Validation
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "Email, firstName, and lastName are required"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Create new user
    const newUser = new User({
      email,
      firstName,
      lastName,
      role: role || "member" // Default to "member" if not specified
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        status: newUser.status
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error registering user",
      error: error.message
    });
  }
};

/**
 * Get all users (admin only - add auth later)
 * GET /api/users
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-managesUserIds") // Exclude for now
      .lean();

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message
    });
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-managesUserIds");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message
    });
  }
};

/**
 * Get current user (requires auth token later)
 * GET /api/users/me
 */
export const getCurrentUser = async (req, res) => {
  try {
    // TODO: Extract user ID from auth token
    // For now, use a placeholder
    const userId = req.userId; // This will come from auth middleware

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching current user",
      error: error.message
    });
  }
};

/**
 * Update user profile
 * PUT /api/users/:id
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, status, availability } = req.body;

    // Authorization: only the owner or a pastor can update
    const requesterId = req.userId;
    if (!requesterId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const requester = await User.findById(requesterId).select('role');
    if (requesterId !== id && requester?.role !== 'pastor') {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
    }

    // Find and update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(status && { status }),
        ...(availability && { availability })
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error.message
    });
  }
};

/**
 * Delete user account
 * DELETE /api/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization: only the owner or a pastor can delete
    const requesterId = req.userId;
    if (!requesterId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const requester = await User.findById(requesterId).select('role');
    if (requesterId !== id && requester?.role !== 'pastor') {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      user: deletedUser
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message
    });
  }
};

/**
 * Get users by role
 * GET /api/users/role/:role
 */
export const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    // Validate role
    const validRoles = ["member", "leader", "pastor"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(", ")}`
      });
    }

    const users = await User.find({ role })
      .select("-managesUserIds")
      .lean();

    res.status(200).json({
      success: true,
      count: users.length,
      role,
      users
    });
  } catch (error) {
    console.error("Get users by role error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users by role",
      error: error.message
    });
  }
};

/**
 * Get user by email
 * GET /api/users/email/:email
 */
export const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email })
      .select("-managesUserIds");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error("Get user by email error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message
    });
  }
};

/**
 * Change user role (admin only - add auth later)
 * PATCH /api/users/:id/role
 */
export const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ["member", "leader", "pastor"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(", ")}`
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Change role error:", error);
    res.status(500).json({
      success: false,
      message: "Error changing user role",
      error: error.message
    });
  }
};
