import mongoose from "mongoose";

const childLessonProgressSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    completed: { type: Boolean, default: false },
    quizScore: { type: Number, default: 0, min: 0 },
    totalQuestions: { type: Number, default: 0, min: 0 },
    answers: [{ type: Number }],
    completedAt: { type: Date },
  },
  { timestamps: true }
);

childLessonProgressSchema.index({ child: 1, lesson: 1 }, { unique: true });

export default mongoose.model("ChildLessonProgress", childLessonProgressSchema);
