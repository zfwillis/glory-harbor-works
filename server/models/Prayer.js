import mongoose from "mongoose";

const prayerSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  status: {
    type: String,
    enum: ["new", "in_progress", "answered"],
    default: "new",
  },
}, { timestamps: true });

const Prayer = mongoose.model("Prayer", prayerSchema);

export default Prayer;
