import Sermon from "../models/Sermon.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

const getLocalUploadFilePathFromUrl = (thumbnailUrl = "") => {
  if (!thumbnailUrl || typeof thumbnailUrl !== "string") {
    return "";
  }

  try {
    const parsed = new URL(thumbnailUrl);
    if (!parsed.pathname.startsWith("/uploads/")) {
      return "";
    }
    return path.join(uploadsDir, path.basename(parsed.pathname));
  } catch (error) {
    if (thumbnailUrl.startsWith("/uploads/")) {
      return path.join(uploadsDir, path.basename(thumbnailUrl));
    }
    return "";
  }
};

const removeLocalUploadIfExists = (thumbnailUrl = "") => {
  const localPath = getLocalUploadFilePathFromUrl(thumbnailUrl);
  if (!localPath) {
    return;
  }

  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
  }
};

const fallbackSermons = [
  {
    title: "Benefits of Praying In Tongues (Part 2)",
    speaker: "Pastor Victor Akinde",
    topic: "Prayer",
    series: "Holy Spirit",
    description: "How praying in tongues strengthens spiritual life and bold faith.",
    type: "video",
    url: "https://www.youtube.com/embed/kFdr4v678dw",
    publishedAt: "2025-07-10T00:00:00.000Z",
  },
  {
    title: "Intimacy With The Holy Spirit",
    speaker: "Pastor Victor Akinde",
    topic: "Holy Spirit",
    series: "Holy Spirit",
    description: "A teaching on building a deeper and consistent fellowship with the Spirit.",
    type: "video",
    url: "https://www.youtube.com/embed/cRQYRSn0nq8",
    publishedAt: "2025-07-03T00:00:00.000Z",
  },
  {
    title: "Living by Faith Daily",
    speaker: "Pastor Victor Akinde",
    topic: "Faith",
    series: "Kingdom Living",
    description: "Practical keys for walking in faith across everyday decisions.",
    type: "audio",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    publishedAt: "2025-06-28T00:00:00.000Z",
  },
];

const ensureFallbackSermons = async () => {
  for (const item of fallbackSermons) {
    const existing = await Sermon.findOne({
      title: item.title,
      speaker: item.speaker,
      publishedAt: item.publishedAt,
    }).select("_id");

    if (!existing) {
      await Sermon.create({
        ...item,
        likesCount: 0,
        likedBy: [],
      });
    }
  }
};

export const getSermons = async (req, res) => {
  try {
    const { q, speaker, topic, series, type } = req.query;
    const hasSearch = Boolean(q || speaker || topic || series || type);

    const query = {};
    const andConditions = [];
    if (speaker) {
      query.speaker = { $regex: speaker, $options: "i" };
    }
    if (topic) {
      query.topic = { $regex: topic, $options: "i" };
    }
    if (series) {
      query.series = { $regex: series, $options: "i" };
    }

    if (type === "video") {
      andConditions.push({ type: "video" });
      andConditions.push({ url: { $not: /soundcloud\.com|snd\.sc/i } });
    }

    if (type === "audio") {
      andConditions.push({
        $or: [{ type: "audio" }, { url: { $regex: /soundcloud\.com|snd\.sc/i } }],
      });
    }

    if (q) {
      andConditions.push({
        $or: [
        { title: { $regex: q, $options: "i" } },
        { speaker: { $regex: q, $options: "i" } },
        { topic: { $regex: q, $options: "i" } },
        { series: { $regex: q, $options: "i" } },
        ],
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    let sermons = await Sermon.find(query).sort({ publishedAt: -1 }).lean();
    if (sermons.length > 0) {
      const sermonsWithLikeState = sermons.map((sermon) => ({
        ...sermon,
        liked: req.userId
          ? (sermon.likedBy || []).some((likedUserId) => likedUserId.toString() === req.userId)
          : false,
      }));
      return res.status(200).json({
        success: true,
        count: sermonsWithLikeState.length,
        sermons: sermonsWithLikeState,
      });
    }

    const totalSermons = await Sermon.countDocuments();
    if (totalSermons === 0) {
      await ensureFallbackSermons();
      sermons = await Sermon.find(query).sort({ publishedAt: -1 }).lean();
      const sermonsWithLikeState = sermons.map((sermon) => ({
        ...sermon,
        liked: req.userId
          ? (sermon.likedBy || []).some((likedUserId) => likedUserId.toString() === req.userId)
          : false,
      }));

      return res.status(200).json({
        success: true,
        count: sermonsWithLikeState.length,
        sermons: sermonsWithLikeState,
      });
    }

    if (hasSearch) {
      return res.status(200).json({
        success: true,
        count: 0,
        sermons: [],
      });
    }

    return res.status(200).json({ success: true, count: 0, sermons: [] });
  } catch (error) {
    console.error("Get sermons error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching sermons",
      error: error.message,
    });
  }
};

export const createSermon = async (req, res) => {
  try {
    const {
      title,
      speaker,
      topic = "",
      series = "",
      description = "",
      type,
      url,
      thumbnailUrl = "",
      publishedAt,
    } = req.body;
    const fileThumbnailUrl = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : "";

    if (!title || !speaker || !type || !url) {
      return res.status(400).json({
        success: false,
        message: "Title, speaker, type, and url are required",
      });
    }

    if (!["video", "audio"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be video or audio",
      });
    }

    const createdSermon = await Sermon.create({
      title,
      speaker,
      topic,
      series,
      description,
      type,
      url,
      thumbnailUrl: fileThumbnailUrl || thumbnailUrl,
      publishedAt: publishedAt || Date.now(),
      likesCount: 0,
      likedBy: [],
    });

    return res.status(201).json({
      success: true,
      message: "Sermon uploaded successfully",
      sermon: createdSermon,
    });
  } catch (error) {
    console.error("Create sermon error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading sermon",
      error: error.message,
    });
  }
};

export const updateSermon = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sermon id",
      });
    }

    const {
      title,
      speaker,
      topic,
      series,
      description,
      type,
      url,
      thumbnailUrl,
      publishedAt,
      removeThumbnail,
    } = req.body;
    const fileThumbnailUrl = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : "";

    if (!title || !speaker || !type || !url) {
      return res.status(400).json({
        success: false,
        message: "Title, speaker, type, and url are required",
      });
    }

    if (!["video", "audio"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be video or audio",
      });
    }

    const existingSermon = await Sermon.findById(id);
    if (!existingSermon) {
      return res.status(404).json({
        success: false,
        message: "Sermon not found",
      });
    }

    const shouldRemoveThumbnail =
      removeThumbnail === true || removeThumbnail === "true" || removeThumbnail === "1";

    const updatePayload = {
      title,
      speaker,
      topic: topic || "",
      series: series || "",
      description: description || "",
      type,
      url,
      ...(publishedAt ? { publishedAt } : {}),
    };

    if (fileThumbnailUrl) {
      updatePayload.thumbnailUrl = fileThumbnailUrl;
    } else if (shouldRemoveThumbnail) {
      updatePayload.thumbnailUrl = "";
    } else if (typeof thumbnailUrl === "string") {
      updatePayload.thumbnailUrl = thumbnailUrl;
    }

    const updatedSermon = await Sermon.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (fileThumbnailUrl || shouldRemoveThumbnail) {
      const oldThumbnailUrl = existingSermon.thumbnailUrl || "";
      if (oldThumbnailUrl && oldThumbnailUrl !== updatedSermon.thumbnailUrl) {
        removeLocalUploadIfExists(oldThumbnailUrl);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Sermon updated successfully",
      sermon: updatedSermon,
    });
  } catch (error) {
    console.error("Update sermon error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating sermon",
      error: error.message,
    });
  }
};

export const deleteSermon = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sermon id",
      });
    }

    const deletedSermon = await Sermon.findByIdAndDelete(id);
    if (!deletedSermon) {
      return res.status(404).json({
        success: false,
        message: "Sermon not found",
      });
    }

    if (deletedSermon.thumbnailUrl) {
      removeLocalUploadIfExists(deletedSermon.thumbnailUrl);
    }

    return res.status(200).json({
      success: true,
      message: "Sermon deleted successfully",
      sermon: {
        id: deletedSermon._id,
        title: deletedSermon.title,
      },
    });
  } catch (error) {
    console.error("Delete sermon error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting sermon",
      error: error.message,
    });
  }
};

export const addCommentToSermon = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const requesterId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid sermon id" });
    }

    if (!requesterId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Comment text is required" });
    }

    const [sermon, user] = await Promise.all([
      Sermon.findById(id),
      User.findById(requesterId).select("firstName lastName role avatarUrl"),
    ]);

    if (!sermon) {
      return res.status(404).json({ success: false, message: "Sermon not found" });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    sermon.comments.push({
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl || "",
      text: text.trim(),
    });

    await sermon.save();
    const createdComment = sermon.comments[sermon.comments.length - 1];

    return res.status(201).json({
      success: true,
      message: "Comment added",
      comment: createdComment,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({ success: false, message: "Error adding comment", error: error.message });
  }
};

export const deleteCommentFromSermon = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const requesterId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    if (!requesterId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const [sermon, requester] = await Promise.all([
      Sermon.findById(id),
      User.findById(requesterId).select("role"),
    ]);

    if (!sermon) {
      return res.status(404).json({ success: false, message: "Sermon not found" });
    }

    if (!requester) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const comment = sermon.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const canModerate = requester.role === "leader" || requester.role === "pastor";
    const isOwner = comment.userId?.toString() === requesterId;

    if (!canModerate && !isOwner) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    comment.deleteOne();
    await sermon.save();

    return res.status(200).json({ success: true, message: "Comment deleted" });
  } catch (error) {
    console.error("Delete comment error:", error);
    return res.status(500).json({ success: false, message: "Error deleting comment", error: error.message });
  }
};

export const likeSermon = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sermon id",
      });
    }

    const sermon = await Sermon.findById(id);
    if (!sermon) {
      return res.status(404).json({
        success: false,
        message: "Sermon not found",
      });
    }

    const alreadyLiked = sermon.likedBy.some((likedUserId) => likedUserId.toString() === userId);
    if (alreadyLiked) {
      return res.status(200).json({
        success: true,
        message: "Sermon already liked",
        sermon: {
          id: sermon._id,
          likesCount: sermon.likesCount,
          liked: true,
        },
      });
    }

    sermon.likedBy.push(userId);
    sermon.likesCount = sermon.likedBy.length;
    await sermon.save();

    return res.status(200).json({
      success: true,
      message: "Sermon liked successfully",
      sermon: {
        id: sermon._id,
        likesCount: sermon.likesCount,
        liked: true,
      },
    });
  } catch (error) {
    console.error("Like sermon error:", error);
    return res.status(500).json({
      success: false,
      message: "Error liking sermon",
      error: error.message,
    });
  }
};

export const unlikeSermon = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sermon id",
      });
    }

    const sermon = await Sermon.findById(id);
    if (!sermon) {
      return res.status(404).json({
        success: false,
        message: "Sermon not found",
      });
    }

    sermon.likedBy = sermon.likedBy.filter((likedUserId) => likedUserId.toString() !== userId);
    sermon.likesCount = sermon.likedBy.length;
    await sermon.save();

    return res.status(200).json({
      success: true,
      message: "Sermon unliked successfully",
      sermon: {
        id: sermon._id,
        likesCount: sermon.likesCount,
        liked: false,
      },
    });
  } catch (error) {
    console.error("Unlike sermon error:", error);
    return res.status(500).json({
      success: false,
      message: "Error unliking sermon",
      error: error.message,
    });
  }
};
