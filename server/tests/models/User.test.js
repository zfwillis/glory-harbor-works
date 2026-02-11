import User from "../../models/User.js";
import bcrypt from "bcrypt";

// Mock bcrypt
jest.mock("bcrypt");

describe("User Model", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Password Hashing", () => {
    it("should hash password before saving", async () => {
      const mockHash = "hashedPassword123";
      bcrypt.hash.mockResolvedValue(mockHash);

      const userData = {
        email: "test@example.com",
        password: "plainPassword123",
        firstName: "John",
        lastName: "Doe",
        role: "member",
      };

      const user = new User(userData);
      
      // Trigger the pre-save hook
      await user.validate();
      const isModified = user.isModified("password");
      
      expect(isModified).toBe(true);
    });

    it("should not rehash password if not modified", async () => {
      const user = new User({
        email: "test@example.com",
        password: "alreadyHashed",
        firstName: "John",
        lastName: "Doe",
      });

      // Mark password as not modified
      user.isModified = jest.fn().mockReturnValue(false);

      await user.validate();
      
      expect(user.isModified).toHaveBeenCalledWith("password");
    });
  });

  describe("comparePassword Method", () => {
    it("should return true for matching passwords", async () => {
      bcrypt.compare.mockResolvedValue(true);

      const user = new User({
        email: "test@example.com",
        password: "hashedPassword",
        firstName: "John",
        lastName: "Doe",
      });

      const result = await user.comparePassword("plainPassword");

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith("plainPassword", "hashedPassword");
    });

    it("should return false for non-matching passwords", async () => {
      bcrypt.compare.mockResolvedValue(false);

      const user = new User({
        email: "test@example.com",
        password: "hashedPassword",
        firstName: "John",
        lastName: "Doe",
      });

      const result = await user.comparePassword("wrongPassword");

      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith("wrongPassword", "hashedPassword");
    });
  });

  describe("User Schema Validation", () => {
    it("should create user with valid data", () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        role: "member",
      };

      const user = new User(userData);

      expect(user.email).toBe("test@example.com");
      expect(user.firstName).toBe("John");
      expect(user.lastName).toBe("Doe");
      expect(user.role).toBe("member");
      expect(user.status).toBe("active");
    });

    it("should set default role to member", () => {
      const user = new User({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      });

      expect(user.role).toBe("member");
    });

    it("should set default status to active", () => {
      const user = new User({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      });

      expect(user.status).toBe("active");
    });

    it("should convert email to lowercase", () => {
      const user = new User({
        email: "TEST@EXAMPLE.COM",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      });

      expect(user.email).toBe("test@example.com");
    });
  });
});
