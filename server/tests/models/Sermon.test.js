import { describe, it, expect } from "@jest/globals";
import Sermon from "../../models/Sermon.js";

describe("Sermon Model", () => {
  it("should create sermon with valid data", () => {
    const sermon = new Sermon({
      title: "Victory Through Faith",
      speaker: "Pastor Jane",
      type: "audio",
      url: "https://example.com/audio.mp3",
    });

    expect(sermon.title).toBe("Victory Through Faith");
    expect(sermon.speaker).toBe("Pastor Jane");
    expect(sermon.type).toBe("audio");
    expect(sermon.url).toBe("https://example.com/audio.mp3");
    expect(sermon.topic).toBe("");
    expect(sermon.series).toBe("");
    expect(sermon.description).toBe("");
    expect(sermon.thumbnailUrl).toBe("");
    expect(sermon.likesCount).toBe(0);
    expect(Array.isArray(sermon.likedBy)).toBe(true);
  });

  it("should fail validation without required fields", () => {
    const sermon = new Sermon({});
    const error = sermon.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.title).toBeDefined();
    expect(error.errors.speaker).toBeDefined();
    expect(error.errors.url).toBeDefined();
  });

  it("should enforce type enum", () => {
    const sermon = new Sermon({
      title: "Test Sermon",
      speaker: "Pastor John",
      type: "document",
      url: "https://example.com/file",
    });

    const error = sermon.validateSync();
    expect(error).toBeDefined();
    expect(error.errors.type).toBeDefined();
  });
});
