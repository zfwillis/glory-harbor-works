import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pastorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      trim: true,
      default: "Pastoral Meeting",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      min: 15,
      max: 180,
      default: 30,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "declined", "cancelled", "completed"],
      default: "pending",
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
    reminderMeta: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

meetingSchema.index({ pastorId: 1, scheduledFor: 1, status: 1 });
meetingSchema.index({ memberId: 1, scheduledFor: 1, status: 1 });

export default mongoose.model("Meeting", meetingSchema);
