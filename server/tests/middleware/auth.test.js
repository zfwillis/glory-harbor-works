import { describe, it, expect } from "@jest/globals";
import { authMiddleware } from "../../middleware/auth.js";

describe("Auth Middleware", () => {
  it("should return 401 if no authorization header provided", () => {
    const mockReq = {
      header: () => null,
    };
    const mockRes = {
      status: (code) => {
        mockRes.code = code;
        return mockRes;
      },
      json: (data) => {
        mockRes.data = data;
      },
    };
    const mockNext = () => {};

    authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.code).toBe(401);
    expect(mockRes.data.message).toBe("No token, authorization denied");
  });

  it("should be a function", () => {
    expect(typeof authMiddleware).toBe("function");
  });
});
