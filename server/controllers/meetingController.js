import mongoose from "mongoose";
import Meeting from "../models/Meeting.js";
import User from "../models/User.js";
import { safelyCreateUserNotification } from "../services/notificationService.js";

const ACTIVE_MEETING_STATUSES = ["pending", "approved"];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const toMinutes = (value = "") => {
  const [hourRaw, minuteRaw] = String(value).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
};

const getMeetingBounds = (scheduledFor, durationMinutes) => {
  const start = new Date(scheduledFor);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start, end };
};

const hasMeetingConflict = async ({ pastorId, scheduledFor, durationMinutes, excludeMeetingId = null }) => {
  const { start, end } = getMeetingBounds(scheduledFor, durationMinutes);

  const query = {
    pastorId,
    status: { $in: ACTIVE_MEETING_STATUSES },
    scheduledFor: { $lt: end },
  };

  if (excludeMeetingId) {
    query._id = { $ne: excludeMeetingId };
  }

  const overlappingMeetings = await Meeting.find(query)
    .select("scheduledFor durationMinutes")
    .lean();

  return overlappingMeetings.some((meeting) => {
    const otherStart = new Date(meeting.scheduledFor);
    const otherEnd = new Date(otherStart.getTime() + (meeting.durationMinutes || 30) * 60 * 1000);
    return start < otherEnd && end > otherStart;
  });
};

const isWithinAvailability = (availability = [], scheduledFor, durationMinutes) => {
  const targetDate = new Date(scheduledFor);
  const dayName = DAY_NAMES[targetDate.getDay()];
  const meetingStartMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  const meetingEndMinutes = meetingStartMinutes + durationMinutes;

  return availability.some((slot) => {
    if (!slot || slot.day !== dayName) {
      return false;
    }

    const slotStart = toMinutes(slot.start);
    const slotEnd = toMinutes(slot.end);

    if (slotStart === null || slotEnd === null || slotEnd <= slotStart) {
      return false;
    }

    return meetingStartMinutes >= slotStart && meetingEndMinutes <= slotEnd;
  });
};

const normalizeRole = (role = "") => String(role).trim().toLowerCase();

const getRequester = async (userId) => {
  const requester = await User.findById(userId).select("role firstName lastName email availability").lean();
  return requester;
};

const canManageMeeting = (meeting, requester) => {
  const role = normalizeRole(requester.role);
  if (["admin", "leader"].includes(role)) {
    return true;
  }

  if (role === "pastor" && String(meeting.pastorId) === String(requester._id)) {
    return true;
  }

  return String(meeting.memberId) === String(requester._id);
};

export const createMeeting = async (req, res) => {
  try {
    const requester = await getRequester(req.userId);
    if (!requester) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (normalizeRole(requester.role) !== "member") {
      return res.status(403).json({ message: "Only members can create meetings." });
    }

    const { pastorId, scheduledFor, durationMinutes = 30, title = "Pastoral Meeting", notes = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(pastorId)) {
      return res.status(400).json({ message: "Valid pastorId is required." });
    }

    const scheduleDate = new Date(scheduledFor);
    if (Number.isNaN(scheduleDate.getTime())) {
      return res.status(400).json({ message: "Valid scheduledFor date is required." });
    }

    const duration = Number(durationMinutes);
    if (!Number.isFinite(duration) || duration < 15 || duration > 180) {
      return res.status(400).json({ message: "durationMinutes must be between 15 and 180." });
    }

    const pastor = await User.findById(pastorId).select("role availability").lean();
    if (!pastor || normalizeRole(pastor.role) !== "pastor") {
      return res.status(404).json({ message: "Pastor not found." });
    }

    if (!isWithinAvailability(pastor.availability || [], scheduleDate, duration)) {
      return res.status(400).json({ message: "Selected time is outside pastor availability." });
    }

    const hasConflict = await hasMeetingConflict({
      pastorId,
      scheduledFor: scheduleDate,
      durationMinutes: duration,
    });

    if (hasConflict) {
      return res.status(409).json({ message: "Pastor already has a meeting in that time slot." });
    }

    const meeting = await Meeting.create({
      memberId: requester._id,
      pastorId,
      title,
      notes,
      scheduledFor: scheduleDate,
      durationMinutes: duration,
      status: "pending",
    });

    const populated = await Meeting.findById(meeting._id)
      .populate("memberId", "firstName lastName email")
      .populate("pastorId", "firstName lastName email");

    await safelyCreateUserNotification({
      userId: requester._id,
      type: "meeting",
      title: "Meeting Requested",
      message: `Your meeting request for ${scheduleDate.toLocaleString()} was submitted.`,
      contact: "Pastoral Meetings",
    });

    return res.status(201).json({
      message: "Meeting created successfully.",
      meeting: populated,
    });
  } catch (error) {
    console.error("Create meeting error:", error);
    return res.status(500).json({ message: "Unable to create meeting right now.", error: error.message });
  }
};

export const listMeetings = async (req, res) => {
  try {
    const requester = await getRequester(req.userId);
    if (!requester) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = normalizeRole(requester.role);
    const { status, dateFrom, dateTo, pastorId, memberId } = req.query;

    const query = {};

    if (role === "member") {
      query.memberId = requester._id;
    } else if (role === "pastor") {
      query.pastorId = requester._id;
    } else {
      if (pastorId && mongoose.Types.ObjectId.isValid(pastorId)) {
        query.pastorId = pastorId;
      }

      if (memberId && mongoose.Types.ObjectId.isValid(memberId)) {
        query.memberId = memberId;
      }
    }

    if (status) {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.scheduledFor = {};
      if (dateFrom) {
        query.scheduledFor.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.scheduledFor.$lte = new Date(dateTo);
      }
    }

    const meetings = await Meeting.find(query)
      .populate("memberId", "firstName lastName email")
      .populate("pastorId", "firstName lastName email")
      .sort({ scheduledFor: 1 })
      .lean();

    return res.status(200).json({ count: meetings.length, meetings });
  } catch (error) {
    console.error("List meetings error:", error);
    return res.status(500).json({ message: "Unable to load meetings.", error: error.message });
  }
};

export const getMeetingById = async (req, res) => {
  try {
    const requester = await getRequester(req.userId);
    if (!requester) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid meeting id." });
    }

    const meeting = await Meeting.findById(id)
      .populate("memberId", "firstName lastName email")
      .populate("pastorId", "firstName lastName email");

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found." });
    }

    if (!canManageMeeting(meeting, requester)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json({ meeting });
  } catch (error) {
    console.error("Get meeting error:", error);
    return res.status(500).json({ message: "Unable to load meeting.", error: error.message });
  }
};

export const updateMeeting = async (req, res) => {
  try {
    const requester = await getRequester(req.userId);
    if (!requester) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = normalizeRole(requester.role);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid meeting id." });
    }

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found." });
    }

    const isOwnerMember = role === "member" && String(meeting.memberId) === String(requester._id);
    const isAdminLike = ["admin", "leader"].includes(role);

    if (!isOwnerMember && !isAdminLike) {
      return res.status(403).json({ message: "Only the meeting owner or admin can update meeting details." });
    }

    if (["cancelled", "declined", "completed"].includes(meeting.status)) {
      return res.status(400).json({ message: "This meeting can no longer be updated." });
    }

    const nextScheduledFor = req.body.scheduledFor ? new Date(req.body.scheduledFor) : meeting.scheduledFor;
    if (Number.isNaN(nextScheduledFor.getTime())) {
      return res.status(400).json({ message: "scheduledFor must be a valid date." });
    }

    const nextDuration = req.body.durationMinutes !== undefined ? Number(req.body.durationMinutes) : meeting.durationMinutes;
    if (!Number.isFinite(nextDuration) || nextDuration < 15 || nextDuration > 180) {
      return res.status(400).json({ message: "durationMinutes must be between 15 and 180." });
    }

    const pastor = await User.findById(meeting.pastorId).select("availability").lean();
    if (!pastor || !isWithinAvailability(pastor.availability || [], nextScheduledFor, nextDuration)) {
      return res.status(400).json({ message: "Selected time is outside pastor availability." });
    }

    const hasConflict = await hasMeetingConflict({
      pastorId: meeting.pastorId,
      scheduledFor: nextScheduledFor,
      durationMinutes: nextDuration,
      excludeMeetingId: meeting._id,
    });

    if (hasConflict) {
      return res.status(409).json({ message: "Pastor already has a meeting in that time slot." });
    }

    if (req.body.title !== undefined) {
      meeting.title = req.body.title;
    }
    if (req.body.notes !== undefined) {
      meeting.notes = req.body.notes;
    }

    meeting.scheduledFor = nextScheduledFor;
    meeting.durationMinutes = nextDuration;

    // Any member-side update puts the item back into pending review.
    if (isOwnerMember) {
      meeting.status = "pending";
    }

    await meeting.save();

    const populated = await Meeting.findById(meeting._id)
      .populate("memberId", "firstName lastName email")
      .populate("pastorId", "firstName lastName email");

    return res.status(200).json({ message: "Meeting updated successfully.", meeting: populated });
  } catch (error) {
    console.error("Update meeting error:", error);
    return res.status(500).json({ message: "Unable to update meeting.", error: error.message });
  }
};

export const deleteMeeting = async (req, res) => {
  try {
    const requester = await getRequester(req.userId);
    if (!requester) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid meeting id." });
    }

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found." });
    }

    if (!canManageMeeting(meeting, requester)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await meeting.deleteOne();
    return res.status(200).json({ message: "Meeting deleted successfully." });
  } catch (error) {
    console.error("Delete meeting error:", error);
    return res.status(500).json({ message: "Unable to delete meeting.", error: error.message });
  }
};

export const approveOrDeclineMeeting = async (req, res) => {
  try {
    const requester = await getRequester(req.userId);
    if (!requester || normalizeRole(requester.role) !== "pastor") {
      return res.status(403).json({ message: "Pastor access required." });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid meeting id." });
    }

    if (!["approved", "declined"].includes(status)) {
      return res.status(400).json({ message: "Status must be approved or declined." });
    }

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found." });
    }

    if (String(meeting.pastorId) !== String(requester._id)) {
      return res.status(403).json({ message: "You can only review meetings assigned to you." });
    }

    meeting.status = status;
    await meeting.save();

    await safelyCreateUserNotification({
      userId: meeting.memberId,
      type: "meeting",
      title: `Meeting ${status}`,
      message: `Your pastoral meeting request was ${status}.`,
      contact: "Pastoral Meetings",
    });

    const populated = await Meeting.findById(id)
      .populate("memberId", "firstName lastName email")
      .populate("pastorId", "firstName lastName email");

    return res.status(200).json({ message: `Meeting ${status}.`, meeting: populated });
  } catch (error) {
    console.error("Review meeting error:", error);
    return res.status(500).json({ message: "Unable to review meeting.", error: error.message });
  }
};

export const cancelMeeting = async (req, res) => {
  try {
    const requester = await getRequester(req.userId);
    if (!requester || normalizeRole(requester.role) !== "pastor") {
      return res.status(403).json({ message: "Pastor access required." });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid meeting id." });
    }

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found." });
    }

    if (String(meeting.pastorId) !== String(requester._id)) {
      return res.status(403).json({ message: "You can only cancel meetings assigned to you." });
    }

    meeting.status = "cancelled";
    await meeting.save();

    await safelyCreateUserNotification({
      userId: meeting.memberId,
      type: "meeting",
      title: "Meeting Cancelled",
      message: "Your pastoral meeting was cancelled.",
      contact: "Pastoral Meetings",
    });

    return res.status(200).json({ message: "Meeting cancelled." });
  } catch (error) {
    console.error("Cancel meeting error:", error);
    return res.status(500).json({ message: "Unable to cancel meeting.", error: error.message });
  }
};

export const getPastorSchedule = async (req, res) => {
  try {
    const requester = await getRequester(req.userId);
    if (!requester || normalizeRole(requester.role) !== "pastor") {
      return res.status(403).json({ message: "Pastor access required." });
    }

    const { dateFrom, dateTo } = req.query;
    const query = {
      pastorId: requester._id,
      status: { $in: ["pending", "approved", "completed"] },
    };

    if (dateFrom || dateTo) {
      query.scheduledFor = {};
      if (dateFrom) {
        query.scheduledFor.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.scheduledFor.$lte = new Date(dateTo);
      }
    }

    const meetings = await Meeting.find(query)
      .populate("memberId", "firstName lastName email")
      .sort({ scheduledFor: 1 })
      .lean();

    return res.status(200).json({ count: meetings.length, meetings });
  } catch (error) {
    console.error("Pastor schedule error:", error);
    return res.status(500).json({ message: "Unable to load pastor schedule.", error: error.message });
  }
};

export const getPastorAvailability = async (req, res) => {
  try {
    const requester = await getRequester(req.userId);
    if (!requester || normalizeRole(requester.role) !== "pastor") {
      return res.status(403).json({ message: "Pastor access required." });
    }

    return res.status(200).json({ availability: requester.availability || [] });
  } catch (error) {
    console.error("Get availability error:", error);
    return res.status(500).json({ message: "Unable to load availability.", error: error.message });
  }
};

export const updatePastorAvailability = async (req, res) => {
  try {
    const requester = await getRequester(req.userId);
    if (!requester || normalizeRole(requester.role) !== "pastor") {
      return res.status(403).json({ message: "Pastor access required." });
    }

    const { availability } = req.body;
    if (!Array.isArray(availability)) {
      return res.status(400).json({ message: "availability must be an array." });
    }

    const normalizedAvailability = availability
      .filter((slot) => slot && slot.day && slot.start && slot.end)
      .map((slot) => ({
        day: String(slot.day),
        start: String(slot.start),
        end: String(slot.end),
      }));

    const updated = await User.findByIdAndUpdate(
      requester._id,
      { availability: normalizedAvailability },
      { new: true, runValidators: true }
    ).select("availability");

    return res.status(200).json({ message: "Availability updated.", availability: updated?.availability || [] });
  } catch (error) {
    console.error("Update availability error:", error);
    return res.status(500).json({ message: "Unable to update availability.", error: error.message });
  }
};

export const runMeetingReminders = async (req, res) => {
  try {
    const requester = await getRequester(req.userId);
    const role = normalizeRole(requester?.role);
    if (!requester || !["pastor", "admin", "leader"].includes(role)) {
      return res.status(403).json({ message: "Pastor/Admin access required." });
    }

    const now = new Date();
    const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const query = {
      status: "approved",
      scheduledFor: { $gte: now, $lte: nextDay },
      reminderSentAt: null,
    };

    if (role === "pastor") {
      query.pastorId = requester._id;
    }

    const meetings = await Meeting.find(query)
      .populate("memberId", "firstName lastName email")
      .populate("pastorId", "firstName lastName email");

    const sent = [];

    for (const meeting of meetings) {
      meeting.reminderSentAt = new Date();
      meeting.reminderMeta = "Reminder dispatched by system";
      await meeting.save();

      if (meeting.memberId?._id) {
        await safelyCreateUserNotification({
          userId: meeting.memberId._id,
          type: "meeting",
          title: "Meeting Reminder",
          message: `You have a pastoral meeting scheduled for ${new Date(meeting.scheduledFor).toLocaleString()}.`,
          contact: "Pastoral Meetings",
        });
      }

      sent.push({
        meetingId: meeting._id,
        scheduledFor: meeting.scheduledFor,
        memberEmail: meeting.memberId?.email || "",
        pastorEmail: meeting.pastorId?.email || "",
      });
    }

    return res.status(200).json({
      message: `Processed ${sent.length} reminder(s).`,
      count: sent.length,
      reminders: sent,
    });
  } catch (error) {
    console.error("Run reminders error:", error);
    return res.status(500).json({ message: "Unable to run reminders.", error: error.message });
  }
};
