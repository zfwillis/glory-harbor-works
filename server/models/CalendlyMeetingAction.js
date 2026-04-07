import mongoose from "mongoose";

const calendlyMeetingActionSchema = new mongoose.Schema(
  {
    eventUuid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    meetingUri: {
      type: String,
      default: "",
      trim: true,
    },
    action: {
      type: String,
      enum: ["approved", "declined", "cancelled"],
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("CalendlyMeetingAction", calendlyMeetingActionSchema);
