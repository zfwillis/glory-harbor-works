import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockUserModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
};

const mockJwt = {
  sign: jest.fn(),
};

const mockVerifyRegistrationCode = jest.fn();

jest.unstable_mockModule("../../models/User.js", () => ({
  default: mockUserModel,
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: mockJwt,
}));

jest.unstable_mockModule("../../config/registrationCodes.js", () => ({
  verifyRegistrationCode: mockVerifyRegistrationCode,
}));

const {
  register,
  login,
  getCurrentUser,
  logout,
} = await import("../../controllers/authController.js");

const createMockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

describe("Auth Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJwt.sign.mockReturnValue("mock-token");
  });

  describe("register", () => {
    it("returns 400 when user already exists", async () => {
      mockUserModel.findOne.mockResolvedValue({ _id: "existing-user" });
      const req = {
        body: {
          email: "test@example.com",
          password: "password123",
          firstName: "John",
          lastName: "Doe",
        },
      };
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("User already exists");
    });

    it("returns 400 when elevated role is missing registration code", async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      const req = {
        body: {
          email: "pastor@example.com",
          password: "password123",
          firstName: "Pat",
          lastName: "Shepherd",
          role: "pastor",
        },
      };
      const res = createMockRes();

      await register(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Registration code required for this role");
    });

    it("returns 403 when elevated role registration code is invalid", async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockVerifyRegistrationCode.mockResolvedValue(false);
      const req = {
        body: {
          email: "pastor@example.com",
          password: "password123",
          firstName: "Pat",
          lastName: "Shepherd",
          role: "pastor",
          registrationCode: "bad-code",
        },
      };
      const res = createMockRes();

      await register(req, res);

      expect(mockVerifyRegistrationCode).toHaveBeenCalledWith("pastor", "bad-code");
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Invalid registration code");
    });

    it("creates a member and returns token and user payload", async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue({
        _id: "u1",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "member",
        avatarUrl: "",
        status: "active",
        availability: [],
      });

      const req = {
        body: {
          email: "test@example.com",
          password: "password123",
          firstName: "John",
          lastName: "Doe",
        },
      };
      const res = createMockRes();

      await register(req, res);

      expect(mockUserModel.create).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        role: "member",
      });
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { id: "u1" },
        expect.any(String),
        { expiresIn: "7d" }
      );
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe("User registered successfully");
      expect(res.body.token).toBe("mock-token");
      expect(res.body.user.role).toBe("member");
    });

    it("creates an elevated-role user when registration code is valid", async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockVerifyRegistrationCode.mockResolvedValue(true);
      mockUserModel.create.mockResolvedValue({
        _id: "p1",
        email: "pastor@example.com",
        firstName: "Pat",
        lastName: "Shepherd",
        role: "pastor",
        avatarUrl: "",
        status: "active",
        availability: [],
      });

      const req = {
        body: {
          email: "pastor@example.com",
          password: "password123",
          firstName: "Pat",
          lastName: "Shepherd",
          role: "pastor",
          registrationCode: "valid-code",
        },
      };
      const res = createMockRes();

      await register(req, res);

      expect(mockVerifyRegistrationCode).toHaveBeenCalledWith("pastor", "valid-code");
      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: "pastor" })
      );
      expect(res.statusCode).toBe(201);
      expect(res.body.user.role).toBe("pastor");
    });
  });

  describe("login", () => {
    it("returns 401 when user does not exist", async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      const req = { body: { email: "missing@example.com", password: "password123" } };
      const res = createMockRes();

      await login(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("returns 401 when password is invalid", async () => {
      mockUserModel.findOne.mockResolvedValue({
        comparePassword: jest.fn().mockResolvedValue(false),
      });
      const req = { body: { email: "test@example.com", password: "wrong-password" } };
      const res = createMockRes();

      await login(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("returns 403 when account is inactive", async () => {
      mockUserModel.findOne.mockResolvedValue({
        comparePassword: jest.fn().mockResolvedValue(true),
        status: "inactive",
      });
      const req = { body: { email: "test@example.com", password: "password123" } };
      const res = createMockRes();

      await login(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Account is inactive");
    });

    it("returns token and user payload for valid credentials", async () => {
      mockUserModel.findOne.mockResolvedValue({
        _id: "u1",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "member",
        avatarUrl: "",
        status: "active",
        availability: [{ day: "Monday", start: "09:00", end: "12:00" }],
        comparePassword: jest.fn().mockResolvedValue(true),
      });
      const req = { body: { email: "test@example.com", password: "password123" } };
      const res = createMockRes();

      await login(req, res);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { id: "u1" },
        expect.any(String),
        { expiresIn: "7d" }
      );
      expect(res.body.message).toBe("Login successful");
      expect(res.body.token).toBe("mock-token");
      expect(res.body.user.availability).toEqual([{ day: "Monday", start: "09:00", end: "12:00" }]);
    });
  });

  describe("getCurrentUser", () => {
    it("returns 404 when current user is not found", async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      const req = { userId: "missing-user" };
      const res = createMockRes();

      await getCurrentUser(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("User not found");
    });

    it("returns current user without password", async () => {
      const user = { _id: "u1", email: "test@example.com" };
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });
      const req = { userId: "u1" };
      const res = createMockRes();

      await getCurrentUser(req, res);

      expect(res.body.user).toEqual(user);
    });
  });

  describe("logout", () => {
    it("returns logout success message", async () => {
      const res = createMockRes();

      await logout({}, res);

      expect(res.body.message).toBe("Logout successful");
    });
  });
});
