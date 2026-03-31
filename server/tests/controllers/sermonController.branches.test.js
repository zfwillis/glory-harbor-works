import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockSermonModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

const mockUserModel = {
  findById: jest.fn(),
};

jest.unstable_mockModule("../../models/Sermon.js", () => ({
  default: mockSermonModel,
}));

jest.unstable_mockModule("../../models/User.js", () => ({
  default: mockUserModel,
}));

const {
  getSermons,
  createSermon,
  updateSermon,
  deleteSermon,
  addCommentToSermon,
  updateCommentOnSermon,
  deleteCommentFromSermon,
  likeSermon,
  unlikeSermon,
} = await import("../../controllers/sermonController.js");

const createMockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.payload = payload;
    return res;
  };
  return res;
};

const mockFindLean = (value) => {
  mockSermonModel.find.mockReturnValue({
    sort: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(value),
    }),
  });
};

describe("Sermon Controller Branches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("getSermons returns liked state based on requester", async () => {
    mockFindLean([
      {
        _id: "s1",
        title: "Title",
        likedBy: [{ toString: () => "u1" }],
      },
    ]);
    const req = { query: {}, userId: "u1" };
    const res = createMockRes();

    await getSermons(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.sermons[0].liked).toBe(true);
  });

  it("getSermons returns empty list on unmatched search when db has sermons", async () => {
    mockFindLean([]);
    mockSermonModel.countDocuments.mockResolvedValue(3);
    const req = { query: { q: "none" }, userId: "u1" };
    const res = createMockRes();

    await getSermons(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.count).toBe(0);
    expect(res.payload.sermons).toEqual([]);
  });

  it("getSermons seeds fallback sermons when database is empty", async () => {
    mockSermonModel.find
      .mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      })
      .mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { _id: "s1", title: "Fallback", likedBy: [] },
            { _id: "s2", title: "Fallback 2", likedBy: [] },
          ]),
        }),
      });
    mockSermonModel.countDocuments.mockResolvedValue(0);
    mockSermonModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });
    mockSermonModel.create.mockResolvedValue({});

    const req = { query: {}, userId: "u1" };
    const res = createMockRes();

    await getSermons(req, res);

    expect(mockSermonModel.create).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.payload.count).toBe(2);
  });

  it("getSermons returns 500 on query failure", async () => {
    mockSermonModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error("db failed")),
      }),
    });
    const req = { query: {}, userId: "u1" };
    const res = createMockRes();

    await getSermons(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.message).toMatch(/error fetching sermons/i);
  });

  it("createSermon creates from url payload", async () => {
    mockSermonModel.create.mockResolvedValue({ _id: "s1" });
    const req = {
      body: {
        title: "Title",
        speaker: "Pastor",
        type: "audio",
        url: "https://example.com/audio.mp3",
      },
      files: {},
    };
    const res = createMockRes();

    await createSermon(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.payload.success).toBe(true);
    expect(mockSermonModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Title",
        speaker: "Pastor",
        type: "audio",
        url: "https://example.com/audio.mp3",
      })
    );
  });

  it("createSermon returns 400 when required fields are missing", async () => {
    const req = {
      body: {
        title: "Title",
        speaker: "Pastor",
      },
      files: {},
    };
    const res = createMockRes();

    await createSermon(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/required/i);
  });

  it("createSermon returns 400 for invalid type", async () => {
    const req = {
      body: {
        title: "Title",
        speaker: "Pastor",
        type: "text",
        url: "https://example.com/file.mp3",
      },
      files: {},
    };
    const res = createMockRes();

    await createSermon(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/type must be video or audio/i);
  });

  it("createSermon infers type from uploaded media file", async () => {
    mockSermonModel.create.mockResolvedValue({ _id: "s1" });
    const req = {
      body: {
        title: "Title",
        speaker: "Pastor",
      },
      files: {
        media: [{ filename: "sermon.mp3", mimetype: "audio/mpeg" }],
      },
      protocol: "http",
      get: jest.fn().mockReturnValue("localhost:5000"),
    };
    const res = createMockRes();

    await createSermon(req, res);

    expect(mockSermonModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "audio",
        url: "http://localhost:5000/uploads/sermon.mp3",
      })
    );
    expect(res.statusCode).toBe(201);
  });

  it("createSermon returns 500 when creation fails", async () => {
    mockSermonModel.create.mockRejectedValue(new Error("write failed"));
    const req = {
      body: {
        title: "Title",
        speaker: "Pastor",
        type: "audio",
        url: "https://example.com/audio.mp3",
      },
      files: {},
    };
    const res = createMockRes();

    await createSermon(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.message).toMatch(/error uploading sermon/i);
  });

  it("updateSermon returns 400 for invalid id", async () => {
    const req = {
      params: { id: "bad-id" },
      body: {
        title: "T",
        speaker: "S",
        type: "audio",
        url: "https://example.com/a.mp3",
      },
      files: {},
    };
    const res = createMockRes();

    await updateSermon(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/invalid sermon id/i);
  });

  it("updateSermon returns 400 when required fields are missing", async () => {
    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      body: {
        title: "T",
      },
      files: {},
    };
    const res = createMockRes();

    await updateSermon(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/required/i);
  });

  it("updateSermon returns 400 for invalid type", async () => {
    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      body: {
        title: "T",
        speaker: "S",
        type: "text",
        url: "https://example.com/a.mp3",
      },
      files: {},
    };
    const res = createMockRes();

    await updateSermon(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/type must be video or audio/i);
  });

  it("updateSermon returns 404 when sermon does not exist", async () => {
    mockSermonModel.findById.mockResolvedValue(null);
    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      body: {
        title: "T",
        speaker: "S",
        type: "audio",
        url: "https://example.com/a.mp3",
      },
      files: {},
    };
    const res = createMockRes();

    await updateSermon(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.payload.message).toMatch(/not found/i);
  });

  it("updateSermon updates existing sermon", async () => {
    mockSermonModel.findById.mockResolvedValue({
      _id: "s1",
      thumbnailUrl: "https://example.com/old.jpg",
      url: "https://example.com/old.mp3",
    });
    mockSermonModel.findByIdAndUpdate.mockResolvedValue({
      _id: "s1",
      title: "Updated",
      thumbnailUrl: "",
      url: "https://example.com/new.mp3",
    });
    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      body: {
        title: "Updated",
        speaker: "Pastor",
        type: "audio",
        url: "https://example.com/new.mp3",
        removeThumbnail: "1",
      },
      files: {},
    };
    const res = createMockRes();

    await updateSermon(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.message).toMatch(/updated successfully/i);
  });

  it("updateSermon returns 500 when update fails", async () => {
    mockSermonModel.findById.mockResolvedValue({
      _id: "s1",
      thumbnailUrl: "",
      url: "https://example.com/old.mp3",
    });
    mockSermonModel.findByIdAndUpdate.mockRejectedValue(new Error("write failed"));
    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      body: {
        title: "Updated",
        speaker: "Pastor",
        type: "audio",
        url: "https://example.com/new.mp3",
      },
      files: {},
    };
    const res = createMockRes();

    await updateSermon(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.message).toMatch(/error updating sermon/i);
  });

  it("deleteSermon returns 400 for invalid id", async () => {
    const req = { params: { id: "bad-id" } };
    const res = createMockRes();

    await deleteSermon(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/invalid sermon id/i);
  });

  it("deleteSermon returns 404 for missing sermon", async () => {
    mockSermonModel.findByIdAndDelete.mockResolvedValue(null);
    const req = { params: { id: "507f1f77bcf86cd799439011" } };
    const res = createMockRes();

    await deleteSermon(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.payload.message).toMatch(/not found/i);
  });

  it("deleteSermon deletes existing sermon", async () => {
    mockSermonModel.findByIdAndDelete.mockResolvedValue({
      _id: "s1",
      title: "Deleted Sermon",
      thumbnailUrl: "",
      url: "",
    });
    const req = { params: { id: "507f1f77bcf86cd799439011" } };
    const res = createMockRes();

    await deleteSermon(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.sermon.title).toBe("Deleted Sermon");
  });

  it("deleteSermon returns 500 on delete failure", async () => {
    mockSermonModel.findByIdAndDelete.mockRejectedValue(new Error("db failed"));
    const req = { params: { id: "507f1f77bcf86cd799439011" } };
    const res = createMockRes();

    await deleteSermon(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.message).toMatch(/error deleting sermon/i);
  });

  it("addCommentToSermon returns 401 when unauthorized", async () => {
    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      body: { text: "Hello" },
    };
    const res = createMockRes();

    await addCommentToSermon(req, res);

    expect(res.statusCode).toBe(401);
  });

  it("addCommentToSermon returns 400 for invalid sermon id", async () => {
    const req = {
      params: { id: "bad-id" },
      userId: "u1",
      body: { text: "Hello" },
    };
    const res = createMockRes();

    await addCommentToSermon(req, res);

    expect(res.statusCode).toBe(400);
  });

  it("addCommentToSermon returns 400 when text is blank", async () => {
    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      userId: "u1",
      body: { text: "   " },
    };
    const res = createMockRes();

    await addCommentToSermon(req, res);

    expect(res.statusCode).toBe(400);
  });

  it("addCommentToSermon returns 404 when sermon is missing", async () => {
    mockSermonModel.findById.mockResolvedValue(null);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: "u1", firstName: "Jane", lastName: "Doe", role: "member" }),
    });
    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      userId: "u1",
      body: { text: "Hello" },
    };
    const res = createMockRes();

    await addCommentToSermon(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.payload.message).toMatch(/sermon not found/i);
  });

  it("addCommentToSermon returns 404 when user is missing", async () => {
    mockSermonModel.findById.mockResolvedValue({ comments: [] });
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });
    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      userId: "u1",
      body: { text: "Hello" },
    };
    const res = createMockRes();

    await addCommentToSermon(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.payload.message).toMatch(/user not found/i);
  });

  it("addCommentToSermon adds a comment successfully", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const sermon = {
      comments: [],
      save,
    };
    mockSermonModel.findById.mockResolvedValue(sermon);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "u1",
        firstName: "Jane",
        lastName: "Doe",
        role: "member",
        avatarUrl: "",
      }),
    });

    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      userId: "u1",
      body: { text: " Great message " },
    };
    const res = createMockRes();

    await addCommentToSermon(req, res);

    expect(save).toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.payload.success).toBe(true);
    expect(res.payload.comment.text).toBe("Great message");
  });

  it("addCommentToSermon returns 500 on save failure", async () => {
    const sermon = {
      comments: [],
      save: jest.fn().mockRejectedValue(new Error("save failed")),
    };
    mockSermonModel.findById.mockResolvedValue(sermon);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "u1",
        firstName: "Jane",
        lastName: "Doe",
        role: "member",
        avatarUrl: "",
      }),
    });

    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      userId: "u1",
      body: { text: "Hello" },
    };
    const res = createMockRes();

    await addCommentToSermon(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.message).toMatch(/error adding comment/i);
  });

  it("deleteCommentFromSermon returns 403 when requester cannot moderate", async () => {
    const comment = {
      _id: "507f1f77bcf86cd799439012",
      userId: { toString: () => "owner-id" },
      deleteOne: jest.fn(),
    };
    const sermon = {
      comments: {
        id: jest.fn().mockReturnValue(comment),
      },
      save: jest.fn(),
    };
    mockSermonModel.findById.mockResolvedValue(sermon);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: "member" }),
    });
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011",
        commentId: "507f1f77bcf86cd799439012",
      },
      userId: "another-user",
    };
    const res = createMockRes();

    await deleteCommentFromSermon(req, res);

    expect(res.statusCode).toBe(403);
  });

  it("updateCommentOnSermon returns 400 for invalid ids", async () => {
    const req = {
      params: { id: "bad-id", commentId: "also-bad" },
      userId: "u1",
      body: { text: "Updated" },
    };
    const res = createMockRes();

    await updateCommentOnSermon(req, res);

    expect(res.statusCode).toBe(400);
  });

  it("updateCommentOnSermon returns 401 when unauthorized", async () => {
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011",
        commentId: "507f1f77bcf86cd799439012",
      },
      body: { text: "Updated" },
    };
    const res = createMockRes();

    await updateCommentOnSermon(req, res);

    expect(res.statusCode).toBe(401);
  });

  it("updateCommentOnSermon returns 400 when text is blank", async () => {
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011",
        commentId: "507f1f77bcf86cd799439012",
      },
      userId: "u1",
      body: { text: "   " },
    };
    const res = createMockRes();

    await updateCommentOnSermon(req, res);

    expect(res.statusCode).toBe(400);
  });

  it("updateCommentOnSermon returns 403 when requester cannot edit", async () => {
    const comment = {
      _id: "507f1f77bcf86cd799439012",
      userId: { toString: () => "owner-id" },
      text: "Original",
    };
    const sermon = {
      comments: {
        id: jest.fn().mockReturnValue(comment),
      },
      save: jest.fn(),
    };
    mockSermonModel.findById.mockResolvedValue(sermon);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: "member" }),
    });
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011",
        commentId: "507f1f77bcf86cd799439012",
      },
      userId: "another-user",
      body: { text: "Updated" },
    };
    const res = createMockRes();

    await updateCommentOnSermon(req, res);

    expect(res.statusCode).toBe(403);
  });

  it("updateCommentOnSermon allows leader moderation", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const comment = {
      _id: "507f1f77bcf86cd799439012",
      userId: { toString: () => "owner-id" },
      text: "Original",
    };
    const sermon = {
      comments: {
        id: jest.fn().mockReturnValue(comment),
      },
      save,
    };
    mockSermonModel.findById.mockResolvedValue(sermon);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: "leader" }),
    });
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011",
        commentId: "507f1f77bcf86cd799439012",
      },
      userId: "leader-user",
      body: { text: "Moderated" },
    };
    const res = createMockRes();

    await updateCommentOnSermon(req, res);

    expect(save).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it("updateCommentOnSermon returns 500 on save failure", async () => {
    const comment = {
      _id: "507f1f77bcf86cd799439012",
      userId: { toString: () => "u1" },
      text: "Original",
    };
    const sermon = {
      comments: {
        id: jest.fn().mockReturnValue(comment),
      },
      save: jest.fn().mockRejectedValue(new Error("save failed")),
    };
    mockSermonModel.findById.mockResolvedValue(sermon);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: "member" }),
    });
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011",
        commentId: "507f1f77bcf86cd799439012",
      },
      userId: "u1",
      body: { text: "Updated" },
    };
    const res = createMockRes();

    await updateCommentOnSermon(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.message).toMatch(/error updating comment/i);
  });

  it("updateCommentOnSermon updates comment for owner", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const comment = {
      _id: "507f1f77bcf86cd799439012",
      userId: { toString: () => "u1" },
      text: "Original",
    };
    const sermon = {
      comments: {
        id: jest.fn().mockReturnValue(comment),
      },
      save,
    };
    mockSermonModel.findById.mockResolvedValue(sermon);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: "member" }),
    });
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011",
        commentId: "507f1f77bcf86cd799439012",
      },
      userId: "u1",
      body: { text: " Updated comment " },
    };
    const res = createMockRes();

    await updateCommentOnSermon(req, res);

    expect(save).toHaveBeenCalled();
    expect(comment.text).toBe("Updated comment");
    expect(res.statusCode).toBe(200);
    expect(res.payload.comment.text).toBe("Updated comment");
  });

  it("deleteCommentFromSermon returns 400 for invalid ids", async () => {
    const req = {
      params: { id: "bad-id", commentId: "also-bad" },
      userId: "u1",
    };
    const res = createMockRes();

    await deleteCommentFromSermon(req, res);

    expect(res.statusCode).toBe(400);
  });

  it("deleteCommentFromSermon returns 401 when unauthorized", async () => {
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011",
        commentId: "507f1f77bcf86cd799439012",
      },
    };
    const res = createMockRes();

    await deleteCommentFromSermon(req, res);

    expect(res.statusCode).toBe(401);
  });

  it("deleteCommentFromSermon returns 404 when sermon is missing", async () => {
    mockSermonModel.findById.mockResolvedValue(null);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: "member" }),
    });
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011",
        commentId: "507f1f77bcf86cd799439012",
      },
      userId: "u1",
    };
    const res = createMockRes();

    await deleteCommentFromSermon(req, res);

    expect(res.statusCode).toBe(404);
  });

  it("deleteCommentFromSermon returns 404 when user is missing", async () => {
    mockSermonModel.findById.mockResolvedValue({ comments: { id: jest.fn() } });
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011",
        commentId: "507f1f77bcf86cd799439012",
      },
      userId: "u1",
    };
    const res = createMockRes();

    await deleteCommentFromSermon(req, res);

    expect(res.statusCode).toBe(404);
  });

  it("deleteCommentFromSermon returns 404 when comment is missing", async () => {
    mockSermonModel.findById.mockResolvedValue({
      comments: {
        id: jest.fn().mockReturnValue(null),
      },
    });
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: "member" }),
    });
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011",
        commentId: "507f1f77bcf86cd799439012",
      },
      userId: "u1",
    };
    const res = createMockRes();

    await deleteCommentFromSermon(req, res);

    expect(res.statusCode).toBe(404);
  });

  it("deleteCommentFromSermon allows pastor moderation", async () => {
    const deleteOne = jest.fn();
    const save = jest.fn().mockResolvedValue(undefined);
    const comment = {
      _id: "507f1f77bcf86cd799439012",
      userId: { toString: () => "owner-id" },
      deleteOne,
    };
    const sermon = {
      comments: {
        id: jest.fn().mockReturnValue(comment),
      },
      save,
    };
    mockSermonModel.findById.mockResolvedValue(sermon);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: "pastor" }),
    });
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011",
        commentId: "507f1f77bcf86cd799439012",
      },
      userId: "pastor-user",
    };
    const res = createMockRes();

    await deleteCommentFromSermon(req, res);

    expect(deleteOne).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it("deleteCommentFromSermon deletes comment for owner", async () => {
    const deleteOne = jest.fn();
    const save = jest.fn().mockResolvedValue(undefined);
    const comment = {
      _id: "507f1f77bcf86cd799439012",
      userId: { toString: () => "u1" },
      deleteOne,
    };
    const sermon = {
      comments: {
        id: jest.fn().mockReturnValue(comment),
      },
      save,
    };
    mockSermonModel.findById.mockResolvedValue(sermon);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: "member" }),
    });
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011",
        commentId: "507f1f77bcf86cd799439012",
      },
      userId: "u1",
    };
    const res = createMockRes();

    await deleteCommentFromSermon(req, res);

    expect(deleteOne).toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it("deleteCommentFromSermon returns 500 on save failure", async () => {
    const comment = {
      _id: "507f1f77bcf86cd799439012",
      userId: { toString: () => "u1" },
      deleteOne: jest.fn(),
    };
    const sermon = {
      comments: {
        id: jest.fn().mockReturnValue(comment),
      },
      save: jest.fn().mockRejectedValue(new Error("save failed")),
    };
    mockSermonModel.findById.mockResolvedValue(sermon);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: "member" }),
    });
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011",
        commentId: "507f1f77bcf86cd799439012",
      },
      userId: "u1",
    };
    const res = createMockRes();

    await deleteCommentFromSermon(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.message).toMatch(/error deleting comment/i);
  });

  it("likeSermon returns 400 for invalid id", async () => {
    const req = { params: { id: "bad-id" }, userId: "u1" };
    const res = createMockRes();

    await likeSermon(req, res);

    expect(res.statusCode).toBe(400);
  });

  it("likeSermon returns 404 when sermon does not exist", async () => {
    mockSermonModel.findById.mockResolvedValue(null);
    const req = { params: { id: "507f1f77bcf86cd799439011" }, userId: "u1" };
    const res = createMockRes();

    await likeSermon(req, res);

    expect(res.statusCode).toBe(404);
  });

  it("likeSermon returns already-liked response", async () => {
    mockSermonModel.findById.mockResolvedValue({
      _id: "s1",
      likesCount: 1,
      likedBy: [{ toString: () => "u1" }],
      save: jest.fn(),
    });
    const req = { params: { id: "507f1f77bcf86cd799439011" }, userId: "u1" };
    const res = createMockRes();

    await likeSermon(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.message).toMatch(/already liked/i);
  });

  it("likeSermon adds like when not already liked", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const sermon = {
      _id: "s1",
      likesCount: 0,
      likedBy: [],
      save,
    };
    mockSermonModel.findById.mockResolvedValue(sermon);
    const req = { params: { id: "507f1f77bcf86cd799439011" }, userId: "u1" };
    const res = createMockRes();

    await likeSermon(req, res);

    expect(save).toHaveBeenCalled();
    expect(sermon.likesCount).toBe(1);
    expect(res.statusCode).toBe(200);
    expect(res.payload.sermon.liked).toBe(true);
  });

  it("likeSermon returns 500 on failure", async () => {
    mockSermonModel.findById.mockRejectedValue(new Error("db failed"));
    const req = { params: { id: "507f1f77bcf86cd799439011" }, userId: "u1" };
    const res = createMockRes();

    await likeSermon(req, res);

    expect(res.statusCode).toBe(500);
  });

  it("unlikeSermon returns 400 for invalid id", async () => {
    const req = { params: { id: "bad-id" }, userId: "u1" };
    const res = createMockRes();

    await unlikeSermon(req, res);

    expect(res.statusCode).toBe(400);
  });

  it("unlikeSermon returns 404 when sermon does not exist", async () => {
    mockSermonModel.findById.mockResolvedValue(null);
    const req = { params: { id: "507f1f77bcf86cd799439011" }, userId: "u1" };
    const res = createMockRes();

    await unlikeSermon(req, res);

    expect(res.statusCode).toBe(404);
  });

  it("unlikeSermon removes like successfully", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const sermon = {
      _id: "s1",
      likesCount: 2,
      likedBy: [{ toString: () => "u1" }, { toString: () => "u2" }],
      save,
    };
    mockSermonModel.findById.mockResolvedValue(sermon);
    const req = { params: { id: "507f1f77bcf86cd799439011" }, userId: "u1" };
    const res = createMockRes();

    await unlikeSermon(req, res);

    expect(save).toHaveBeenCalled();
    expect(sermon.likesCount).toBe(1);
    expect(res.statusCode).toBe(200);
    expect(res.payload.sermon.liked).toBe(false);
  });

  it("unlikeSermon returns 500 on failure", async () => {
    mockSermonModel.findById.mockRejectedValue(new Error("db failed"));
    const req = { params: { id: "507f1f77bcf86cd799439011" }, userId: "u1" };
    const res = createMockRes();

    await unlikeSermon(req, res);

    expect(res.statusCode).toBe(500);
  });
});
