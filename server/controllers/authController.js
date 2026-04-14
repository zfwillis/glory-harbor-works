import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { verifyRegistrationCode } from "../config/registrationCodes.js";

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "7d",
  });
};

// Register User
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, registrationCode } = req.body;
    const normalizedRole = String(role || "member").trim().toLowerCase();
    const requestedRole = normalizedRole || "member";

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const isElevatedRole = requestedRole !== "member";

    if (isElevatedRole && !registrationCode) {
      return res.status(400).json({ message: "Registration code required for this role" });
    }

    if (isElevatedRole) {
      const isValidCode = await verifyRegistrationCode(requestedRole, registrationCode);
      if (!isValidCode) {
        return res.status(403).json({ message: "Invalid registration code" });
      }
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: requestedRole,
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        status: user.status,
        pendingRole: user.pendingRole,
        pendingRoleRequestedAt: user.pendingRoleRequestedAt,
        availability: user.availability,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Login User
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is active
    if (user.status !== "active") {
      return res.status(403).json({ message: "Account is inactive" });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        status: user.status,
        pendingRole: user.pendingRole,
        pendingRoleRequestedAt: user.pendingRoleRequestedAt,
        availability: user.availability,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Current User
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    return res.json({ message: "Password verified" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Logout (client-side handles token removal, but this endpoint can be used for logging)
export const logout = async (req, res) => {
  res.json({ message: "Logout successful" });
};
