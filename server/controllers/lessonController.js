import Child from "../models/Child.js";
import Lesson from "../models/Lesson.js";
import ChildLessonProgress from "../models/ChildLessonProgress.js";

const starterLessons = [
  {
    slug: "god-created-me",
    title: "God Created Me",
    weekOf: new Date("2026-04-12T00:00:00.000Z"),
    bibleVerse: "Genesis 1:27",
    memoryVerse: "God created mankind in his own image.",
    summary: "Learn that every person is made by God and loved by Him.",
    content:
      "God made the whole world, and He made people with special care. You are not an accident. God knows you, loves you, and made you with purpose.",
    quizQuestions: [
      {
        prompt: "Who created people?",
        options: ["God", "A king", "The disciples"],
        correctAnswerIndex: 0,
        explanation: "Genesis teaches that God created people in His image.",
      },
      {
        prompt: "What does this lesson teach about you?",
        options: ["I am forgotten", "I am loved by God", "I am too small to matter"],
        correctAnswerIndex: 1,
        explanation: "God knows and loves each person He made.",
      },
    ],
    isPublished: true,
  },
  {
    slug: "jesus-loves-children",
    title: "Jesus Loves Children",
    weekOf: new Date("2026-04-19T00:00:00.000Z"),
    bibleVerse: "Mark 10:14",
    memoryVerse: "Let the little children come to me.",
    summary: "See how Jesus welcomed children and showed them kindness.",
    content:
      "Some people thought children should stay away, but Jesus welcomed them. Jesus showed that children are important in God's kingdom.",
    quizQuestions: [
      {
        prompt: "What did Jesus say about children coming to Him?",
        options: ["Let them come", "Send them away", "Wait until later"],
        correctAnswerIndex: 0,
        explanation: "Jesus told the people to let the children come to Him.",
      },
      {
        prompt: "How did Jesus treat children?",
        options: ["With kindness", "With anger", "Like they did not matter"],
        correctAnswerIndex: 0,
        explanation: "Jesus welcomed children with love and kindness.",
      },
    ],
    isPublished: true,
  },
];

const getIdValue = (value) => value?._id || value;

const isParent = (child, userId) =>
  String(getIdValue(child.parent)) === String(userId) ||
  (child.secondParent &&
    String(getIdValue(child.secondParent)) === String(userId) &&
    child.secondParentStatus === "accepted");

const ensureStarterLessons = async () => {
  const existingCount = await Lesson.countDocuments();
  if (existingCount > 0) {
    return;
  }

  await Promise.all(
    starterLessons.map((lesson) =>
      Lesson.updateOne(
        { slug: lesson.slug },
        { $setOnInsert: lesson },
        { upsert: true }
      )
    )
  );
};

const buildQuizReview = (lesson, answers = []) =>
  (lesson.quizQuestions || []).map((question, index) => ({
    index,
    prompt: question.prompt,
    options: question.options,
    selectedAnswerIndex: answers[index],
    correctAnswerIndex: question.correctAnswerIndex,
    explanation: question.explanation,
    isCorrect: answers[index] === question.correctAnswerIndex,
  }));

const toLessonResponse = (lesson, progress = null) => {
  const isCompleted = !!progress?.completed;

  return {
    _id: lesson._id,
    slug: lesson.slug,
    title: lesson.title,
    weekOf: lesson.weekOf,
    bibleVerse: lesson.bibleVerse,
    memoryVerse: lesson.memoryVerse,
    summary: lesson.summary,
    content: lesson.content,
    quizQuestions: (lesson.quizQuestions || []).map((question, index) => ({
      index,
      prompt: question.prompt,
      options: question.options,
      explanation: question.explanation,
    })),
    progress: progress
      ? {
          completed: progress.completed,
          quizScore: progress.quizScore,
          totalQuestions: progress.totalQuestions,
          completedAt: progress.completedAt,
          answers: progress.answers || [],
          review: isCompleted ? buildQuizReview(lesson, progress.answers || []) : [],
        }
      : null,
  };
};

const findAuthorizedChild = async (childId, userId) => {
  const child = await Child.findById(childId);

  if (!child) {
    return { error: { status: 404, message: "Child not found." } };
  }

  if (!isParent(child, userId)) {
    return { error: { status: 403, message: "Not authorized to access this child profile." } };
  }

  return { child };
};

export const getLessons = async (req, res) => {
  try {
    await ensureStarterLessons();

    const lessons = await Lesson.find({ isPublished: true }).sort({ weekOf: -1, title: 1 }).lean();

    return res.json({
      count: lessons.length,
      lessons: lessons.map((lesson) => toLessonResponse(lesson)),
    });
  } catch (error) {
    console.error("getLessons error:", error);
    return res.status(500).json({ message: "Unable to load lessons.", error: error.message });
  }
};

export const getChildProgress = async (req, res) => {
  try {
    const { child, error } = await findAuthorizedChild(req.params.childId, req.userId);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    await ensureStarterLessons();

    const [lessons, progressRecords] = await Promise.all([
      Lesson.find({ isPublished: true }).sort({ weekOf: -1, title: 1 }).lean(),
      ChildLessonProgress.find({ child: child._id }).lean(),
    ]);

    const progressByLesson = new Map(progressRecords.map((progress) => [String(progress.lesson), progress]));

    const completedCount = progressRecords.filter((progress) => progress.completed).length;
    const totalScore = progressRecords.reduce((sum, progress) => sum + (progress.quizScore || 0), 0);
    const totalQuestions = progressRecords.reduce((sum, progress) => sum + (progress.totalQuestions || 0), 0);

    return res.json({
      childId: child._id,
      summary: {
        lessonCount: lessons.length,
        completedCount,
        totalScore,
        totalQuestions,
      },
      lessons: lessons.map((lesson) => toLessonResponse(lesson, progressByLesson.get(String(lesson._id)))),
    });
  } catch (error) {
    console.error("getChildProgress error:", error);
    return res.status(500).json({ message: "Unable to load learning progress.", error: error.message });
  }
};

export const submitLessonQuiz = async (req, res) => {
  try {
    const { child, error } = await findAuthorizedChild(req.params.childId, req.userId);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const lesson = await Lesson.findOne({ _id: req.params.lessonId, isPublished: true });
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found." });
    }

    const answers = Array.isArray(req.body.answers) ? req.body.answers.map(Number) : [];
    const questions = lesson.quizQuestions || [];

    if (answers.length !== questions.length) {
      return res.status(400).json({ message: "Please answer every quiz question." });
    }

    const quizScore = questions.reduce(
      (score, question, index) => score + (answers[index] === question.correctAnswerIndex ? 1 : 0),
      0
    );

    const progress = await ChildLessonProgress.findOneAndUpdate(
      { child: child._id, lesson: lesson._id },
      {
        child: child._id,
        lesson: lesson._id,
        completed: true,
        quizScore,
        totalQuestions: questions.length,
        answers,
        completedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({
      message: "Quiz completed.",
      progress: {
        completed: progress.completed,
        quizScore: progress.quizScore,
        totalQuestions: progress.totalQuestions,
        completedAt: progress.completedAt,
        answers: progress.answers || [],
        review: buildQuizReview(lesson, progress.answers || []),
      },
    });
  } catch (error) {
    console.error("submitLessonQuiz error:", error);
    return res.status(500).json({ message: "Unable to submit quiz.", error: error.message });
  }
};
