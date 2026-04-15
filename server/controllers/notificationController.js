import Notification from "../models/Notifications.js";
import User from "../models/User.js";

export const sendAnnouncement = async (req, res) => {
  try {
    const title = String(req.body?.title || "Announcement").trim() || "Announcement";
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ message: "Announcement message is required." });
    }

    const members = await User.find({ role: "member", status: "active" }).select("_id").lean();

    if (members.length === 0) {
      return res.status(200).json({
        message: "No active members were found to notify.",
        count: 0,
      });
    }

    const notifications = await Notification.insertMany(
      members.map((member) => ({
        userId: member._id,
        type: "announcement",
        title,
        message,
        contact: "Admin announcement",
      }))
    );

    return res.status(201).json({
      message: `Announcement sent to ${notifications.length} member(s).`,
      count: notifications.length,
    });
  } catch (error) {
    console.error("Send announcement error:", error);
    return res.status(500).json({
      message: "Unable to send announcement.",
      error: error.message,
    });
  }
};

export const getMyNotifications = async (req, res) => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const notifications = await Notification.find({
      userId: req.userId,
      timeSent: { $gte: oneWeekAgo },
    })
      .sort({ timeSent: -1, createdAt: -1 })
      .limit(25)
      .lean();

    return res.status(200).json({
      count: notifications.length,
      unreadCount: notifications.filter((notification) => !notification.read).length,
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      message: "Unable to load notifications.",
      error: error.message,
    });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { read: true },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    return res.status(200).json({
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({
      message: "Unable to update notification.",
      error: error.message,
    });
  }
};
