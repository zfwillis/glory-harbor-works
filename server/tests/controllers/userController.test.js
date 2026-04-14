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
  getCurrentUser,
  updateUser,
  updatePassword,
  updateUserAvatar,
  deleteUserAvatar,
  deleteUser,
  getUsersByRole,
  getUserByEmail,
  changeUserRole,
  respondToRoleChange,
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
    it("returns user when found", async () => {
      const user = { _id: "u1", firstName: "Test" };
      MockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });
      const req = { params: { id: "u1" } };
      const res = createMockRes();

      await getUserById(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toEqual(user);
    });

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

  describe("getCurrentUser", () => {
    it("returns current user when found", async () => {
      MockUser.findById.mockResolvedValue({ _id: "u1", email: "u1@test.com" });
      const req = { userId: "u1" };
      const res = createMockRes();

      await getCurrentUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.user._id).toBe("u1");
    });

    it("returns 404 when current user is not found", async () => {
      MockUser.findById.mockResolvedValue(null);
      const req = { userId: "missing" };
      const res = createMockRes();

      await getCurrentUser(req, res);

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

    it("returns 404 when target user does not exist", async () => {
      MockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "pastor" }),
      });
      MockUser.findByIdAndUpdate.mockResolvedValue(null);
      const req = {
        params: { id: "target-id" },
        userId: "pastor-id",
        body: { firstName: "Updated" },
      };
      const res = createMockRes();

      await updateUser(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("User not found");
    });

    it("returns 403 when non-pastor tries to update availability", async () => {
      MockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      const req = {
        params: { id: "same-id" },
        userId: "same-id",
        body: { availability: [{ day: "Monday", start: "09:00", end: "12:00" }] },
      };
      const res = createMockRes();

      await updateUser(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Only pastors can update availability");
    });

    it("returns 403 when pastor tries to update another user's availability", async () => {
      MockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "pastor" }),
      });
      const req = {
        params: { id: "member-id" },
        userId: "pastor-id",
        body: { availability: [{ day: "Monday", start: "09:00", end: "12:00" }] },
      };
      const res = createMockRes();

      await updateUser(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Forbidden: pastors can only update their own availability");
    });
  });

  describe("deleteUser", () => {
    it("returns 401 when requester is missing", async () => {
      const req = { params: { id: "same-id" } };
      const res = createMockRes();

      await deleteUser(req, res);

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
      };
      const res = createMockRes();

      await deleteUser(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Forbidden: insufficient permissions");
    });

    it("deactivates user when requester owns profile", async () => {
      MockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      MockUser.findByIdAndUpdate.mockResolvedValue({ _id: "same-id", status: "inactive" });
      const req = {
        params: { id: "same-id" },
        userId: "same-id",
      };
      const res = createMockRes();

      await deleteUser(req, res);

      expect(MockUser.findByIdAndUpdate).toHaveBeenCalledWith(
        "same-id",
        { status: "inactive" },
        { returnDocument: "after", runValidators: true }
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("User deactivated successfully");
    });

    it("returns 404 when target user does not exist", async () => {
      MockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ role: "pastor" }),
      });
      MockUser.findByIdAndUpdate.mockResolvedValue(null);
      const req = {
        params: { id: "missing-id" },
        userId: "pastor-id",
      };
      const res = createMockRes();

      await deleteUser(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("User not found");
    });
  });

  describe("updatePassword", () => {
    it("returns 401 when requester is missing", async () => {
      const req = {
        params: { id: "u1" },
        body: { currentPassword: "oldpass", newPassword: "newpass1" },
      };
      const res = createMockRes();

      await updatePassword(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    it("returns 403 when requester tries to change another user's password", async () => {
      const req = {
        params: { id: "target-id" },
        userId: "requester-id",
        body: { currentPassword: "oldpass", newPassword: "newpass1" },
      };
      const res = createMockRes();

      await updatePassword(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Forbidden");
    });

    it("returns 400 when password fields are missing", async () => {
      const req = {
        params: { id: "u1" },
        userId: "u1",
        body: { currentPassword: "", newPassword: "" },
      };
      const res = createMockRes();

      await updatePassword(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Current password and new password are required");
    });

    it("returns 400 when new password is too short", async () => {
      const req = {
        params: { id: "u1" },
        userId: "u1",
        body: { currentPassword: "oldpass", newPassword: "123" },
      };
      const res = createMockRes();

      await updatePassword(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("New password must be at least 6 characters long");
    });

    it("returns 404 when user is not found", async () => {
      MockUser.findById.mockResolvedValue(null);
      const req = {
        params: { id: "u1" },
        userId: "u1",
        body: { currentPassword: "oldpass", newPassword: "newpass1" },
      };
      const res = createMockRes();

      await updatePassword(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("User not found");
    });

    it("returns 400 when current password is incorrect", async () => {
      MockUser.findById.mockResolvedValue({
        _id: "u1",
        comparePassword: jest.fn().mockResolvedValue(false),
      });
      const req = {
        params: { id: "u1" },
        userId: "u1",
        body: { currentPassword: "wrongpass", newPassword: "newpass1" },
      };
      const res = createMockRes();

      await updatePassword(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Current password is incorrect");
    });

    it("updates password for the owning user", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      MockUser.findById.mockResolvedValue({
        _id: "u1",
        comparePassword: jest.fn().mockResolvedValue(true),
        save,
      });
      const req = {
        params: { id: "u1" },
        userId: "u1",
        body: { currentPassword: "oldpass", newPassword: "newpass1" },
      };
      const res = createMockRes();

      await updatePassword(req, res);

      expect(save).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Password updated successfully");
    });
  });

  describe("updateUserAvatar", () => {
    it("returns 401 when requester is missing", async () => {
      const req = { params: { id: "u1" }, file: { filename: "new-avatar.jpg" } };
      const res = createMockRes();

      await updateUserAvatar(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    it("returns 403 when non-owner non-pastor tries to update avatar", async () => {
      MockUser.findById.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });

      const req = {
        params: { id: "target-id" },
        userId: "requester-id",
        file: { filename: "new-avatar.jpg" },
      };
      const res = createMockRes();

      await updateUserAvatar(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Forbidden: insufficient permissions");
    });

    it("returns 400 when image file is missing", async () => {
      const req = { params: { id: "u1" }, userId: "u1" };
      const res = createMockRes();

      await updateUserAvatar(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Image file is required");
    });

    it("returns 404 when avatar target user does not exist", async () => {
      MockUser.findById.mockResolvedValue(null);
      const req = {
        params: { id: "u1" },
        userId: "u1",
        file: { filename: "new-avatar.jpg" },
      };
      const res = createMockRes();

      await updateUserAvatar(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("User not found");
    });

    it("updates avatar when requester owns profile", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      MockUser.findById.mockResolvedValue({
        _id: "u1",
        avatarUrl: "http://localhost:5000/uploads/old-avatar.jpg",
        save,
      });

      const req = {
        params: { id: "u1" },
        userId: "u1",
        file: { filename: "new-avatar.jpg" },
        protocol: "http",
        get: jest.fn().mockReturnValue("localhost:5000"),
      };
      const res = createMockRes();

      await updateUserAvatar(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Profile picture updated successfully");
      expect(save).toHaveBeenCalled();
      expect(res.body.user.avatarUrl).toContain("/uploads/new-avatar.jpg");
    });

    it("updates avatar when requester is pastor editing another user", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      MockUser.findById
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ role: "pastor" }),
        })
        .mockResolvedValueOnce({
          _id: "target-id",
          avatarUrl: "",
          save,
        });

      const req = {
        params: { id: "target-id" },
        userId: "pastor-id",
        file: { filename: "new-avatar.jpg" },
        protocol: "http",
        get: jest.fn().mockReturnValue("localhost:5000"),
      };
      const res = createMockRes();

      await updateUserAvatar(req, res);

      expect(res.statusCode).toBe(200);
      expect(save).toHaveBeenCalled();
    });
  });

  describe("deleteUserAvatar", () => {
    it("returns 401 when requester is missing", async () => {
      const req = { params: { id: "u1" } };
      const res = createMockRes();

      await deleteUserAvatar(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    it("returns 403 when non-owner non-pastor tries to delete avatar", async () => {
      MockUser.findById.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ role: "member" }),
      });
      const req = { params: { id: "target-id" }, userId: "requester-id" };
      const res = createMockRes();

      await deleteUserAvatar(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Forbidden: insufficient permissions");
    });

    it("returns 404 when avatar target user does not exist", async () => {
      MockUser.findById.mockResolvedValue(null);
      const req = { params: { id: "u1" }, userId: "u1" };
      const res = createMockRes();

      await deleteUserAvatar(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("User not found");
    });

    it("clears avatar url when requester owns profile", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      MockUser.findById.mockResolvedValue({
        _id: "u1",
        avatarUrl: "http://localhost:5000/uploads/avatar-123.jpg",
        save,
      });

      const req = { params: { id: "u1" }, userId: "u1" };
      const res = createMockRes();

      await deleteUserAvatar(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Profile picture removed successfully");
      expect(save).toHaveBeenCalled();
      expect(res.body.user.avatarUrl).toBe("");
    });

    it("allows pastor to remove another user's avatar", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      MockUser.findById
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ role: "pastor" }),
        })
        .mockResolvedValueOnce({
          _id: "target-id",
          avatarUrl: "",
          save,
        });
      const req = { params: { id: "target-id" }, userId: "pastor-id" };
      const res = createMockRes();

      await deleteUserAvatar(req, res);

      expect(res.statusCode).toBe(200);
      expect(save).toHaveBeenCalled();
    });
  });

  describe("getUsersByRole", () => {
    it("returns 400 for invalid role", async () => {
      const req = { params: { role: "super_admin" } };
      const res = createMockRes();

      await getUsersByRole(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("Invalid role");
    });

    it("returns users for a valid role", async () => {
      MockUser.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ _id: "u1", role: "pastor" }]),
        }),
      });
      const req = { params: { role: "pastor" } };
      const res = createMockRes();

      await getUsersByRole(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(1);
    });
  });

  describe("getUserByEmail", () => {
    it("returns user when found", async () => {
      const user = { _id: "u1", email: "found@example.com" };
      MockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });
      const req = { params: { email: "found@example.com" } };
      const res = createMockRes();

      await getUserByEmail(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toEqual(user);
    });

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
      const req = { params: { id: "u1" }, body: { role: "super_admin" } };
      const res = createMockRes();

      await changeUserRole(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("Invalid role");
    });

    it("returns 404 when user is missing during role change", async () => {
      MockUser.findById.mockResolvedValue(null);
      const req = { params: { id: "missing" }, body: { role: "pastor" } };
      const res = createMockRes();

      await changeUserRole(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("User not found");
    });

    it("creates pending request for admin or pastor role", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      MockUser.findById.mockResolvedValue({
        _id: "u1",
        role: "member",
        save,
      });
      const req = { params: { id: "u1" }, userId: "admin-id", body: { role: "pastor" } };
      const res = createMockRes();

      await changeUserRole(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain("must accept");
      expect(res.body.user.role).toBe("member");
      expect(res.body.user.pendingRole).toBe("pastor");
      expect(save).toHaveBeenCalled();
    });

    it("updates role immediately for non-elevated role", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      MockUser.findById.mockResolvedValue({
        _id: "u1",
        role: "member",
        pendingRole: "admin",
        save,
      });
      const req = { params: { id: "u1" }, body: { role: "teacher" } };
      const res = createMockRes();

      await changeUserRole(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("User role updated successfully");
      expect(res.body.user.role).toBe("teacher");
      expect(res.body.user.pendingRole).toBe("");
    });
  });

  describe("respondToRoleChange", () => {
    it("returns 400 for invalid action", async () => {
      const req = { userId: "u1", body: { action: "maybe" } };
      const res = createMockRes();

      await respondToRoleChange(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Action must be accept or decline");
    });

    it("accepts pending role change", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      MockUser.findById.mockResolvedValue({
        _id: "u1",
        role: "member",
        pendingRole: "pastor",
        save,
      });
      const req = { userId: "u1", body: { action: "accept" } };
      const res = createMockRes();

      await respondToRoleChange(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.role).toBe("pastor");
      expect(res.body.user.pendingRole).toBe("");
      expect(save).toHaveBeenCalled();
    });

    it("declines pending role change without changing role", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      MockUser.findById.mockResolvedValue({
        _id: "u1",
        role: "member",
        pendingRole: "admin",
        save,
      });
      const req = { userId: "u1", body: { action: "decline" } };
      const res = createMockRes();

      await respondToRoleChange(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.role).toBe("member");
      expect(res.body.user.pendingRole).toBe("");
    });
  });
});
