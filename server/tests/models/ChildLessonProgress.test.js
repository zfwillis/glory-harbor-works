import { describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";
import ChildLessonProgress from "../../models/ChildLessonProgress.js";

describe("ChildLessonProgress Model", () => {
  it("tracks quiz progress for one child and lesson", () => {
    const child = new mongoose.Types.ObjectId();
    const lesson = new mongoose.Types.ObjectId();
    const progress = new ChildLessonProgress({
      child,
      lesson,
      completed: true,
      quizScore: 2,
      totalQuestions: 3,
      answers: [0, 1, 2],
      completedAt: new Date("2026-04-12"),
    });

    expect(progress.child).toEqual(child);
    expect(progress.lesson).toEqual(lesson);
    expect(progress.completed).toBe(true);
    expect(progress.quizScore).toBe(2);
    expect(progress.totalQuestions).toBe(3);
    expect(progress.answers).toEqual([0, 1, 2]);
  });

  it("requires child and lesson references", () => {
    const progress = new ChildLessonProgress({});
    const error = progress.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.child).toBeDefined();
    expect(error.errors.lesson).toBeDefined();
  });
});
