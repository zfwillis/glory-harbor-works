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
      // Always keep owner so users can see/manage all of their requests.
      createdBy: req.userId,
      isAnonymous: Boolean(isAnonymous),
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

// Get ALL prayer requests (prayer_team, admin, pastor only)
export const getAllPrayerRequests = async (req, res) => {
  try {
    const prayers = await Prayer.find()
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    const sanitized = prayers.map((prayer) => {
      if (!prayer.isAnonymous) {
        return prayer;
      }

      const asObject = prayer.toObject();
      asObject.createdBy = null;
      return asObject;
    });

    return res.status(200).json({
      count: sanitized.length,
      prayers: sanitized,
    });
  } catch (error) {
    console.error("Get all prayer requests error:", error);
    return res.status(500).json({
      message: "Failed to load prayer requests",
      error: error.message,
    });
  }
};

// Update prayer status (prayer_team, admin, pastor only)
export const updatePrayerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid prayer request id" });
    }

    const validStatuses = ["new", "in_progress", "answered"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const prayer = await Prayer.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("createdBy", "firstName lastName email");

    if (!prayer) {
      return res.status(404).json({ message: "Prayer request not found" });
    }

    const sanitizedPrayer = prayer.isAnonymous
      ? { ...prayer.toObject(), createdBy: null }
      : prayer;

    return res.status(200).json({
      message: "Prayer status updated successfully",
      prayer: sanitizedPrayer,
    });
  } catch (error) {
    console.error("Update prayer status error:", error);
    return res.status(500).json({
      message: "Failed to update prayer status",
      error: error.message,
    });
  }
};
