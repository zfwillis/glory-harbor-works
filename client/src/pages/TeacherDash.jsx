import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import DashboardSwitcher from "../components/DashboardSwitcher";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const emptyForm = {
  title: "",
  weekOf: "",
  bibleVerse: "",
  memoryVerse: "",
  summary: "",
  content: "",
  isPublished: true,
};

const emptyQuestion = () => ({ prompt: "", options: ["", "", ""], correctAnswerIndex: 0, explanation: "" });

const formatWeek = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
};

const scorePercent = (score, total) => (total > 0 ? Math.round((score / total) * 100) : null);

export default function TeacherDash() {
  const { user, token } = useAuth();

  const [tab, setTab] = useState("lessons");
  const [lessons, setLessons] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Lesson management
  const [view, setView] = useState("list"); // "list" | "create" | "edit"
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Progress
  const [expandedChild, setExpandedChild] = useState(null);

  const clearAlerts = () => { setError(""); setMessage(""); };

  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchLessons = async () => {
    setLoading(true);
    clearAlerts();
    try {
      const res = await fetch(`${API_URL}/lessons/teacher/all`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load lessons.");
      setLessons(data.lessons || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    setLoading(true);
    clearAlerts();
    try {
      const res = await fetch(`${API_URL}/lessons/teacher/progress`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load progress.");
      setProgressData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (tab === "lessons") fetchLessons();
    if (tab === "progress") fetchProgress();
  }, [token, tab]);

  // ── Lesson form handlers ───────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    clearAlerts();
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const openCreate = () => {
    clearAlerts();
    setForm(emptyForm);
    setQuestions([]);
    setSelectedLesson(null);
    setView("create");
  };

  const openEdit = (lesson) => {
    clearAlerts();
    setSelectedLesson(lesson);
    setForm({
      title: lesson.title,
      weekOf: lesson.weekOf ? lesson.weekOf.slice(0, 10) : "",
      bibleVerse: lesson.bibleVerse,
      memoryVerse: lesson.memoryVerse,
      summary: lesson.summary,
      content: lesson.content,
      isPublished: lesson.isPublished,
    });
    setQuestions(
      (lesson.quizQuestions || []).map((q) => ({
        prompt: q.prompt,
        options: [...q.options],
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation || "",
      }))
    );
    setView("edit");
  };

  const backToList = () => {
    clearAlerts();
    setView("list");
    setSelectedLesson(null);
  };

  const handleSave = async () => {
    clearAlerts();
    if (!form.title || !form.weekOf || !form.bibleVerse || !form.memoryVerse || !form.summary || !form.content) {
      setError("All lesson fields are required.");
      return;
    }
    if (form.weekOf < new Date().toISOString().slice(0, 10)) {
      setError("Week of date cannot be in the past.");
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const filled = q.options.filter((o) => o.trim() !== "");
      if (!q.prompt.trim()) { setError(`Question ${i + 1} needs a prompt.`); return; }
      if (filled.length < 2) { setError(`Question ${i + 1} needs at least 2 answer options.`); return; }
      if (!q.options[q.correctAnswerIndex]?.trim()) { setError(`Question ${i + 1}: correct answer must be a filled option.`); return; }
    }

    const payload = {
      ...form,
      quizQuestions: questions.map((q) => ({
        prompt: q.prompt.trim(),
        options: q.options.map((o) => o.trim()).filter((o) => o !== ""),
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation.trim(),
      })),
    };

    setSaving(true);
    try {
      const url = view === "edit" ? `${API_URL}/lessons/${selectedLesson._id}` : `${API_URL}/lessons`;
      const method = view === "edit" ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save lesson.");
      setMessage(data.message);
      await fetchLessons();
      backToList();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lessonId) => {
    if (!window.confirm("Delete this lesson and all associated quiz progress?")) return;
    setDeletingId(lessonId);
    clearAlerts();
    try {
      const res = await fetch(`${API_URL}/lessons/${lessonId}`, { method: "DELETE", headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete lesson.");
      setMessage(data.message);
      setLessons((prev) => prev.filter((l) => l._id !== lessonId));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Quiz question handlers ─────────────────────────────────────────────────

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);

  const removeQuestion = (qi) => setQuestions((prev) => prev.filter((_, i) => i !== qi));

  const updateQuestion = (qi, field, value) =>
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, [field]: value } : q)));

  const updateOption = (qi, oi, value) =>
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qi) return q;
        const options = [...q.options];
        options[oi] = value;
        return { ...q, options };
      })
    );

  const addOption = (qi) =>
    setQuestions((prev) =>
      prev.map((q, i) => (i === qi ? { ...q, options: [...q.options, ""] } : q))
    );

  const removeOption = (qi, oi) =>
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qi) return q;
        const options = q.options.filter((_, oIdx) => oIdx !== oi);
        const correctAnswerIndex =
          q.correctAnswerIndex >= oi && q.correctAnswerIndex > 0
            ? q.correctAnswerIndex - 1
            : q.correctAnswerIndex;
        return { ...q, options, correctAnswerIndex };
      })
    );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#15436b]">Teacher Dashboard</h1>
        </div>

        <DashboardSwitcher />

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {[
            ["lessons", "Lessons"],
            ["progress", "Child Progress"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setView("list"); clearAlerts(); setExpandedChild(null); }}
              className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-[#15436b] text-[#15436b]"
                  : "border-transparent text-gray-500 hover:text-[#15436b]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}
        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{message}</div>
        )}

        {/* ── LESSONS TAB ── */}
        {tab === "lessons" && (
          <>
            {/* List view */}
            {view === "list" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[#15436b]">Weekly Lessons</h2>
                  <button
                    onClick={openCreate}
                    className="bg-[#15436b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1a5285] transition-colors"
                  >
                    + New Lesson
                  </button>
                </div>

                {loading && <p className="text-gray-500 text-sm">Loading lessons…</p>}
                {!loading && lessons.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    No lessons yet. Create the first one!
                  </div>
                )}

                <div className="space-y-3">
                  {lessons.map((lesson) => (
                    <div
                      key={lesson._id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-[#15436b]/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-[#15436b]">{lesson.title}</h3>
                            {!lesson.isPublished && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                Draft
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">Week of {formatWeek(lesson.weekOf)}</p>
                          <p className="text-sm text-gray-600 mt-1 italic">"{lesson.memoryVerse}"</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {lesson.bibleVerse} ·{" "}
                            {lesson.quizQuestions?.length || 0} quiz question
                            {lesson.quizQuestions?.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => openEdit(lesson)}
                            className="text-sm px-3 py-1.5 border border-[#15436b] text-[#15436b] rounded-lg hover:bg-[#15436b]/5 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(lesson._id)}
                            disabled={deletingId === lesson._id}
                            className="text-sm px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deletingId === lesson._id ? "…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create / Edit form */}
            {(view === "create" || view === "edit") && (
              <div>
                <button
                  onClick={backToList}
                  className="text-sm text-[#15436b] hover:underline mb-4 flex items-center gap-1"
                >
                  ← Back to lessons
                </button>

                <h2 className="text-xl font-semibold text-[#15436b] mb-6">
                  {view === "create" ? "New Lesson" : `Edit: ${selectedLesson?.title}`}
                </h2>

                {/* Lesson details */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 space-y-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lesson Details</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15436b]/30"
                        placeholder="e.g. God Created Me"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Week Of</label>
                      <input
                        type="date"
                        name="weekOf"
                        value={form.weekOf}
                        onChange={handleChange}
                        min={new Date().toISOString().slice(0, 10)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15436b]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bible Verse Reference</label>
                      <input
                        name="bibleVerse"
                        value={form.bibleVerse}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15436b]/30"
                        placeholder="e.g. Genesis 1:27"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Memory Verse</label>
                      <input
                        name="memoryVerse"
                        value={form.memoryVerse}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15436b]/30"
                        placeholder="The verse children will memorize"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                      <textarea
                        name="summary"
                        value={form.summary}
                        onChange={handleChange}
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15436b]/30 resize-y"
                        placeholder="A brief description of the lesson"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Content</label>
                      <textarea
                        name="content"
                        value={form.content}
                        onChange={handleChange}
                        rows={6}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15436b]/30 resize-y"
                        placeholder="The full lesson text children will read"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isPublished"
                        name="isPublished"
                        checked={form.isPublished}
                        onChange={handleChange}
                        className="w-4 h-4 accent-[#15436b]"
                      />
                      <label htmlFor="isPublished" className="text-sm text-gray-700">
                        Publish (visible to children)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Quiz questions */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quiz Questions</h3>
                    <button
                      onClick={addQuestion}
                      className="text-sm px-3 py-1.5 bg-[#15436b]/10 text-[#15436b] rounded-lg hover:bg-[#15436b]/20 transition-colors font-medium"
                    >
                      + Add Question
                    </button>
                  </div>

                  {questions.length === 0 && (
                    <p className="text-sm text-gray-400 italic">
                      No quiz questions yet. Add some to assess understanding.
                    </p>
                  )}

                  <div className="space-y-6">
                    {questions.map((q, qi) => (
                      <div key={qi} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Question {qi + 1}
                          </span>
                          <button
                            onClick={() => removeQuestion(qi)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Prompt</label>
                            <input
                              value={q.prompt}
                              onChange={(e) => updateQuestion(qi, "prompt", e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15436b]/30 bg-white"
                              placeholder="Enter the question"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Answer Options — select the correct one
                            </label>
                            <div className="space-y-2">
                              {q.options.map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`correct-${qi}`}
                                    checked={q.correctAnswerIndex === oi}
                                    onChange={() => updateQuestion(qi, "correctAnswerIndex", oi)}
                                    className="accent-[#15436b] shrink-0"
                                    title="Mark as correct answer"
                                  />
                                  <input
                                    value={opt}
                                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15436b]/30 bg-white"
                                    placeholder={`Option ${oi + 1}`}
                                  />
                                  {q.options.length > 2 && (
                                    <button
                                      onClick={() => removeOption(qi, oi)}
                                      className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                                      title="Remove option"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {q.options.length < 4 && (
                              <button
                                onClick={() => addOption(qi)}
                                className="mt-2 text-xs text-[#15436b] hover:underline"
                              >
                                + Add option
                              </button>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Explanation (optional)
                            </label>
                            <input
                              value={q.explanation}
                              onChange={(e) => updateQuestion(qi, "explanation", e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15436b]/30 bg-white"
                              placeholder="Why is this the correct answer?"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save / Cancel */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#15436b] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#1a5285] transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving…" : view === "create" ? "Create Lesson" : "Save Changes"}
                  </button>
                  <button
                    onClick={backToList}
                    className="border border-gray-300 text-gray-600 px-6 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── PROGRESS TAB ── */}
        {tab === "progress" && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#15436b]">Child Progress</h2>
              <p className="text-sm text-gray-500 mt-1">
                Click a child to view their lesson completion and quiz results.
              </p>
            </div>

            {loading && <p className="text-gray-500 text-sm">Loading progress…</p>}

            {!loading && progressData && progressData.children.length === 0 && (
              <div className="text-center py-12 text-gray-400">No children are enrolled yet.</div>
            )}

            {progressData && (
              <div className="space-y-3">
                {progressData.children.map((child) => {
                  const isExpanded = expandedChild === String(child._id);
                  const pct = scorePercent(child.summary.totalScore, child.summary.totalQuestions);

                  return (
                    <div key={child._id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Child summary row */}
                      <button
                        onClick={() => setExpandedChild(isExpanded ? null : String(child._id))}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <span className="font-semibold text-[#15436b]">
                            {child.firstName} {child.lastName}
                          </span>
                          {child.parent && (
                            <span className="ml-2 text-xs text-gray-400">
                              {child.secondParent ? "Parents: " : "Parent: "}
                              {child.parent.firstName} {child.parent.lastName}
                              {child.secondParent && (
                                <>{" & "}{child.secondParent.firstName} {child.secondParent.lastName}</>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">
                            {child.summary.completedCount}/{child.summary.totalLessons} lessons completed
                          </span>
                          {pct !== null && (
                            <span
                              className={`font-medium ${
                                pct >= 80
                                  ? "text-green-600"
                                  : pct >= 50
                                  ? "text-yellow-600"
                                  : "text-red-500"
                              }`}
                            >
                              {pct}% avg score
                            </span>
                          )}
                          <span className="text-gray-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50 p-4 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                                <th className="text-left pb-2 font-medium">Lesson</th>
                                <th className="text-left pb-2 font-medium">Week</th>
                                <th className="text-center pb-2 font-medium">Status</th>
                                <th className="text-center pb-2 font-medium">Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {child.lessons.map((lp, i) => {
                                const lpct = scorePercent(lp.quizScore, lp.totalQuestions);
                                return (
                                  <tr key={i} className="border-b border-gray-100 last:border-0">
                                    <td className="py-2 text-gray-800">{lp.lesson.title}</td>
                                    <td className="py-2 text-gray-500 whitespace-nowrap">
                                      {formatWeek(lp.lesson.weekOf)}
                                    </td>
                                    <td className="py-2 text-center">
                                      {lp.completed ? (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                          Completed
                                        </span>
                                      ) : (
                                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                          Not started
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 text-center">
                                      {lp.completed ? (
                                        <span
                                          className={`font-medium ${
                                            lpct >= 80
                                              ? "text-green-600"
                                              : lpct >= 50
                                              ? "text-yellow-600"
                                              : "text-red-500"
                                          }`}
                                        >
                                          {lp.quizScore}/{lp.totalQuestions} ({lpct}%)
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

