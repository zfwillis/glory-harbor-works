import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authMiddleware = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

// Alias for authMiddleware
export const protect = authMiddleware;

// Role-based authorization middleware
export const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({ 
          message: `Access denied. ${roles.join(" or ")} role required.` 
        });
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(500).json({ message: "Authorization error", error: error.message });
    }
  };
};
