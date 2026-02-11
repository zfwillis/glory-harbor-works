import { authMiddleware } from "../../middleware/auth.js";
import jwt from "jsonwebtoken";

// Mock jwt
jest.mock("jsonwebtoken");

describe("Auth Middleware", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      header: jest.fn(),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it("should authenticate valid token", () => {
    const token = "validToken123";
    const decoded = { id: "userId123" };

    mockReq.header.mockReturnValue(`Bearer ${token}`);
    jwt.verify.mockReturnValue(decoded);

    authMiddleware(mockReq, mockRes, mockNext);

    expect(mockReq.header).toHaveBeenCalledWith("Authorization");
    expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
    expect(mockReq.userId).toBe("userId123");
    expect(mockNext).toHaveBeenCalled();
  });

  it("should return error if no token provided", () => {
    mockReq.header.mockReturnValue(null);

    authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "No token, authorization denied",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should return error if token is invalid", () => {
    const token = "invalidToken";
    mockReq.header.mockReturnValue(`Bearer ${token}`);
    jwt.verify.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Token is not valid",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should handle token without Bearer prefix", () => {
    mockReq.header.mockReturnValue("tokenWithoutBearer");
    jwt.verify.mockReturnValue({ id: "userId123" });

    authMiddleware(mockReq, mockRes, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith("tokenWithoutBearer", expect.any(String));
    expect(mockNext).toHaveBeenCalled();
  });
});
