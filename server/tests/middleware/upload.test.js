import { describe, expect, it, jest } from "@jest/globals";

const mockFs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
};

const mockMulter = jest.fn((config) => ({ config }));
mockMulter.diskStorage = jest.fn((config) => config);

jest.unstable_mockModule("fs", () => ({ default: mockFs }));
jest.unstable_mockModule("multer", () => ({ default: mockMulter }));

const {
  uploadSermonImage,
  uploadSermonAssets,
  uploadUserAvatar,
} = await import("../../middleware/upload.js");

const runFilter = (filter, file) =>
  new Promise((resolve) => {
    filter({}, file, (error, accepted) => resolve({ error, accepted }));
  });

describe("Upload Middleware", () => {
  it("creates upload directory and configures multer upload limits", () => {
    expect(mockFs.existsSync).toHaveBeenCalled();
    expect(mockFs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining("uploads"), { recursive: true });
    expect(mockMulter.diskStorage).toHaveBeenCalledTimes(3);

    expect(uploadSermonImage.config.limits.fileSize).toBe(5 * 1024 * 1024);
    expect(uploadSermonAssets.config.limits.fileSize).toBe(300 * 1024 * 1024);
    expect(uploadUserAvatar.config.limits.fileSize).toBe(5 * 1024 * 1024);
  });

  it("storage writes to uploads directory and creates prefixed filenames", () => {
    const storage = uploadSermonImage.config.storage;
    const destinationCb = jest.fn();
    const filenameCb = jest.fn();

    storage.destination({}, {}, destinationCb);
    storage.filename({}, { originalname: "Photo.PNG" }, filenameCb);

    expect(destinationCb).toHaveBeenCalledWith(null, expect.stringContaining("uploads"));
    expect(filenameCb.mock.calls[0][1]).toMatch(/^sermon-\d+-\d+\.png$/);
  });

  it("storage defaults missing extensions to jpg", () => {
    const filenameCb = jest.fn();

    uploadUserAvatar.config.storage.filename({}, { originalname: "" }, filenameCb);

    expect(filenameCb.mock.calls[0][1]).toMatch(/^avatar-\d+-\d+\.jpg$/);
  });

  it("accepts image files for image-only uploaders", async () => {
    const sermonResult = await runFilter(uploadSermonImage.config.fileFilter, { mimetype: "image/png" });
    const avatarResult = await runFilter(uploadUserAvatar.config.fileFilter, { mimetype: "image/jpeg" });

    expect(sermonResult).toEqual({ error: null, accepted: true });
    expect(avatarResult).toEqual({ error: null, accepted: true });
  });

  it("rejects non-image files for image-only uploaders", async () => {
    const result = await runFilter(uploadSermonImage.config.fileFilter, { mimetype: "application/pdf" });

    expect(result.accepted).toBeUndefined();
    expect(result.error.message).toBe("Only image files are allowed");
  });

  it("accepts sermon thumbnail images", async () => {
    const result = await runFilter(uploadSermonAssets.config.fileFilter, {
      fieldname: "image",
      mimetype: "image/webp",
    });

    expect(result).toEqual({ error: null, accepted: true });
  });

  it("rejects non-image sermon thumbnails", async () => {
    const result = await runFilter(uploadSermonAssets.config.fileFilter, {
      fieldname: "image",
      mimetype: "text/plain",
    });

    expect(result.error.message).toBe("Thumbnail must be an image file");
  });

  it("accepts sermon audio media", async () => {
    const result = await runFilter(uploadSermonAssets.config.fileFilter, {
      fieldname: "media",
      mimetype: "audio/mpeg",
      originalname: "sermon.mp3",
    });

    expect(result).toEqual({ error: null, accepted: true });
  });

  it("accepts supported sermon video media by mimetype", async () => {
    const videoByMime = await runFilter(uploadSermonAssets.config.fileFilter, {
      fieldname: "media",
      mimetype: "video/mp4",
      originalname: "sermon.bin",
    });
    const webmVideo = await runFilter(uploadSermonAssets.config.fileFilter, {
      fieldname: "media",
      mimetype: "video/webm",
      originalname: "sermon.ogg",
    });

    expect(videoByMime).toEqual({ error: null, accepted: true });
    expect(webmVideo).toEqual({ error: null, accepted: true });
  });

  it("rejects unsupported video, media, and field uploads", async () => {
    const unsupportedVideo = await runFilter(uploadSermonAssets.config.fileFilter, {
      fieldname: "media",
      mimetype: "video/quicktime",
      originalname: "sermon.mov",
    });
    const unsupportedMedia = await runFilter(uploadSermonAssets.config.fileFilter, {
      fieldname: "media",
      mimetype: "application/pdf",
      originalname: "notes.pdf",
    });
    const unsupportedField = await runFilter(uploadSermonAssets.config.fileFilter, {
      fieldname: "document",
      mimetype: "image/png",
      originalname: "image.png",
    });

    expect(unsupportedVideo.error.message).toBe("Unsupported video format. Please upload MP4, WebM, or Ogg video.");
    expect(unsupportedMedia.error.message).toBe("Media must be an audio file or a browser-compatible video (MP4, WebM, Ogg).");
    expect(unsupportedField.error.message).toBe("Unsupported upload field");
  });
});
