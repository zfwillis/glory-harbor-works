import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockChild = { findById: jest.fn(), find: jest.fn() };
const mockLesson = {
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
};
const mockProgress = {
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  deleteMany: jest.fn(),
};

jest.unstable_mockModule("../../models/Child.js", () => ({ default: mockChild }));
jest.unstable_mockModule("../../models/Lesson.js", () => ({ default: mockLesson }));
jest.unstable_mockModule("../../models/ChildLessonProgress.js", () => ({ default: mockProgress }));

const {
  getLessons,
  getChildProgress,
  getTeacherLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  getAllChildrenProgress,
  submitLessonQuiz,
} = await import("../../controllers/lessonController.js");

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

const mockLessonFind = (lessons) => {
  mockLesson.find.mockReturnValueOnce({
    sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(lessons) }),
  });
};

const mockProgressFind = (records) => {
  mockProgress.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(records) });
};

const mockChildrenFind = (children) => {
  mockChild.find.mockReturnValueOnce({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(children),
      }),
    }),
  });
};

describe("Lesson Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLesson.countDocuments.mockResolvedValue(1);
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns published lessons without correct answer indexes", async () => {
    const lessons = [
      {
        _id: "l1",
        title: "God Created Me",
        quizQuestions: [{ prompt: "Who?", options: ["God"], correctAnswerIndex: 0 }],
      },
    ];
    mockLessonFind(lessons);
    const res = createMockRes();

    await getLessons({}, res);

    expect(res.body.count).toBe(1);
    expect(res.body.lessons[0].quizQuestions[0].correctAnswerIndex).toBeUndefined();
  });

  it("returns lessons with empty quiz questions when none are saved", async () => {
    mockLessonFind([{ _id: "l1", title: "No Quiz" }]);
    const res = createMockRes();

    await getLessons({}, res);

    expect(res.body.lessons[0].quizQuestions).toEqual([]);
    expect(res.body.lessons[0].progress).toBeNull();
  });

  it("seeds starter lessons when lesson collection is empty", async () => {
    mockLesson.countDocuments.mockResolvedValueOnce(0);
    mockLesson.updateOne.mockResolvedValue({});
    mockLessonFind([]);
    const res = createMockRes();

    await getLessons({}, res);

    expect(mockLesson.updateOne).toHaveBeenCalledTimes(2);
    expect(res.body.count).toBe(0);
  });

  it("handles get lessons server errors", async () => {
    mockLesson.countDocuments.mockRejectedValueOnce(new Error("count failed"));
    const res = createMockRes();

    await getLessons({}, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Unable to load lessons.");
  });

  it("returns 403 when child does not belong to requester", async () => {
    mockChild.findById.mockResolvedValue({ _id: "c1", parent: "owner" });
    const res = createMockRes();

    await getChildProgress({ userId: "stranger", params: { childId: "c1" } }, res);

    expect(res.statusCode).toBe(403);
  });

  it("returns 404 when child progress is requested for a missing child", async () => {
    mockChild.findById.mockResolvedValue(null);
    const res = createMockRes();

    await getChildProgress({ userId: "u1", params: { childId: "missing" } }, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Child not found.");
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
    mockLessonFind(lessons);
    mockProgressFind(progress);
    const res = createMockRes();

    await getChildProgress({ userId: "u1", params: { childId: "c1" } }, res);

    expect(res.body.summary.completedCount).toBe(1);
    expect(res.body.lessons[0].progress.review[0].correctAnswerIndex).toBe(1);
  });

  it("allows an accepted second parent to view child progress with incomplete lesson progress", async () => {
    mockChild.findById.mockResolvedValue({
      _id: "c1",
      parent: { _id: "owner" },
      secondParent: { _id: "u2" },
      secondParentStatus: "accepted",
    });
    const lessons = [{ _id: "l1", title: "Lesson", quizQuestions: [{ prompt: "Q", options: ["A"], explanation: "E" }] }];
    const progress = [{ child: "c1", lesson: "l1", completed: false, quizScore: 0, totalQuestions: 1, answers: [0] }];
    mockLessonFind(lessons);
    mockProgressFind(progress);
    const res = createMockRes();

    await getChildProgress({ userId: "u2", params: { childId: "c1" } }, res);

    expect(res.body.summary.completedCount).toBe(0);
    expect(res.body.lessons[0].progress.review).toEqual([]);
  });

  it("builds completed progress defaults when answers are missing", async () => {
    mockChild.findById.mockResolvedValue({
      _id: "c1",
      parent: "u1",
      secondParent: "u2",
      secondParentStatus: "pending",
    });
    const lessons = [{ _id: "l1", title: "Lesson" }];
    const progress = [{ child: "c1", lesson: "l1", completed: true, quizScore: 0 }];
    mockLessonFind(lessons);
    mockProgressFind(progress);
    const res = createMockRes();

    await getChildProgress({ userId: "u1", params: { childId: "c1" } }, res);

    expect(res.body.summary.totalQuestions).toBe(0);
    expect(res.body.lessons[0].progress.answers).toEqual([]);
    expect(res.body.lessons[0].progress.review).toEqual([]);
  });

  it("handles get child progress server errors", async () => {
    mockChild.findById.mockRejectedValueOnce(new Error("child failed"));
    const res = createMockRes();

    await getChildProgress({ userId: "u1", params: { childId: "c1" } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Unable to load learning progress.");
  });

  it("returns teacher lessons", async () => {
    mockLessonFind([{ _id: "l1", isPublished: false }]);
    const res = createMockRes();

    await getTeacherLessons({}, res);

    expect(res.body.count).toBe(1);
    expect(res.body.lessons[0].isPublished).toBe(false);
  });

  it("handles teacher lessons server errors", async () => {
    mockLesson.find.mockImplementationOnce(() => {
      throw new Error("teacher failed");
    });
    const res = createMockRes();

    await getTeacherLessons({}, res);

    expect(res.statusCode).toBe(500);
  });

  it("creates a lesson with generated slug and filtered quiz questions", async () => {
    const lesson = { _id: "l1", title: "Future Lesson" };
    mockLesson.create.mockResolvedValue(lesson);
    const res = createMockRes();

    await createLesson({
      body: {
        title: "Future Lesson!",
        weekOf: "2099-04-20T00:00:00.000Z",
        bibleVerse: "John 3:16",
        memoryVerse: "God loved the world.",
        summary: "Summary",
        content: "Content",
        quizQuestions: [
          { prompt: "Q", options: ["A", "B"], correctAnswerIndex: 0 },
          { prompt: "", options: ["A", "B"], correctAnswerIndex: 0 },
          { prompt: "Bad", options: ["A"], correctAnswerIndex: 0 },
        ],
      },
    }, res);

    expect(mockLesson.create).toHaveBeenCalledWith(expect.objectContaining({
      slug: "future-lesson-2099-04-20",
      quizQuestions: [{ prompt: "Q", options: ["A", "B"], correctAnswerIndex: 0 }],
      isPublished: true,
    }));
    expect(res.statusCode).toBe(201);
  });

  it("validates lesson creation required fields and past dates", async () => {
    const missingRes = createMockRes();

    await createLesson({ body: { title: "Missing Fields" } }, missingRes);

    expect(missingRes.statusCode).toBe(400);

    const pastRes = createMockRes();

    await createLesson({
      body: {
        title: "Past Lesson",
        weekOf: "2000-01-01T00:00:00.000Z",
        bibleVerse: "Verse",
        memoryVerse: "Memory",
        summary: "Summary",
        content: "Content",
      },
    }, pastRes);

    expect(pastRes.statusCode).toBe(400);
    expect(pastRes.body.message).toBe("Week of date cannot be in the past.");
  });

  it("handles duplicate and failed lesson creation", async () => {
    mockLesson.create.mockRejectedValueOnce({ code: 11000 });
    const duplicateRes = createMockRes();

    await createLesson({
      body: {
        slug: "duplicate",
        title: "Duplicate",
        weekOf: "2099-04-20T00:00:00.000Z",
        bibleVerse: "Verse",
        memoryVerse: "Memory",
        summary: "Summary",
        content: "Content",
        isPublished: false,
      },
    }, duplicateRes);

    expect(duplicateRes.statusCode).toBe(409);

    mockLesson.create.mockRejectedValueOnce(new Error("create failed"));
    const errorRes = createMockRes();

    await createLesson({
      body: {
        title: "Error",
        weekOf: "2099-04-20T00:00:00.000Z",
        bibleVerse: "Verse",
        memoryVerse: "Memory",
        summary: "Summary",
        content: "Content",
      },
    }, errorRes);

    expect(errorRes.statusCode).toBe(500);
  });

  it("updates a lesson and filters quiz questions", async () => {
    const lesson = {
      _id: "l1",
      title: "Old",
      quizQuestions: [],
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockLesson.findById.mockResolvedValueOnce(lesson);
    const res = createMockRes();

    await updateLesson({
      params: { id: "l1" },
      body: {
        slug: "new-slug",
        title: "New",
        weekOf: "2099-04-20T00:00:00.000Z",
        bibleVerse: "Verse",
        memoryVerse: "Memory",
        summary: "Summary",
        content: "Content",
        isPublished: false,
        quizQuestions: [{ prompt: "Q", options: ["A", "B"] }, { prompt: "Bad", options: ["A"] }],
      },
    }, res);

    expect(lesson.title).toBe("New");
    expect(lesson.isPublished).toBe(false);
    expect(lesson.quizQuestions).toEqual([{ prompt: "Q", options: ["A", "B"] }]);
    expect(res.body.message).toBe("Lesson updated.");
  });

  it("updates a lesson with only quiz question defaults", async () => {
    const lesson = {
      _id: "l1",
      title: "Old",
      quizQuestions: [{ prompt: "Old", options: ["A", "B"] }],
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockLesson.findById.mockResolvedValueOnce(lesson);
    const res = createMockRes();

    await updateLesson({ params: { id: "l1" }, body: { quizQuestions: null } }, res);

    expect(lesson.title).toBe("Old");
    expect(lesson.quizQuestions).toEqual([]);
    expect(res.body.message).toBe("Lesson updated.");
  });

  it("updates a lesson with no optional fields changed", async () => {
    const lesson = {
      _id: "l1",
      title: "Same",
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockLesson.findById.mockResolvedValueOnce(lesson);
    const res = createMockRes();

    await updateLesson({ params: { id: "l1" }, body: {} }, res);

    expect(lesson.title).toBe("Same");
    expect(res.body.message).toBe("Lesson updated.");
  });


  it("validates missing lesson and past week updates", async () => {
    mockLesson.findById.mockResolvedValueOnce(null);
    const missingRes = createMockRes();

    await updateLesson({ params: { id: "missing" }, body: {} }, missingRes);

    expect(missingRes.statusCode).toBe(404);

    mockLesson.findById.mockResolvedValueOnce({ _id: "l1" });
    const pastRes = createMockRes();

    await updateLesson({ params: { id: "l1" }, body: { weekOf: "2000-01-01T00:00:00.000Z" } }, pastRes);

    expect(pastRes.statusCode).toBe(400);
  });

  it("handles duplicate and failed lesson updates", async () => {
    mockLesson.findById.mockRejectedValueOnce({ code: 11000 });
    const duplicateRes = createMockRes();

    await updateLesson({ params: { id: "l1" }, body: {} }, duplicateRes);

    expect(duplicateRes.statusCode).toBe(409);

    mockLesson.findById.mockRejectedValueOnce(new Error("update failed"));
    const errorRes = createMockRes();

    await updateLesson({ params: { id: "l1" }, body: {} }, errorRes);

    expect(errorRes.statusCode).toBe(500);
  });

  it("deletes a lesson and its progress records", async () => {
    mockLesson.findByIdAndDelete.mockResolvedValueOnce({ _id: "l1" });
    mockProgress.deleteMany.mockResolvedValueOnce({ deletedCount: 2 });
    const res = createMockRes();

    await deleteLesson({ params: { id: "l1" } }, res);

    expect(mockProgress.deleteMany).toHaveBeenCalledWith({ lesson: "l1" });
    expect(res.body.message).toBe("Lesson deleted.");
  });

  it("validates missing lesson delete and handles delete errors", async () => {
    mockLesson.findByIdAndDelete.mockResolvedValueOnce(null);
    const missingRes = createMockRes();

    await deleteLesson({ params: { id: "missing" } }, missingRes);

    expect(missingRes.statusCode).toBe(404);

    mockLesson.findByIdAndDelete.mockRejectedValueOnce(new Error("delete failed"));
    const errorRes = createMockRes();

    await deleteLesson({ params: { id: "l1" } }, errorRes);

    expect(errorRes.statusCode).toBe(500);
  });

  it("returns all children progress for teacher dashboard", async () => {
    const children = [
      {
        _id: "c1",
        firstName: "Ava",
        lastName: "Child",
        parent: { _id: "p1" },
        secondParent: { _id: "p2" },
        secondParentStatus: "accepted",
      },
      {
        _id: "c2",
        firstName: "Ben",
        lastName: "Child",
        parent: { _id: "p3" },
        secondParent: { _id: "p4" },
        secondParentStatus: "pending",
      },
    ];
    const lessons = [{ _id: "l1", title: "Lesson", weekOf: "date" }];
    const progress = [
      { child: "c1", lesson: "l1", completed: true, quizScore: 2, totalQuestions: 2, completedAt: "done" },
      { child: "c1", lesson: "l2", completed: true },
    ];
    mockChildrenFind(children);
    mockLessonFind(lessons);
    mockProgressFind(progress);
    const res = createMockRes();

    await getAllChildrenProgress({}, res);

    expect(res.body.children[0].summary.completedCount).toBe(2);
    expect(res.body.children[0].summary.totalScore).toBe(2);
    expect(res.body.children[0].summary.totalQuestions).toBe(2);
    expect(res.body.children[0].secondParent).toEqual({ _id: "p2" });
    expect(res.body.children[1].secondParent).toBeNull();
    expect(res.body.lessons).toEqual([{ _id: "l1", title: "Lesson", weekOf: "date" }]);
  });

  it("handles all children progress server errors", async () => {
    mockChild.find.mockImplementationOnce(() => {
      throw new Error("children failed");
    });
    const res = createMockRes();

    await getAllChildrenProgress({}, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Unable to load progress data.");
  });

  it("rejects incomplete quiz answers", async () => {
    mockChild.findById.mockResolvedValue({ _id: "c1", parent: "u1" });
    mockLesson.findOne.mockResolvedValue({ _id: "l1", quizQuestions: [{ correctAnswerIndex: 0 }, { correctAnswerIndex: 1 }] });
    const res = createMockRes();

    await submitLessonQuiz({ userId: "u1", params: { childId: "c1", lessonId: "l1" }, body: { answers: [0] } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Please answer every quiz question.");
  });

  it("rejects quiz submission for unauthorized child and missing lesson", async () => {
    mockChild.findById.mockResolvedValueOnce({ _id: "c1", parent: "owner" });
    const unauthorizedRes = createMockRes();

    await submitLessonQuiz({ userId: "stranger", params: { childId: "c1", lessonId: "l1" }, body: { answers: [] } }, unauthorizedRes);

    expect(unauthorizedRes.statusCode).toBe(403);

    mockChild.findById.mockResolvedValueOnce({ _id: "c1", parent: "u1" });
    mockLesson.findOne.mockResolvedValueOnce(null);
    const missingLessonRes = createMockRes();

    await submitLessonQuiz({ userId: "u1", params: { childId: "c1", lessonId: "missing" }, body: { answers: [] } }, missingLessonRes);

    expect(missingLessonRes.statusCode).toBe(404);
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
    expect(res.body.progress.review[1].isCorrect).toBe(false);
  });

  it("defaults non-array quiz answers to an empty array and handles quiz errors", async () => {
    mockChild.findById.mockResolvedValueOnce({ _id: "c1", parent: "u1" });
    mockLesson.findOne.mockResolvedValueOnce({ _id: "l1", quizQuestions: [] });
    mockProgress.findOneAndUpdate.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue({
        completed: true,
        quizScore: 0,
        totalQuestions: 0,
        completedAt: "now",
      }),
    });
    const emptyQuizRes = createMockRes();

    await submitLessonQuiz({ userId: "u1", params: { childId: "c1", lessonId: "l1" }, body: { answers: "bad" } }, emptyQuizRes);

    expect(emptyQuizRes.body.progress.answers).toEqual([]);

    mockChild.findById.mockResolvedValueOnce({ _id: "c1", parent: "u1" });
    mockLesson.findOne.mockResolvedValueOnce({ _id: "l1" });
    mockProgress.findOneAndUpdate.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue({
        completed: true,
        quizScore: 0,
        totalQuestions: 0,
        completedAt: "now",
      }),
    });
    const missingQuestionsRes = createMockRes();

    await submitLessonQuiz({ userId: "u1", params: { childId: "c1", lessonId: "l1" }, body: { answers: [] } }, missingQuestionsRes);

    expect(missingQuestionsRes.body.progress.review).toEqual([]);

    mockChild.findById.mockRejectedValueOnce(new Error("quiz failed"));
    const errorRes = createMockRes();

    await submitLessonQuiz({ userId: "u1", params: { childId: "c1", lessonId: "l1" }, body: { answers: [] } }, errorRes);

    expect(errorRes.statusCode).toBe(500);
  });
});
