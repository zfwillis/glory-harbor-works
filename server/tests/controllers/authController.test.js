import { register, login, getCurrentUser, logout } from "../../controllers/authController.js";
import User from "../../models/User.js";
import jwt from "jsonwebtoken";
import * as regCodes from "../../config/registrationCodes.js";

// Mock dependencies
jest.mock("../../models/User.js");
jest.mock("jsonwebtoken");
jest.mock("../../config/registrationCodes.js");

describe("Auth Controller", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      header: jest.fn(),
      userId: null,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        role: "member",
      };

      mockReq.body = userData;

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: "userId123",
        ...userData,
      });
      jwt.sign.mockReturnValue("token123");

      await register(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(User.create).toHaveBeenCalledWith(userData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "User registered successfully",
        token: "token123",
        user: {
          id: "userId123",
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
        },
      });
    });

    it("should register leader with valid code", async () => {
      const userData = {
        email: "leader@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Leader",
        role: "leader",
        registrationCode: "GH-L7k9mN2pQ4xR",
      };

      mockReq.body = userData;

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: "leaderId123",
        ...userData,
      });
      jwt.sign.mockReturnValue("token456");
      regCodes.verifyRegistrationCode.mockResolvedValue(true);

      await register(mockReq, mockRes);

      expect(regCodes.verifyRegistrationCode).toHaveBeenCalledWith("leader", "GH-L7k9mN2pQ4xR");
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it("should reject leader registration with invalid code", async () => {
      mockReq.body = {
        email: "leader@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Leader",
        role: "leader",
        registrationCode: "wrongcode",
      };

      User.findOne.mockResolvedValue(null);
      regCodes.verifyRegistrationCode.mockResolvedValue(false);

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Invalid registration code",
      });
    });

    it("should reject leader registration without code", async () => {
      mockReq.body = {
        email: "leader@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Leader",
        role: "leader",
      };

      User.findOne.mockResolvedValue(null);

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Registration code required for this role",
      });
    });

    it("should return error if user already exists", async () => {
      mockReq.body = {
        email: "existing@example.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue({ email: "existing@example.com" });

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "User already exists",
      });
    });

    it("should handle server errors", async () => {
      mockReq.body = {
        email: "test@example.com",
        password: "password123",
      };

      User.findOne.mockRejectedValue(new Error("Database error"));

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Server error",
        error: "Database error",
      });
    });
  });

  describe("login", () => {
    it("should login user with valid credentials", async () => {
      const mockUser = {
        _id: "userId123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "member",
        status: "active",
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      mockReq.body = {
        email: "test@example.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue("token123");

      await login(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(mockUser.comparePassword).toHaveBeenCalledWith("password123");
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Login successful",
        token: "token123",
        user: {
          id: "userId123",
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          role: "member",
        },
      });
    });

    it("should return error with invalid email", async () => {
      mockReq.body = {
        email: "wrong@example.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue(null);

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Invalid credentials",
      });
    });

    it("should return error with invalid password", async () => {
      const mockUser = {
        email: "test@example.com",
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      mockReq.body = {
        email: "test@example.com",
        password: "wrongPassword",
      };

      User.findOne.mockResolvedValue(mockUser);

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Invalid credentials",
      });
    });

    it("should return error if account is inactive", async () => {
      const mockUser = {
        email: "test@example.com",
        status: "inactive",
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      mockReq.body = {
        email: "test@example.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue(mockUser);

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Account is inactive",
      });
    });
  });

  describe("getCurrentUser", () => {
    it("should return current user", async () => {
      const mockUser = {
        _id: "userId123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "member",
      };

      mockReq.userId = "userId123";

      const mockUserQuery = {
        select: jest.fn().mockResolvedValue(mockUser),
      };

      User.findById.mockReturnValue(mockUserQuery);

      await getCurrentUser(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith("userId123");
      expect(mockUserQuery.select).toHaveBeenCalledWith("-password");
      expect(mockRes.json).toHaveBeenCalledWith({ user: mockUser });
    });

    it("should return error if user not found", async () => {
      mockReq.userId = "nonexistentId";

      const mockUserQuery = {
        select: jest.fn().mockResolvedValue(null),
      };

      User.findById.mockReturnValue(mockUserQuery);

      await getCurrentUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "User not found",
      });
    });
  });

  describe("logout", () => {
    it("should return logout success message", async () => {
      await logout(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Logout successful",
      });
    });
  });
});
