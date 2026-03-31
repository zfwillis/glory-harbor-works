import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import mongoose from "mongoose";

const mockHash = jest.fn();
const mockCompare = jest.fn();

jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash: mockHash,
    compare: mockCompare,
  },
  hash: mockHash,
  compare: mockCompare,
}));

const { default: User } = await import("../../models/User.js");

const runSavePreHook = async (user) => {
  const saveHooks = User.schema.s.hooks._pres.get("save") || [];
  const passwordHook = saveHooks.find((hook) => String(hook.fn).includes("this.password = await bcrypt.hash"));

  if (!passwordHook) {
    throw new Error("Password pre-save hook not found");
  }

  await passwordHook.fn.call(user);
};

describe("User Model", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("schema validation", () => {
    it("creates a user with valid data", () => {
      const user = new User({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        role: "member",
      });

      expect(user.email).toBe("test@example.com");
      expect(user.firstName).toBe("John");
      expect(user.lastName).toBe("Doe");
      expect(user.role).toBe("member");
      expect(user.status).toBe("active");
      expect(user.avatarUrl).toBe("");
      expect(Array.isArray(user.managesUserIds)).toBe(true);
      expect(Array.isArray(user.availability)).toBe(true);
    });

    it("applies lowercase and trim setters to string fields", () => {
      const user = new User({
        email: "  TEST@EXAMPLE.COM  ",
        password: "password123",
        firstName: "  John  ",
        lastName: "  Doe  ",
        avatarUrl: "  https://example.com/avatar.jpg  ",
      });

      expect(user.email).toBe("test@example.com");
      expect(user.firstName).toBe("John");
      expect(user.lastName).toBe("Doe");
      expect(user.avatarUrl).toBe("https://example.com/avatar.jpg");
    });

    it("sets default role and status values", () => {
      const user = new User({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      });

      expect(user.role).toBe("member");
      expect(user.status).toBe("active");
    });

    it("requires email, firstName, lastName, and password", () => {
      const user = new User({});
      const error = user.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.firstName).toBeDefined();
      expect(error.errors.lastName).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });

    it("rejects an invalid role", () => {
      const user = new User({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        role: "admin",
      });

      const error = user.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.role).toBeDefined();
    });

    it("rejects an invalid status", () => {
      const user = new User({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        status: "archived",
      });

      const error = user.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.status).toBeDefined();
    });

    it("stores availability slots and managed user ids", () => {
      const managedUserId = new mongoose.Types.ObjectId();
      const user = new User({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        managesUserIds: [managedUserId],
        availability: [{ day: "Monday", start: "09:00", end: "12:00" }],
      });

      expect(user.managesUserIds).toHaveLength(1);
      expect(String(user.managesUserIds[0])).toBe(String(managedUserId));
      expect(user.availability).toHaveLength(1);
      expect(user.availability[0]).toMatchObject({ day: "Monday", start: "09:00", end: "12:00" });
    });

    it("exposes the comparePassword instance method", () => {
      const user = new User({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      });

      expect(typeof user.comparePassword).toBe("function");
    });
  });

  describe("password behavior", () => {
    it("hashes the password in the pre-save hook when modified", async () => {
      mockHash.mockResolvedValue("hashed-password");
      const user = new User({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      });

      user.isModified = jest.fn().mockReturnValue(true);

      await runSavePreHook(user);

      expect(mockHash).toHaveBeenCalledWith("password123", 10);
      expect(user.password).toBe("hashed-password");
    });

    it("does not hash the password in the pre-save hook when unchanged", async () => {
      mockHash.mockResolvedValue("hashed-password");
      const user = new User({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      });

      user.isModified = jest.fn().mockReturnValue(false);

      await runSavePreHook(user);

      expect(mockHash).not.toHaveBeenCalled();
      expect(user.password).toBe("password123");
    });

    it("delegates password comparison to bcrypt.compare", async () => {
      mockCompare.mockResolvedValue(true);
      const user = new User({
        email: "test@example.com",
        password: "hashed-password",
        firstName: "John",
        lastName: "Doe",
      });

      const isMatch = await user.comparePassword("password123");

      expect(mockCompare).toHaveBeenCalledWith("password123", "hashed-password");
      expect(isMatch).toBe(true);
    });
  });
});
