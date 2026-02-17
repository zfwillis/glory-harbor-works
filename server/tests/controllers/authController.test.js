import { describe, it, expect } from "@jest/globals";
import { register, login, logout } from "../../controllers/authController.js";

describe("Auth Controller", () => {
  describe("register", () => {
    it("should be a function", () => {
      expect(typeof register).toBe("function");
    });
  });

  describe("login", () => {
    it("should be a function", () => {
      expect(typeof login).toBe("function");
    });
  });

  describe("logout", () => {
    it("should return logout success message", async () => {
      const mockReq = {};
      const mockRes = {
        json: (data) => {
          mockRes.data = data;
        },
      };

      await logout(mockReq, mockRes);

      expect(mockRes.data.message).toBe("Logout successful");
    });

    it("should be a function", () => {
      expect(typeof logout).toBe("function");
    });
  });
});
