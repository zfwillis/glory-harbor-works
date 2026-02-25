import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockSermonModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
};

jest.unstable_mockModule("../../models/Sermon.js", () => ({
  default: mockSermonModel,
}));

const { getSermons, likeSermon, unlikeSermon } = await import("../../controllers/sermonController.js");

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

const createFindChain = (result) => ({
  sort: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(result),
  }),
});

describe("Sermon Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSermons", () => {
    it("should return sermons from database", async () => {
      mockSermonModel.find.mockReturnValue(
        createFindChain([
          {
            _id: "67c0f1d2d7f3a8d4b4c8f111",
            title: "Sermon 1",
            speaker: "Pastor",
            likedBy: [],
          },
        ])
      );

      const req = { query: {} };
      const res = createMockRes();

      await getSermons(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.sermons[0].title).toBe("Sermon 1");
      expect(res.body.sermons[0].liked).toBe(false);
    });

    it("should include liked=true when current user liked sermon", async () => {
      const userId = "67c0f1d2d7f3a8d4b4c8f999";
      mockSermonModel.find.mockReturnValue(
        createFindChain([
          {
            _id: "67c0f1d2d7f3a8d4b4c8f111",
            title: "Sermon 1",
            speaker: "Pastor",
            likedBy: [{ toString: () => userId }],
          },
        ])
      );

      const req = { query: {}, userId };
      const res = createMockRes();

      await getSermons(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.sermons[0].liked).toBe(true);
    });
  });

  describe("likeSermon", () => {
    it("should return 400 for invalid sermon id", async () => {
      const req = { params: { id: "bad-id" }, userId: "67c0f1d2d7f3a8d4b4c8f999" };
      const res = createMockRes();

      await likeSermon(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Invalid sermon id");
    });

    it("should return 404 when sermon is not found", async () => {
      mockSermonModel.findById.mockResolvedValue(null);
      const req = {
        params: { id: "67c0f1d2d7f3a8d4b4c8f111" },
        userId: "67c0f1d2d7f3a8d4b4c8f999",
      };
      const res = createMockRes();

      await likeSermon(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Sermon not found");
    });

    it("should like sermon when user has not liked before", async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const sermon = {
        _id: "67c0f1d2d7f3a8d4b4c8f111",
        likedBy: [],
        likesCount: 0,
        save,
      };
      mockSermonModel.findById.mockResolvedValue(sermon);

      const req = {
        params: { id: "67c0f1d2d7f3a8d4b4c8f111" },
        userId: "67c0f1d2d7f3a8d4b4c8f999",
      };
      const res = createMockRes();

      await likeSermon(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.sermon.liked).toBe(true);
      expect(res.body.sermon.likesCount).toBe(1);
      expect(save).toHaveBeenCalled();
    });
  });

  describe("unlikeSermon", () => {
    it("should unlike sermon and decrement like count", async () => {
      const userId = "67c0f1d2d7f3a8d4b4c8f999";
      const save = jest.fn().mockResolvedValue(undefined);
      const sermon = {
        _id: "67c0f1d2d7f3a8d4b4c8f111",
        likedBy: [{ toString: () => userId }],
        likesCount: 1,
        save,
      };
      mockSermonModel.findById.mockResolvedValue(sermon);

      const req = {
        params: { id: "67c0f1d2d7f3a8d4b4c8f111" },
        userId,
      };
      const res = createMockRes();

      await unlikeSermon(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.sermon.liked).toBe(false);
      expect(res.body.sermon.likesCount).toBe(0);
      expect(save).toHaveBeenCalled();
    });
  });
});
