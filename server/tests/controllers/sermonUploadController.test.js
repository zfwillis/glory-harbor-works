import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";

const mockSermonModel = {
  create: jest.fn(),
};

jest.unstable_mockModule("../../models/Sermon.js", () => ({
  default: mockSermonModel,
}));

jest.unstable_mockModule("../../models/User.js", () => ({
  default: {},
}));

const { createSermon } = await import("../../controllers/sermonController.js");

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

describe("Sermon Upload Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 400 when neither media URL nor media file is provided", async () => {
    const req = {
      body: {
        title: "Sample",
        speaker: "Pastor",
        type: "video",
        url: "",
      },
      files: {},
    };
    const res = createMockRes();

    await createSermon(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toMatch(/either a media url or media file are required/i);
  });

  it("creates sermon from uploaded media file and infers video type", async () => {
    const created = { _id: "s1", type: "video", url: "http://localhost:5000/uploads/sermon-file.mp4" };
    mockSermonModel.create.mockResolvedValue(created);

    const req = {
      body: {
        title: "Upload Test",
        speaker: "Pastor",
        type: "",
        url: "",
        topic: "Faith",
      },
      files: {
        media: [{ filename: "sermon-file.mp4", mimetype: "video/mp4" }],
      },
      protocol: "http",
      get: jest.fn().mockReturnValue("localhost:5000"),
    };
    const res = createMockRes();

    await createSermon(req, res);

    expect(mockSermonModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Upload Test",
        speaker: "Pastor",
        type: "video",
        url: "http://localhost:5000/uploads/sermon-file.mp4",
      })
    );
    expect(res.statusCode).toBe(201);
    expect(res.payload.success).toBe(true);
    expect(res.payload.message).toMatch(/uploaded successfully/i);
  });

  it("creates sermon with uploaded image thumbnail URL", async () => {
    mockSermonModel.create.mockResolvedValue({ _id: "s2" });

    const req = {
      body: {
        title: "With Thumbnail",
        speaker: "Pastor",
        type: "audio",
        url: "https://example.com/audio.mp3",
        thumbnailUrl: "",
      },
      files: {
        image: [{ filename: "thumb.jpg", mimetype: "image/jpeg" }],
      },
      protocol: "http",
      get: jest.fn().mockReturnValue("localhost:5000"),
    };
    const res = createMockRes();

    await createSermon(req, res);

    expect(mockSermonModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        thumbnailUrl: "http://localhost:5000/uploads/thumb.jpg",
      })
    );
    expect(res.statusCode).toBe(201);
  });

  it("returns 400 for unsupported type when media type cannot be inferred", async () => {
    const req = {
      body: {
        title: "Bad Type",
        speaker: "Pastor",
        type: "podcast",
        url: "https://example.com/file.bin",
      },
      files: {},
      protocol: "http",
      get: jest.fn().mockReturnValue("localhost:5000"),
    };
    const res = createMockRes();

    await createSermon(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toMatch(/type must be video or audio/i);
  });

  it("returns 500 when create operation throws", async () => {
    mockSermonModel.create.mockRejectedValue(new Error("db down"));
    const req = {
      body: {
        title: "Failure",
        speaker: "Pastor",
        type: "audio",
        url: "https://example.com/audio.mp3",
      },
      files: {},
      protocol: "http",
      get: jest.fn().mockReturnValue("localhost:5000"),
    };
    const res = createMockRes();

    await createSermon(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toMatch(/error uploading sermon/i);
  });
});
