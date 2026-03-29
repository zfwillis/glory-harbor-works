import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";

const APPOINTMENT_POPULATE_FIELDS = "firstName lastName email avatarUrl role";
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const requireMemberRequester = async (userId) => {
  const requester = await User.findById(userId).select("role");

  if (!requester || requester.role !== "member") {
    return null;
  }

  return requester;
};

const toAppointmentResponse = (appointment) => {
  if (!appointment) {
    return appointment;
  }

  if (typeof appointment.toObject === "function") {
    return appointment.toObject();
  }

  return appointment;
};

const getMinutesFromTimeString = (value = "") => {
  const [hours, minutes] = String(value).split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return -1;
  }

  return hours * 60 + minutes;
};

const isWithinAvailability = (scheduledFor, availability = []) => {
  if (!(scheduledFor instanceof Date) || Number.isNaN(scheduledFor.getTime())) {
    return false;
  }

  if (!Array.isArray(availability) || availability.length === 0) {
    return false;
  }

  const dayName = WEEKDAY_NAMES[scheduledFor.getDay()];
  const scheduledMinutes = scheduledFor.getHours() * 60 + scheduledFor.getMinutes();

  return availability.some((slot) => {
    if (!slot || slot.day !== dayName) {
      return false;
    }

    const startMinutes = getMinutesFromTimeString(slot.start);
    const endMinutes = getMinutesFromTimeString(slot.end);

    if (startMinutes < 0 || endMinutes < 0) {
      return false;
    }

    return scheduledMinutes >= startMinutes && scheduledMinutes <= endMinutes;
  });
};

export const getAppointments = async (req, res) => {
  try {
    const requester = await requireMemberRequester(req.userId);
    if (!requester) {
      return res.status(403).json({ message: "Member access required" });
    }

    const appointments = await Appointment.find({ memberId: req.userId })
      .populate("pastorId", APPOINTMENT_POPULATE_FIELDS)
      .sort({ scheduledFor: 1 });

    return res.status(200).json({
      count: appointments.length,
      appointments: appointments.map(toAppointmentResponse),
    });
  } catch (error) {
    console.error("Get appointments error:", error);
    return res.status(500).json({
      message: "Failed to load meetings",
      error: error.message,
    });
  }
};

export const getPastorAppointments = async (req, res) => {
  try {
    const requester = await User.findById(req.userId).select("role");
    if (!requester || requester.role !== "pastor") {
      return res.status(403).json({ message: "Pastor access required" });
    }

    const appointments = await Appointment.find({ pastorId: req.userId })
      .populate("memberId", APPOINTMENT_POPULATE_FIELDS)
      .sort({ scheduledFor: 1 });

    return res.status(200).json({
      count: appointments.length,
      appointments: appointments.map(toAppointmentResponse),
    });
  } catch (error) {
    console.error("Get pastor appointments error:", error);
    return res.status(500).json({
      message: "Failed to load pastor schedule",
      error: error.message,
    });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const requester = await requireMemberRequester(req.userId);
    if (!requester) {
      return res.status(403).json({ message: "Member access required" });
    }

    const { pastorId, scheduledFor, location = "", notes = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(pastorId || "")) {
      return res.status(400).json({ message: "Valid pastor id is required" });
    }

    if (!scheduledFor) {
      return res.status(400).json({ message: "Meeting date and time is required" });
    }

    const parsedDate = new Date(scheduledFor);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Meeting date and time is invalid" });
    }

    const pastor = await User.findById(pastorId).select("firstName lastName email avatarUrl role availability");
    if (!pastor || pastor.role !== "pastor") {
      return res.status(404).json({ message: "Pastor not found" });
    }

    if (!isWithinAvailability(parsedDate, pastor.availability)) {
      return res.status(400).json({ message: "Selected time is outside the pastor's availability" });
    }

    const appointment = await Appointment.create({
      memberId: req.userId,
      pastorId,
      scheduledFor: parsedDate,
      location: location.trim(),
      notes: notes.trim(),
      status: "pending",
    });

    const populatedAppointment = await Appointment.findById(appointment._id).populate(
      "pastorId",
      APPOINTMENT_POPULATE_FIELDS
    );

    return res.status(201).json({
      message: "Meeting scheduled successfully",
      appointment: toAppointmentResponse(populatedAppointment),
    });
  } catch (error) {
    console.error("Create appointment error:", error);
    return res.status(500).json({
      message: "Failed to schedule meeting",
      error: error.message,
    });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid meeting id" });
    }

    const validStatuses = ["approved", "declined", "cancelled", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid meeting status" });
    }

    const requester = await User.findById(req.userId).select("role");
    if (!requester || requester.role !== "pastor") {
      return res.status(403).json({ message: "Pastor access required" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (appointment.pastorId?.toString() !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    appointment.status = status;
    await appointment.save();

    const populatedAppointment = await Appointment.findById(id)
      .populate("memberId", APPOINTMENT_POPULATE_FIELDS)
      .populate("pastorId", APPOINTMENT_POPULATE_FIELDS);

    return res.status(200).json({
      message: "Meeting status updated successfully",
      appointment: toAppointmentResponse(populatedAppointment),
    });
  } catch (error) {
    console.error("Update appointment status error:", error);
    return res.status(500).json({
      message: "Failed to update meeting status",
      error: error.message,
    });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const requester = await requireMemberRequester(req.userId);
    if (!requester) {
      return res.status(403).json({ message: "Member access required" });
    }

    const { id } = req.params;
    const { pastorId, scheduledFor, location = "", notes = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid meeting id" });
    }

    if (!mongoose.Types.ObjectId.isValid(pastorId || "")) {
      return res.status(400).json({ message: "Valid pastor id is required" });
    }

    if (!scheduledFor) {
      return res.status(400).json({ message: "Meeting date and time is required" });
    }

    const parsedDate = new Date(scheduledFor);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Meeting date and time is invalid" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (appointment.memberId?.toString() !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const pastor = await User.findById(pastorId).select("firstName lastName email avatarUrl role availability");
    if (!pastor || pastor.role !== "pastor") {
      return res.status(404).json({ message: "Pastor not found" });
    }

    if (!isWithinAvailability(parsedDate, pastor.availability)) {
      return res.status(400).json({ message: "Selected time is outside the pastor's availability" });
    }

    appointment.pastorId = pastorId;
    appointment.scheduledFor = parsedDate;
    appointment.location = location.trim();
    appointment.notes = notes.trim();
    appointment.status = "pending";
    await appointment.save();

    const populatedAppointment = await Appointment.findById(appointment._id).populate(
      "pastorId",
      APPOINTMENT_POPULATE_FIELDS
    );

    return res.status(200).json({
      message: "Meeting updated successfully",
      appointment: toAppointmentResponse(populatedAppointment),
    });
  } catch (error) {
    console.error("Update appointment error:", error);
    return res.status(500).json({
      message: "Failed to update meeting",
      error: error.message,
    });
  }
};

export const deleteAppointment = async (req, res) => {
  try {
    const requester = await requireMemberRequester(req.userId);
    if (!requester) {
      return res.status(403).json({ message: "Member access required" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid meeting id" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (appointment.memberId?.toString() !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await appointment.deleteOne();

    return res.status(200).json({
      message: "Meeting cancelled successfully",
      id,
    });
  } catch (error) {
    console.error("Delete appointment error:", error);
    return res.status(500).json({
      message: "Failed to cancel meeting",
      error: error.message,
    });
  }
};
