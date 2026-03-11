import Prayer from "../models/Prayer.js";

export const getPrayerRequests = async (req, res) => {
  try {
    const prayers = await Prayer.find({ createdBy: req.userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      count: prayers.length,
      prayers,
    });
  } catch (error) {
    console.error("Get prayer requests error:", error);
    return res.status(500).json({
      message: "Failed to load prayer requests",
      error: error.message,
    });
  }
};

export const createPrayerRequest = async (req, res) => {
  try {
    const { text, isAnonymous = false } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Prayer request text is required" });
    }

    const prayer = await Prayer.create({
      createdBy: isAnonymous ? null : req.userId,
      text: text.trim(),
      status: "new",
    });

    return res.status(201).json({
      message: "Prayer request submitted successfully",
      prayer,
    });
  } catch (error) {
    console.error("Create prayer request error:", error);
    return res.status(500).json({
      message: "Failed to submit prayer request",
      error: error.message,
    });
  }
};
