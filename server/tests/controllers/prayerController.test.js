import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockPrayerModel = {
  find: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
};

jest.unstable_mockModule("../../models/Prayer.js", () => ({
  default: mockPrayerModel,
}));

const {
  getPrayerRequests,
  createPrayerRequest,
  updatePrayerRequest,
  deletePrayerRequest,
} = await import("../../controllers/prayerController.js");

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

describe("Prayer Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPrayerRequests", () => {
    it("returns current user's prayer requests", async () => {
      const prayers = [{ _id: "p1" }, { _id: "p2" }];
      mockPrayerModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(prayers),
      });

      const req = { userId: "u1" };
      const res = createMockRes();

      await getPrayerRequests(req, res);

      expect(mockPrayerModel.find).toHaveBeenCalledWith({ createdBy: "u1" });
      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.prayers).toEqual(prayers);
    });
  });

  describe("createPrayerRequest", () => {
    it("returns 400 when text is missing", async () => {
      const req = { userId: "u1", body: { text: "   " } };
      const res = createMockRes();

      await createPrayerRequest(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Prayer request text is required");
    });

    it("creates a prayer request for current user", async () => {
      mockPrayerModel.create.mockResolvedValue({ _id: "p1", text: "Need prayer" });
      const req = { userId: "u1", body: { text: " Need prayer " } };
      const res = createMockRes();

      await createPrayerRequest(req, res);

      expect(mockPrayerModel.create).toHaveBeenCalledWith({
        createdBy: "u1",
        text: "Need prayer",
        status: "new",
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe("Prayer request submitted successfully");
    });

    it("creates anonymous prayer request with null createdBy", async () => {
      mockPrayerModel.create.mockResolvedValue({ _id: "p2", text: "Anonymous" });
      const req = { userId: "u1", body: { text: "Anonymous", isAnonymous: true } };
      const res = createMockRes();

      await createPrayerRequest(req, res);

      expect(mockPrayerModel.create).toHaveBeenCalledWith({
        createdBy: null,
        text: "Anonymous",
        status: "new",
      });
      expect(res.statusCode).toBe(201);
    });
  });

  describe("updatePrayerRequest", () => {
    it("returns 400 for invalid prayer id", async () => {
      const req = {
        params: { id: "invalid-id" },
        body: { text: "Updated text" },
        userId: "u1",
      };
      const res = createMockRes();

      await updatePrayerRequest(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Invalid prayer request id");
    });

    it("returns 400 when text is missing", async () => {
      const req = {
        params: { id: "67c0f1d2d7f3a8d4b4c8f111" },
        body: { text: " " },
        userId: "u1",
      };
      const res = createMockRes();

      await updatePrayerRequest(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Prayer request text is required");
    });

    it("returns 404 when prayer request is not found", async () => {
      mockPrayerModel.findById.mockResolvedValue(null);
      const req = {
        params: { id: "67c0f1d2d7f3a8d4b4c8f111" },
        body: { text: "Updated text" },
        userId: "u1",
      };
      const res = createMockRes();

      await updatePrayerRequest(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Prayer request not found");
    });

    it("returns 403 when requester does not own prayer request", async () => {
      mockPrayerModel.findById.mockResolvedValue({
        _id: "p1",
        createdBy: { toString: () => "other-user" },
        save: jest.fn(),
      });
      const req = {
        params: { id: "67c0f1d2d7f3a8d4b4c8f111" },
        body: { text: "Updated text" },
        userId: "u1",
      };
      const res = createMockRes();

      await updatePrayerRequest(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Forbidden");
    });

    it("updates prayer request when requester owns it", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const prayer = {
        _id: "p1",
        text: "Old",
        createdBy: { toString: () => "u1" },
        save,
      };
      mockPrayerModel.findById.mockResolvedValue(prayer);
      const req = {
        params: { id: "67c0f1d2d7f3a8d4b4c8f111" },
        body: { text: " Updated text " },
        userId: "u1",
      };
      const res = createMockRes();

      await updatePrayerRequest(req, res);

      expect(save).toHaveBeenCalled();
      expect(prayer.text).toBe("Updated text");
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Prayer request updated successfully");
    });
  });

  describe("deletePrayerRequest", () => {
    it("returns 400 for invalid prayer id", async () => {
      const req = {
        params: { id: "invalid-id" },
        userId: "u1",
      };
      const res = createMockRes();

      await deletePrayerRequest(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Invalid prayer request id");
    });

    it("returns 404 when prayer request is not found", async () => {
      mockPrayerModel.findById.mockResolvedValue(null);
      const req = {
        params: { id: "67c0f1d2d7f3a8d4b4c8f111" },
        userId: "u1",
      };
      const res = createMockRes();

      await deletePrayerRequest(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Prayer request not found");
    });

    it("returns 403 when requester does not own prayer request", async () => {
      mockPrayerModel.findById.mockResolvedValue({
        _id: "p1",
        createdBy: { toString: () => "other-user" },
        deleteOne: jest.fn(),
      });
      const req = {
        params: { id: "67c0f1d2d7f3a8d4b4c8f111" },
        userId: "u1",
      };
      const res = createMockRes();

      await deletePrayerRequest(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Forbidden");
    });

    it("deletes prayer request when requester owns it", async () => {
      const deleteOne = jest.fn().mockResolvedValue(undefined);
      mockPrayerModel.findById.mockResolvedValue({
        _id: "p1",
        createdBy: { toString: () => "u1" },
        deleteOne,
      });
      const req = {
        params: { id: "67c0f1d2d7f3a8d4b4c8f111" },
        userId: "u1",
      };
      const res = createMockRes();

      await deletePrayerRequest(req, res);

      expect(deleteOne).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Prayer request deleted successfully");
      expect(res.body.id).toBe("67c0f1d2d7f3a8d4b4c8f111");
    });
  });
});
