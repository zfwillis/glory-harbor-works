import { describe, it, expect } from "@jest/globals";
import Sermon from "../../models/Sermon.js";

describe("Sermon Model", () => {
  describe("Sermon Schema Validation", () => {
    it("should create sermon with valid data", () => {
      const sermon = new Sermon({
        title: "Walking in Faith",
        speaker: "Pastor Victor",
        type: "video",
        url: "https://www.youtube.com/embed/example",
      });

      const validationError = sermon.validateSync();
      expect(validationError).toBeUndefined();
      expect(sermon.title).toBe("Walking in Faith");
      expect(sermon.speaker).toBe("Pastor Victor");
      expect(sermon.type).toBe("video");
    });

    it("should require title, speaker, type, and url", () => {
      const sermon = new Sermon({});
      const validationError = sermon.validateSync();

      expect(validationError.errors.title).toBeDefined();
      expect(validationError.errors.speaker).toBeDefined();
      expect(validationError.errors.url).toBeDefined();
    });

    it("should reject invalid type enum values", () => {
      const sermon = new Sermon({
        title: "Walking in Faith",
        speaker: "Pastor Victor",
        type: "text",
        url: "https://example.com/sermon.mp3",
      });

      const validationError = sermon.validateSync();
      expect(validationError.errors.type).toBeDefined();
    });

    it("should set defaults for likes and publish date", () => {
      const sermon = new Sermon({
        title: "Walking in Faith",
        speaker: "Pastor Victor",
        type: "audio",
        url: "https://example.com/sermon.mp3",
      });

      expect(sermon.likesCount).toBe(0);
      expect(Array.isArray(sermon.likedBy)).toBe(true);
      expect(sermon.likedBy.length).toBe(0);
      expect(sermon.publishedAt).toBeDefined();
    });
  });
});
