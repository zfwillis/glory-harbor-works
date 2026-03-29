import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";

const APPOINTMENT_POPULATE_FIELDS = "firstName lastName email avatarUrl role";

const toAppointmentResponse = (appointment) => {
  if (!appointment) {
    return appointment;
  }

  if (typeof appointment.toObject === "function") {
    return appointment.toObject();
  }

  return appointment;
};

export const getAppointments = async (req, res) => {
  try {
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

export const createAppointment = async (req, res) => {
  try {
    const { pastorId, scheduledFor, location = "", topic = "", notes = "" } = req.body;

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

    const pastor = await User.findById(pastorId).select("firstName lastName email avatarUrl role");
    if (!pastor || pastor.role !== "pastor") {
      return res.status(404).json({ message: "Pastor not found" });
    }

    const appointment = await Appointment.create({
      memberId: req.userId,
      pastorId,
      scheduledFor: parsedDate,
      location: location.trim(),
      topic: topic.trim(),
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

export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { pastorId, scheduledFor, location = "", topic = "", notes = "" } = req.body;

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

    const pastor = await User.findById(pastorId).select("firstName lastName email avatarUrl role");
    if (!pastor || pastor.role !== "pastor") {
      return res.status(404).json({ message: "Pastor not found" });
    }

    appointment.pastorId = pastorId;
    appointment.scheduledFor = parsedDate;
    appointment.location = location.trim();
    appointment.topic = topic.trim();
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
