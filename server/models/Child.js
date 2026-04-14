import mongoose from "mongoose";

const childSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    allergies: { type: String, trim: true, default: "" },
    notes:     { type: String, trim: true, default: "" },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    secondParent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    secondParentStatus: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Child", childSchema);
