import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { enterChildMode, exitChildMode } from "../utils/childMode";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const formatWeek = (value) => {
  if (!value) {
    return "This week";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "This week";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function ChildMode() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [child, setChild] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [summary, setSummary] = useState({ lessonCount: 0, completedCount: 0, totalScore: 0, totalQuestions: 0 });
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [activeView, setActiveView] = useState("lesson");
  const [activeQuizLessonId, setActiveQuizLessonId] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showExitGate, setShowExitGate] = useState(false);
  const [exitPassword, setExitPassword] = useState("");
  const [exitError, setExitError] = useState("");
  const [exitLoading, setExitLoading] = useState(false);

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => String(lesson._id) === String(selectedLessonId)) || lessons[0] || null,
    [lessons, selectedLessonId]
  );
  const activeQuizLesson = useMemo(
    () => lessons.find((lesson) => String(lesson._id) === String(activeQuizLessonId)) || null,
    [lessons, activeQuizLessonId]
  );
  const activeQuizProgress = activeQuizLesson?.progress || null;
  const activeQuizReview = activeQuizProgress?.review || [];
  const activeQuizCompleted = !!activeQuizProgress?.completed;
  const activeQuizQuestions = activeQuizLesson?.quizQuestions || [];
  const isQuizReviewPage = activeView === "quiz" && currentQuestionIndex >= activeQuizQuestions.length;
  const currentQuestion = activeQuizQuestions[currentQuestionIndex] || null;

  const progressPercent = summary.lessonCount
    ? Math.round((summary.completedCount / summary.lessonCount) * 100)
    : 0;

  const quizPercent = summary.totalQuestions
    ? Math.round((summary.totalScore / summary.totalQuestions) * 100)
    : 0;

  const loadChildMode = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const [childResponse, progressResponse] = await Promise.all([
        fetch(`${API_URL}/children/${childId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/lessons/children/${childId}/progress`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const childData = await childResponse.json();
      const progressData = await progressResponse.json();

      if (!childResponse.ok) {
        throw new Error(childData.message || "Could not load child profile.");
      }

      if (!progressResponse.ok) {
        throw new Error(progressData.message || "Could not load lessons.");
      }

      setChild(childData.child);
      setLessons(progressData.lessons || []);
      setSummary(progressData.summary || { lessonCount: 0, completedCount: 0, totalScore: 0, totalQuestions: 0 });

      if (!selectedLessonId && progressData.lessons?.length) {
        setSelectedLessonId(progressData.lessons[0]._id);
      }
    } catch (loadError) {
      setError(loadError.message || "Could not load child mode.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !childId) {
      return;
    }

    enterChildMode(childId);
    loadChildMode();
  }, [token, childId]);

  useEffect(() => {
    setMessage("");
  }, [selectedLessonId]);

  const openLesson = (lessonId) => {
    setSelectedLessonId(lessonId);
    setActiveView("lesson");
    setMessage("");
    setError("");
  };

  const startQuiz = (lesson) => {
    setActiveQuizLessonId(lesson._id);
    setActiveView("quiz");
    setCurrentQuestionIndex(0);
    setAnswers({});
    setMessage("");
    setError("");
  };

  const viewQuizResults = (lesson) => {
    setActiveQuizLessonId(lesson._id);
    setActiveView("quiz");
    setCurrentQuestionIndex(lesson.quizQuestions?.length || 0);
    setAnswers({});
    setMessage("");
    setError("");
  };

  const handleExitRequest = () => {
    setShowExitGate(true);
    setExitPassword("");
    setExitError("");
  };

  const handleExitCancel = () => {
    setShowExitGate(false);
    setExitPassword("");
    setExitError("");
  };

  const handleExitConfirm = async (event) => {
    event.preventDefault();

    if (!exitPassword) {
      setExitError("Enter the parent password to exit child mode.");
      return;
    }

    setExitLoading(true);
    setExitError("");

    try {
      const response = await fetch(`${API_URL}/auth/verify-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: exitPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not verify password.");
      }

      exitChildMode();
      navigate("/my-children");
    } catch (verifyError) {
      setExitError(verifyError.message || "Could not verify password.");
    } finally {
      setExitLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex, optionIndex) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionIndex]: optionIndex,
    }));
    setMessage("");
    setError("");
  };

  const handleSubmitQuiz = async (event) => {
    event.preventDefault();

    if (!activeQuizLesson) {
      return;
    }

    const quizQuestions = activeQuizLesson.quizQuestions || [];
    const answerList = quizQuestions.map((question) => answers[question.index]);

    if (answerList.some((answer) => answer === undefined)) {
      setError("Answer every question before finishing the quiz.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/lessons/children/${childId}/${activeQuizLesson._id}/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: answerList }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save quiz.");
      }

      setMessage(`Great work. You scored ${data.progress.quizScore} out of ${data.progress.totalQuestions}.`);
      await loadChildMode();
      setCurrentQuestionIndex(quizQuestions.length);
    } catch (submitError) {
      setError(submitError.message || "Could not save quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f8fb]">
      <header className="bg-[#15436b] px-4 py-4 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-white/75">Child Mode</p>
            <h1 className="text-2xl font-bold">
              {child ? `${child.firstName}'s Lessons` : "Weekly Lessons"}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleExitRequest}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#15436b] hover:bg-gray-100"
          >
            Exit Child Mode
          </button>
        </div>
      </header>

      <main className={`mx-auto max-w-6xl gap-6 px-4 py-8 ${activeView === "quiz" ? "grid lg:grid-cols-[320px,1fr]" : "space-y-6"}`}>
        <aside className={activeView === "quiz" ? "space-y-4" : "space-y-6"}>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Progress</h2>
            <p className="mt-3 text-3xl font-bold text-[#15436b]">{progressPercent}%</p>
            <p className="text-sm text-gray-600">
              {summary.completedCount} of {summary.lessonCount} lessons completed
            </p>
            <div className="mt-4 h-3 overflow-hidden rounded bg-gray-200">
              <div className="h-full bg-[#E7A027]" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-4 text-sm text-gray-700">Quiz score average: {quizPercent}%</p>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Weekly Lessons</h2>
            {loading && <p className="mt-3 text-sm text-gray-600">Loading lessons...</p>}
            {!loading && lessons.length === 0 && (
              <p className="mt-3 text-sm text-gray-600">No lessons are available yet.</p>
            )}
            <div className="mt-4 space-y-2">
              {lessons.map((lesson) => {
                const isSelected = String(selectedLesson?._id) === String(lesson._id);
                const isComplete = lesson.progress?.completed;

                return (
                  <button
                    key={lesson._id}
                    type="button"
                    onClick={() => openLesson(lesson._id)}
                    className={`w-full rounded-md border px-3 py-3 text-left text-sm ${
                      isSelected
                        ? "border-[#15436b] bg-[#eaf3fb]"
                        : "border-gray-200 bg-white hover:border-[#15436b]/40"
                    }`}
                  >
                    <span className="block font-semibold text-gray-900">{lesson.title}</span>
                    <span className="block text-xs text-gray-500">{formatWeek(lesson.weekOf)}</span>
                    <span className="mt-2 block text-xs text-gray-700">Verse: {lesson.bibleVerse}</span>
                    <span className="block text-xs text-gray-700">{lesson.memoryVerse}</span>
                    {isComplete && <span className="mt-2 block text-xs font-semibold text-green-700">Quiz completed</span>}
                    {isSelected && activeView === "lesson" && (
                      <span className="mt-4 block rounded-md border border-[#E7A027]/40 bg-[#fff8ea] p-4 text-sm text-gray-800">
                        <span className="block font-semibold text-gray-950">Memory Verse</span>
                        <span className="mt-1 block text-base text-gray-950">{lesson.memoryVerse}</span>
                        <span className="mt-1 block text-xs text-gray-600">{lesson.bibleVerse}</span>
                        <span className="mt-4 block font-semibold text-gray-950">Lesson</span>
                        <span className="mt-1 block leading-6">{lesson.content}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Weekly Quizzes</h2>
            {loading && <p className="mt-3 text-sm text-gray-600">Loading quizzes...</p>}
            {!loading && lessons.length === 0 && (
              <p className="mt-3 text-sm text-gray-600">No quizzes are available yet.</p>
            )}
            <div className="mt-4 space-y-2">
              {lessons.map((lesson) => {
                const isComplete = lesson.progress?.completed;
                const isActiveQuiz = activeView === "quiz" && String(activeQuizLesson?._id) === String(lesson._id);

                return (
                  <div
                    key={`${lesson._id}-quiz`}
                    className={`rounded-md border px-3 py-3 text-sm ${
                      isActiveQuiz ? "border-[#15436b] bg-[#eaf3fb]" : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{lesson.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{lesson.quizQuestions?.length || 0} questions</p>
                    {isComplete && (
                      <p className="mt-1 text-xs font-semibold text-green-700">
                        Score: {lesson.progress.quizScore} / {lesson.progress.totalQuestions}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => (isComplete ? viewQuizResults(lesson) : startQuiz(lesson))}
                      className="mt-3 rounded-md bg-[#15436b] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1b5385]"
                    >
                      {isComplete ? "View Results" : "Take Quiz"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>

        {activeView === "quiz" && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}
          {message && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-green-700">{message}</div>}

          {loading && <p className="text-gray-600">Loading child mode...</p>}

          {!loading && activeView === "quiz" && activeQuizLesson && (
            <>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#15436b]">Weekly Quiz</p>
              <h2 className="mt-1 text-3xl font-bold text-gray-950">{activeQuizLesson.title}</h2>

              {activeQuizCompleted ? (
                <section className="mt-6">
                  <div className="rounded-md border border-green-200 bg-green-50 p-4">
                    <h3 className="text-xl font-semibold text-green-900">Quiz Results</h3>
                    <p className="mt-1 text-green-800">
                      You scored {activeQuizProgress.quizScore} out of {activeQuizProgress.totalQuestions}.
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    {activeQuizReview.map((question) => {
                      const selectedAnswer = question.options[question.selectedAnswerIndex] || "No answer";
                      const correctAnswer = question.options[question.correctAnswerIndex] || "Answer unavailable";

                      return (
                        <article
                          key={question.index}
                          className={`rounded-md border p-4 ${
                            question.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                          }`}
                        >
                          <p className="font-semibold text-gray-950">
                            Question {question.index + 1}: {question.prompt}
                          </p>
                          <p className="mt-2 text-sm text-gray-800">
                            Your answer: <span className="font-semibold">{selectedAnswer}</span>
                          </p>
                          <p className="mt-1 text-sm text-gray-800">
                            Correct answer: <span className="font-semibold">{correctAnswer}</span>
                          </p>
                          {question.explanation && <p className="mt-2 text-sm text-gray-700">{question.explanation}</p>}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <form onSubmit={handleSubmitQuiz} className="mt-6">
                  {!isQuizReviewPage && currentQuestion && (
                    <fieldset className="rounded-md border border-gray-200 p-5">
                      <legend className="px-1 text-sm font-semibold text-[#15436b]">
                        Question {currentQuestionIndex + 1} of {activeQuizQuestions.length}
                      </legend>
                      <p className="mt-3 text-xl font-semibold text-gray-950">{currentQuestion.prompt}</p>
                      <div className="mt-5 space-y-3">
                        {currentQuestion.options.map((option, optionIndex) => (
                          <label
                            key={option}
                            className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 px-3 py-3 hover:bg-gray-50"
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestion.index}`}
                              checked={answers[currentQuestion.index] === optionIndex}
                              onChange={() => handleAnswerChange(currentQuestion.index, optionIndex)}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {isQuizReviewPage && (
                    <section className="rounded-md border border-gray-200 p-5">
                      <h3 className="text-xl font-semibold text-gray-950">Ready to Submit?</h3>
                      <p className="mt-2 text-sm text-gray-700">
                        Check that each question has an answer before submitting.
                      </p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {activeQuizQuestions.map((question) => {
                          const isAnswered = answers[question.index] !== undefined;

                          return (
                            <button
                              key={question.index}
                              type="button"
                              onClick={() => setCurrentQuestionIndex(question.index)}
                              className={`rounded-md border px-3 py-3 text-left text-sm ${
                                isAnswered ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                              }`}
                            >
                              <span className="block font-semibold">Question {question.index + 1}</span>
                              <span className={isAnswered ? "text-green-700" : "text-red-700"}>
                                {isAnswered ? "Answered" : "Not answered"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveView("lesson")}
                      className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Back to Lessons
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIndex((index) => Math.max(0, index - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {!isQuizReviewPage && (
                      <button
                        type="button"
                        onClick={() => setCurrentQuestionIndex((index) => Math.min(activeQuizQuestions.length, index + 1))}
                        className="rounded-md bg-[#15436b] px-4 py-2 font-semibold text-white hover:bg-[#1b5385]"
                      >
                        {currentQuestionIndex === activeQuizQuestions.length - 1 ? "Review Answers" : "Next"}
                      </button>
                    )}
                    {isQuizReviewPage && (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-md bg-[#15436b] px-4 py-2 font-semibold text-white hover:bg-[#1b5385] disabled:opacity-60"
                      >
                        {submitting ? "Submitting..." : "Submit Answers"}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}
        </section>
        )}
      </main>

      {showExitGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <form onSubmit={handleExitConfirm} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-950">Parent Check</h2>
            <p className="mt-2 text-sm text-gray-700">
              Enter the parent password to exit child mode.
            </p>

            {exitError && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {exitError}
              </div>
            )}

            <label className="mt-5 block text-sm font-semibold text-gray-800" htmlFor="exit-password">
              Parent password
            </label>
            <input
              id="exit-password"
              type="password"
              value={exitPassword}
              onChange={(event) => setExitPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
              autoComplete="current-password"
              autoFocus
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleExitCancel}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Stay in Child Mode
              </button>
              <button
                type="submit"
                disabled={exitLoading}
                className="rounded-md bg-[#15436b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b5385] disabled:opacity-60"
              >
                {exitLoading ? "Checking..." : "Exit"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
