import Notification from "../models/Notifications.js";
import User from "../models/User.js";
import mongoose from "mongoose";

const isDatabaseReady = () => mongoose.connection.readyState === 1;

export const createUserNotification = async ({ userId, type = "system", title = "", message, contact = "" }) => {
  if (!userId || !message) {
    return null;
  }

  if (!isDatabaseReady()) {
    return null;
  }

  return Notification.create({
    userId,
    type,
    title,
    message,
    contact,
  });
};

export const createActiveMemberNotifications = async ({ type = "system", title = "", message, contact = "" }) => {
  if (!message) {
    return [];
  }

  if (!isDatabaseReady()) {
    return [];
  }

  const members = await User.find({ role: "member", status: "active" }).select("_id").lean();
  if (members.length === 0) {
    return [];
  }

  return Notification.insertMany(
    members.map((member) => ({
      userId: member._id,
      type,
      title,
      message,
      contact,
    }))
  );
};

export const safelyCreateUserNotification = async (payload) => {
  try {
    return await createUserNotification(payload);
  } catch (error) {
    console.error("Notification creation failed:", error.message);
    return null;
  }
};

export const safelyCreateActiveMemberNotifications = async (payload) => {
  try {
    return await createActiveMemberNotifications(payload);
  } catch (error) {
    console.error("Member notification creation failed:", error.message);
    return [];
  }
};
