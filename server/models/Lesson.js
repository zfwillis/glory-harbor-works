import mongoose from "mongoose";

const quizQuestionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, trim: true },
    options: [{ type: String, required: true, trim: true }],
    correctAnswerIndex: { type: Number, required: true, min: 0 },
    explanation: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const lessonSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    weekOf: { type: Date, required: true },
    bibleVerse: { type: String, required: true, trim: true },
    memoryVerse: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    quizQuestions: [quizQuestionSchema],
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Lesson", lessonSchema);
