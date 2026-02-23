import Sermon from "../models/Sermon.js";
import mongoose from "mongoose";

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
    const { q, speaker, topic, series } = req.query;
    const hasSearch = Boolean(q || speaker || topic || series);

    const query = {};
    if (speaker) {
      query.speaker = { $regex: speaker, $options: "i" };
    }
    if (topic) {
      query.topic = { $regex: topic, $options: "i" };
    }
    if (series) {
      query.series = { $regex: series, $options: "i" };
    }
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { speaker: { $regex: q, $options: "i" } },
        { topic: { $regex: q, $options: "i" } },
        { series: { $regex: q, $options: "i" } },
      ];
    }

    let sermons = await Sermon.find(query).sort({ publishedAt: -1 }).lean();
    if (sermons.length > 0) {
      return res.status(200).json({
        success: true,
        count: sermons.length,
        sermons,
      });
    }

    const totalSermons = await Sermon.countDocuments();
    if (totalSermons === 0) {
      await ensureFallbackSermons();
      sermons = await Sermon.find(query).sort({ publishedAt: -1 }).lean();

      return res.status(200).json({
        success: true,
        count: sermons.length,
        sermons,
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
