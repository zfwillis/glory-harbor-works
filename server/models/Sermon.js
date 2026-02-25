import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: "member" },
    avatarUrl: { type: String, trim: true, default: "" },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const sermonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  speaker: { type: String, required: true, trim: true },
  topic: { type: String, trim: true, default: "" },
  series: { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
  type: {
    type: String,
    enum: ["video", "audio"],
    required: true,
    default: "video",
  },
  url: { type: String, required: true, trim: true },
  thumbnailUrl: { type: String, trim: true, default: "" },
  comments: [commentSchema],
  likesCount: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  publishedAt: { type: Date, default: Date.now },
});

const Sermon = mongoose.model("Sermon", sermonSchema);

export default Sermon;
