import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockJwt = {
  verify: jest.fn(),
};

const mockUser = {
  findById: jest.fn(),
};

jest.unstable_mockModule("jsonwebtoken", () => ({ default: mockJwt }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: mockUser }));

const {
  authMiddleware,
  optionalAuthMiddleware,
  protect,
  authorize,
} = await import("../../middleware/auth.js");

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

const createReq = (headerValue, userId = undefined) => ({
  userId,
  header: jest.fn().mockImplementation((name) => (name === "Authorization" ? headerValue : null)),
});

describe("Auth Middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 if no authorization header is provided", () => {
    const req = createReq(null);
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("No token, authorization denied");
    expect(next).not.toHaveBeenCalled();
  });

  it("verifies bearer token and stores user id", () => {
    mockJwt.verify.mockReturnValue({ id: "user-1" });
    const req = createReq("Bearer token-1");
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(mockJwt.verify).toHaveBeenCalledWith("token-1", process.env.JWT_SECRET || "your-secret-key");
    expect(req.userId).toBe("user-1");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 401 for invalid required token", () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error("bad token");
    });
    const req = createReq("Bearer bad");
    const res = createMockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Token is not valid");
    expect(next).not.toHaveBeenCalled();
  });

  it("protect is an alias for authMiddleware", () => {
    expect(protect).toBe(authMiddleware);
  });

  it("optional auth continues without token", () => {
    const req = createReq(null);
    const res = createMockRes();
    const next = jest.fn();

    optionalAuthMiddleware(req, res, next);

    expect(req.userId).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("optional auth stores user id when token is valid", () => {
    mockJwt.verify.mockReturnValue({ id: "optional-user" });
    const req = createReq("Bearer optional-token");
    const res = createMockRes();
    const next = jest.fn();

    optionalAuthMiddleware(req, res, next);

    expect(req.userId).toBe("optional-user");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("optional auth continues when token is invalid", () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error("bad optional token");
    });
    const req = createReq("Bearer bad");
    const res = createMockRes();
    const next = jest.fn();

    optionalAuthMiddleware(req, res, next);

    expect(req.userId).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeUndefined();
  });

  it("authorizes users with allowed roles", async () => {
    const user = { _id: "user-1", role: "admin" };
    mockUser.findById.mockResolvedValue(user);
    const req = createReq(null, "user-1");
    const res = createMockRes();
    const next = jest.fn();

    await authorize("admin", "leader")(req, res, next);

    expect(mockUser.findById).toHaveBeenCalledWith("user-1");
    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when authorized user cannot be found", async () => {
    mockUser.findById.mockResolvedValue(null);
    const req = createReq(null, "missing");
    const res = createMockRes();
    const next = jest.fn();

    await authorize("admin")(req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User not found");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user role is not allowed", async () => {
    mockUser.findById.mockResolvedValue({ _id: "user-1", role: "member" });
    const req = createReq(null, "user-1");
    const res = createMockRes();
    const next = jest.fn();

    await authorize("admin", "leader")(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Access denied. admin or leader role required.");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 500 when role lookup throws", async () => {
    mockUser.findById.mockRejectedValue(new Error("database failed"));
    const req = createReq(null, "user-1");
    const res = createMockRes();
    const next = jest.fn();

    await authorize("admin")(req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Authorization error", error: "database failed" });
    expect(next).not.toHaveBeenCalled();
  });
});
