import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockSave = jest.fn();

function MockUser(data) {
  Object.assign(this, data);
  this._id = this._id || "67c0f1d2d7f3a8d4b4c8f111";
  this.status = this.status || "active";
  this.save = mockSave;
}

MockUser.find = jest.fn();
MockUser.findOne = jest.fn();
MockUser.findById = jest.fn();
MockUser.findByIdAndUpdate = jest.fn();
MockUser.findByIdAndDelete = jest.fn();

jest.unstable_mockModule("../../models/User.js", () => ({
  default: MockUser,
}));

const {
  registerUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUsersByRole,
  getUserByEmail,
  changeUserRole,
} = await import("../../controllers/userController.js");

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

describe("User Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("registerUser", () => {
    it("returns 400 when required fields are missing", async () => {
      const req = { body: { email: "a@a.com" } };
      const res = createMockRes();

      await registerUser(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Email, firstName, and lastName are required");
    });

    it("returns 409 when user already exists", async () => {
      MockUser.findOne.mockResolvedValue({ _id: "existing" });
      const req = {
        body: { email: "a@a.com", firstName: "A", lastName: "B" },
      };
      const res = createMockRes();

      await registerUser(req, res);

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toBe("User with this email already exists");
    });

    it("creates user successfully with default member role", async () => {
      MockUser.findOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(undefined);
      const req = {
        body: { email: "new@a.com", firstName: "New", lastName: "User" },
      };
      const res = createMockRes();

      await registerUser(req, res);

      expect(res.statusCode).toBe(201);
      expect(mockSave).toHaveBeenCalled();
      expect(res.body.user.role).toBe("member");
    });
  });

  describe("getAllUsers", () => {
    it("returns users list", async () => {
      const users = [{ _id: "1" }, { _id: "2" }];
      MockUser.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(users),
        }),
      });
      const req = {};
      const res = createMockRes();

      await getAllUsers(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.users).toEqual(users);
    });
  });

  describe("getUserById", () => {
    it("returns 404 when user is not found", async () => {
      MockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      const req = { params: { id: "67c0f1d2d7f3a8d4b4c8f111" } };
      const res = createMockRes();

      await getUserById(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("User not found");
    });
  });

  describe("updateUser", () => {
    it("returns 401 when requester is missing", async () => {
      const req = { params: { id: "u1" }, body: {} };
      const res = createMockRes();

      await updateUser(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    it("returns 403 when requester is not owner or pastor", async () => {
      MockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      const req = {
        params: { id: "target-id" },
        userId: "requester-id",
        body: { firstName: "New" },
      };
      const res = createMockRes();

      await updateUser(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Forbidden: insufficient permissions");
    });

    it("updates user when requester owns profile", async () => {
      MockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      MockUser.findByIdAndUpdate.mockResolvedValue({
        _id: "same-id",
        firstName: "Updated",
      });
      const req = {
        params: { id: "same-id" },
        userId: "same-id",
        body: { firstName: "Updated" },
      };
      const res = createMockRes();

      await updateUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("User updated successfully");
    });
  });

  describe("deleteUser", () => {
    it("deletes user when requester owns profile", async () => {
      MockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      MockUser.findByIdAndDelete.mockResolvedValue({ _id: "same-id" });
      const req = {
        params: { id: "same-id" },
        userId: "same-id",
      };
      const res = createMockRes();

      await deleteUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("User deleted successfully");
    });
  });

  describe("getUsersByRole", () => {
    it("returns 400 for invalid role", async () => {
      const req = { params: { role: "admin" } };
      const res = createMockRes();

      await getUsersByRole(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("Invalid role");
    });
  });

  describe("getUserByEmail", () => {
    it("returns 404 when user is not found", async () => {
      MockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      const req = { params: { email: "missing@example.com" } };
      const res = createMockRes();

      await getUserByEmail(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("User not found");
    });
  });

  describe("changeUserRole", () => {
    it("returns 400 for invalid role", async () => {
      const req = { params: { id: "u1" }, body: { role: "admin" } };
      const res = createMockRes();

      await changeUserRole(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("Invalid role");
    });

    it("updates role successfully for valid role", async () => {
      MockUser.findByIdAndUpdate.mockResolvedValue({
        _id: "u1",
        role: "pastor",
      });
      const req = { params: { id: "u1" }, body: { role: "pastor" } };
      const res = createMockRes();

      await changeUserRole(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("User role updated successfully");
      expect(res.body.user.role).toBe("pastor");
    });
  });
});
