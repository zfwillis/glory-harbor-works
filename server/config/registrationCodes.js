import bcrypt from "bcrypt";

// Registration codes for elevated roles
// These are hashed for security
export const REGISTRATION_CODES = {
  // Leader code: GH-L7k9mN2pQ4xR
  leader: "$2b$10$vK3mZxPqY8nF2wR7sT5jHu9L4bC6dE1fG3hI8jK0lM2nO4pQ6rS8",
  
  // Pastor code: GH-P3wY8sT6vB5n
  pastor: "$2b$10$xN5oAwRzB9qH4yU7vT6kLw8M3cF5eG2hJ4kL7mN0oP3qR5sT8uV1",
};

// Function to verify registration code
export const verifyRegistrationCode = async (role, code) => {
  if (role === "member") {
    return true; // No code required for members
  }

  const hashedCode = REGISTRATION_CODES[role];
  if (!hashedCode) {
    return false;
  }

  return await bcrypt.compare(code, hashedCode);
};

// Helper function to generate hashed codes (for admin use only)
export const generateHashedCode = async (plainCode) => {
  return await bcrypt.hash(plainCode, 10);
};
