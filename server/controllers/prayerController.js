import Prayer from "../models/Prayer.js";
import mongoose from "mongoose";

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

export const updatePrayerRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid prayer request id" });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Prayer request text is required" });
    }

    const existingPrayer = await Prayer.findById(id);
    if (!existingPrayer) {
      return res.status(404).json({ message: "Prayer request not found" });
    }

    if (!existingPrayer.createdBy || existingPrayer.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    existingPrayer.text = text.trim();
    await existingPrayer.save();

    return res.status(200).json({
      message: "Prayer request updated successfully",
      prayer: existingPrayer,
    });
  } catch (error) {
    console.error("Update prayer request error:", error);
    return res.status(500).json({
      message: "Failed to update prayer request",
      error: error.message,
    });
  }
};

export const deletePrayerRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid prayer request id" });
    }

    const existingPrayer = await Prayer.findById(id);
    if (!existingPrayer) {
      return res.status(404).json({ message: "Prayer request not found" });
    }

    if (!existingPrayer.createdBy || existingPrayer.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await existingPrayer.deleteOne();

    return res.status(200).json({
      message: "Prayer request deleted successfully",
      id,
    });
  } catch (error) {
    console.error("Delete prayer request error:", error);
    return res.status(500).json({
      message: "Failed to delete prayer request",
      error: error.message,
    });
  }
};
