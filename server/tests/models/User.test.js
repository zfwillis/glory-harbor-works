import { describe, it, expect } from "@jest/globals";
import User from "../../models/User.js";

describe("User Model", () => {
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

    it("should have comparePassword method", () => {
      const user = new User({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      });

      expect(typeof user.comparePassword).toBe("function");
    });

    it("should require email, firstName, lastName, and password", () => {
      const user = new User({});
      const error = user.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.firstName).toBeDefined();
      expect(error.errors.lastName).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });
  });
});
