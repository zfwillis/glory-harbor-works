import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockChild = { findById: jest.fn() };
const mockLesson = {
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
};
const mockProgress = {
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

jest.unstable_mockModule("../../models/Child.js", () => ({ default: mockChild }));
jest.unstable_mockModule("../../models/Lesson.js", () => ({ default: mockLesson }));
jest.unstable_mockModule("../../models/ChildLessonProgress.js", () => ({ default: mockProgress }));

const { getLessons, getChildProgress, submitLessonQuiz } = await import("../../controllers/lessonController.js");

const createMockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

describe("Lesson Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLesson.countDocuments.mockResolvedValue(1);
  });

  it("returns published lessons without correct answer indexes", async () => {
    const lessons = [
      {
        _id: "l1",
        title: "God Created Me",
        quizQuestions: [{ prompt: "Who?", options: ["God"], correctAnswerIndex: 0 }],
      },
    ];
    mockLesson.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(lessons) }) });
    const res = createMockRes();

    await getLessons({}, res);

    expect(res.body.count).toBe(1);
    expect(res.body.lessons[0].quizQuestions[0].correctAnswerIndex).toBeUndefined();
  });

  it("returns 403 when child does not belong to requester", async () => {
    mockChild.findById.mockResolvedValue({ _id: "c1", parent: "owner" });
    const res = createMockRes();

    await getChildProgress({ userId: "stranger", params: { childId: "c1" } }, res);

    expect(res.statusCode).toBe(403);
  });

  it("returns child progress with quiz review for completed lessons", async () => {
    mockChild.findById.mockResolvedValue({ _id: "c1", parent: "u1" });
    const lessons = [
      {
        _id: "l1",
        title: "Lesson",
        quizQuestions: [{ prompt: "Q", options: ["A", "B"], correctAnswerIndex: 1, explanation: "Because" }],
      },
    ];
    const progress = [{ child: "c1", lesson: "l1", completed: true, quizScore: 1, totalQuestions: 1, answers: [1] }];
    mockLesson.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(lessons) }) });
    mockProgress.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(progress) });
    const res = createMockRes();

    await getChildProgress({ userId: "u1", params: { childId: "c1" } }, res);

    expect(res.body.summary.completedCount).toBe(1);
    expect(res.body.lessons[0].progress.review[0].correctAnswerIndex).toBe(1);
  });

  it("rejects incomplete quiz answers", async () => {
    mockChild.findById.mockResolvedValue({ _id: "c1", parent: "u1" });
    mockLesson.findOne.mockResolvedValue({ _id: "l1", quizQuestions: [{ correctAnswerIndex: 0 }, { correctAnswerIndex: 1 }] });
    const res = createMockRes();

    await submitLessonQuiz({ userId: "u1", params: { childId: "c1", lessonId: "l1" }, body: { answers: [0] } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Please answer every quiz question.");
  });

  it("scores and saves a completed quiz", async () => {
    mockChild.findById.mockResolvedValue({ _id: "c1", parent: "u1" });
    mockLesson.findOne.mockResolvedValue({
      _id: "l1",
      quizQuestions: [
        { prompt: "Q1", options: ["A", "B"], correctAnswerIndex: 0 },
        { prompt: "Q2", options: ["A", "B"], correctAnswerIndex: 1 },
      ],
    });
    mockProgress.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        completed: true,
        quizScore: 1,
        totalQuestions: 2,
        answers: [0, 0],
        completedAt: "now",
      }),
    });
    const res = createMockRes();

    await submitLessonQuiz({ userId: "u1", params: { childId: "c1", lessonId: "l1" }, body: { answers: [0, 0] } }, res);

    expect(mockProgress.findOneAndUpdate).toHaveBeenCalledWith(
      { child: "c1", lesson: "l1" },
      expect.objectContaining({ quizScore: 1, totalQuestions: 2 }),
      expect.objectContaining({ upsert: true })
    );
    expect(res.body.progress.quizScore).toBe(1);
  });
});
