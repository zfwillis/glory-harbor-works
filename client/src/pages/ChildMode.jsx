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
  const selectedProgress = selectedLesson?.progress || null;
  const selectedReview = selectedProgress?.review || [];
  const selectedLessonCompleted = !!selectedProgress?.completed;

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
    setAnswers({});
    setMessage("");
  }, [selectedLessonId]);

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

    if (!selectedLesson) {
      return;
    }

    const quizQuestions = selectedLesson.quizQuestions || [];
    const answerList = quizQuestions.map((question) => answers[question.index]);

    if (answerList.some((answer) => answer === undefined)) {
      setError("Answer every question before finishing the quiz.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/lessons/children/${childId}/${selectedLesson._id}/quiz`, {
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

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[320px,1fr]">
        <aside className="space-y-4">
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
                    onClick={() => setSelectedLessonId(lesson._id)}
                    className={`w-full rounded-md border px-3 py-3 text-left text-sm ${
                      isSelected
                        ? "border-[#15436b] bg-[#eaf3fb]"
                        : "border-gray-200 bg-white hover:border-[#15436b]/40"
                    }`}
                  >
                    <span className="block font-semibold text-gray-900">{lesson.title}</span>
                    <span className="block text-xs text-gray-500">{formatWeek(lesson.weekOf)}</span>
                    {isComplete && <span className="mt-1 block text-xs font-semibold text-green-700">Completed</span>}
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}
          {message && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-green-700">{message}</div>}

          {loading && <p className="text-gray-600">Loading child mode...</p>}

          {!loading && selectedLesson && (
            <>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#15436b]">{formatWeek(selectedLesson.weekOf)}</p>
              <h2 className="mt-1 text-3xl font-bold text-gray-950">{selectedLesson.title}</h2>
              <div className="mt-5 rounded-md border border-[#E7A027]/40 bg-[#fff8ea] p-4">
                <p className="text-sm font-semibold text-gray-800">Memory Verse</p>
                <p className="mt-1 text-lg text-gray-950">{selectedLesson.memoryVerse}</p>
                <p className="mt-1 text-sm text-gray-600">{selectedLesson.bibleVerse}</p>
              </div>

              <p className="mt-6 text-lg leading-8 text-gray-800">{selectedLesson.content}</p>

              {selectedLessonCompleted ? (
                <section className="mt-8">
                  <div className="rounded-md border border-green-200 bg-green-50 p-4">
                    <h3 className="text-xl font-semibold text-green-900">Quiz Results</h3>
                    <p className="mt-1 text-green-800">
                      You scored {selectedProgress.quizScore} out of {selectedProgress.totalQuestions}.
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    {selectedReview.map((question) => {
                      const selectedAnswer = question.options[question.selectedAnswerIndex] || "No answer";
                      const correctAnswer = question.options[question.correctAnswerIndex] || "Answer unavailable";

                      return (
                        <article
                          key={question.index}
                          className={`rounded-md border p-4 ${
                            question.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                          }`}
                        >
                          <p className="font-semibold text-gray-950">{question.prompt}</p>
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
                <form onSubmit={handleSubmitQuiz} className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-950">Quiz Time</h3>
                  <div className="mt-4 space-y-5">
                    {(selectedLesson.quizQuestions || []).map((question) => (
                      <fieldset key={question.index} className="rounded-md border border-gray-200 p-4">
                        <legend className="px-1 font-semibold text-gray-900">{question.prompt}</legend>
                        <div className="mt-3 space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <label key={option} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-50">
                              <input
                                type="radio"
                                name={`question-${question.index}`}
                                checked={answers[question.index] === optionIndex}
                                onChange={() => handleAnswerChange(question.index, optionIndex)}
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-6 rounded-md bg-[#15436b] px-5 py-3 font-semibold text-white hover:bg-[#1b5385] disabled:opacity-60"
                  >
                    {submitting ? "Saving..." : "Finish Quiz"}
                  </button>
                </form>
              )}
            </>
          )}
        </section>
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
