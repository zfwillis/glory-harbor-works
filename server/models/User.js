import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },

    role: {
      type: String,
      enum: ["member", "leader", "pastor"],
      default: "member",
      required: true
    },

    status: { type: String, enum: ["active", "inactive"], default: "active" },

    // optional role-specific fields (add later as you build)
    managesUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    availability: [{ day: String, start: String, end: String }]
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
