import { describe, expect, it } from "@jest/globals";
import Lesson from "../../models/Lesson.js";

describe("Lesson Model", () => {
  it("creates a lesson with quiz questions", () => {
    const lesson = new Lesson({
      slug: "faith-and-kindness",
      title: "Faith and Kindness",
      weekOf: new Date("2026-04-12"),
      bibleVerse: "Mark 10:14",
      memoryVerse: "Let the little children come to me.",
      summary: "Jesus welcomes children.",
      content: "Jesus loves and welcomes children.",
      quizQuestions: [
        {
          prompt: "Who welcomes children?",
          options: ["Jesus", "Pharaoh"],
          correctAnswerIndex: 0,
        },
      ],
    });

    expect(lesson.slug).toBe("faith-and-kindness");
    expect(lesson.isPublished).toBe(true);
    expect(lesson.quizQuestions).toHaveLength(1);
  });

  it("requires lesson content fields", () => {
    const lesson = new Lesson({});
    const error = lesson.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.slug).toBeDefined();
    expect(error.errors.title).toBeDefined();
    expect(error.errors.weekOf).toBeDefined();
    expect(error.errors.bibleVerse).toBeDefined();
    expect(error.errors.memoryVerse).toBeDefined();
    expect(error.errors.summary).toBeDefined();
    expect(error.errors.content).toBeDefined();
  });
});
