import { describe, it, expect } from "@jest/globals";
import {
  createSermon,
  updateSermon,
  deleteSermon,
  likeSermon,
  unlikeSermon,
  getSermons,
} from "../../controllers/sermonController.js";

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

describe("Sermon Controller", () => {
  it("should export expected controller functions", () => {
    expect(typeof getSermons).toBe("function");
    expect(typeof createSermon).toBe("function");
    expect(typeof updateSermon).toBe("function");
    expect(typeof deleteSermon).toBe("function");
    expect(typeof likeSermon).toBe("function");
    expect(typeof unlikeSermon).toBe("function");
  });

  it("createSermon should return 400 when required fields are missing", async () => {
    const req = { body: { title: "Only title" } };
    const res = createMockRes();

    await createSermon(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toMatch(/required/i);
  });

  it("createSermon should return 400 for invalid type", async () => {
    const req = {
      body: {
        title: "Sermon",
        speaker: "Pastor",
        type: "podcast",
        url: "https://example.com/file.mp3",
      },
    };
    const res = createMockRes();

    await createSermon(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toMatch(/video or audio/i);
  });

  it("updateSermon should return 400 for invalid id", async () => {
    const req = {
      params: { id: "bad-id" },
      body: {
        title: "Sermon",
        speaker: "Pastor",
        type: "audio",
        url: "https://example.com/audio.mp3",
      },
    };
    const res = createMockRes();

    await updateSermon(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toMatch(/invalid sermon id/i);
  });

  it("deleteSermon should return 400 for invalid id", async () => {
    const req = { params: { id: "not-an-object-id" } };
    const res = createMockRes();

    await deleteSermon(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toMatch(/invalid sermon id/i);
  });

  it("likeSermon should return 400 for invalid id", async () => {
    const req = { params: { id: "bad-id" }, userId: "507f1f77bcf86cd799439011" };
    const res = createMockRes();

    await likeSermon(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toMatch(/invalid sermon id/i);
  });

  it("unlikeSermon should return 400 for invalid id", async () => {
    const req = { params: { id: "bad-id" }, userId: "507f1f77bcf86cd799439011" };
    const res = createMockRes();

    await unlikeSermon(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toMatch(/invalid sermon id/i);
  });
});
