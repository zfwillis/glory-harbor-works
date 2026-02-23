import Sermon from "../models/Sermon.js";

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

const contains = (value, query) =>
  String(value || "").toLowerCase().includes(String(query || "").toLowerCase());

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

    const sermons = await Sermon.find(query).sort({ publishedAt: -1 }).lean();
    if (sermons.length > 0) {
      return res.status(200).json({
        success: true,
        count: sermons.length,
        sermons,
      });
    }

    if (hasSearch) {
      const filteredFallback = fallbackSermons.filter((sermon) => {
        const matchQ =
          !q ||
          contains(sermon.title, q) ||
          contains(sermon.speaker, q) ||
          contains(sermon.topic, q) ||
          contains(sermon.series, q);
        const matchSpeaker = !speaker || contains(sermon.speaker, speaker);
        const matchTopic = !topic || contains(sermon.topic, topic);
        const matchSeries = !series || contains(sermon.series, series);
        return matchQ && matchSpeaker && matchTopic && matchSeries;
      });

      return res.status(200).json({
        success: true,
        count: filteredFallback.length,
        sermons: filteredFallback,
      });
    }

    return res.status(200).json({
      success: true,
      count: fallbackSermons.length,
      sermons: fallbackSermons,
    });
  } catch (error) {
    console.error("Get sermons error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching sermons",
      error: error.message,
    });
  }
};
