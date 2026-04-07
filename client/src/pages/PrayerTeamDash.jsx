import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import DashboardSwitcher from "../components/DashboardSwitcher";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const STATUS_OPTIONS = [
  {
    value: "new",
    label: "New",
    color: "bg-blue-50 text-blue-700",
    panel: "border-blue-100 bg-blue-50/70",
    dot: "bg-blue-400",
  },
  {
    value: "in_progress",
    label: "In Progress",
    color: "bg-amber-50 text-amber-700",
    panel: "border-amber-100 bg-amber-50/70",
    dot: "bg-amber-400",
  },
  {
    value: "answered",
    label: "Answered",
    color: "bg-green-50 text-green-700",
    panel: "border-green-100 bg-green-50/70",
    dot: "bg-green-400",
  },
];

const statusMeta = (status) => STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

export default function PrayerTeamDash({ embedded = false, hideHeader = false }) {
  const { token, user } = useAuth();
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchPrayers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/prayers/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load prayers");
      setPrayers(data.prayers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrayers();
  }, [token]);

  const handleStatusChange = async (prayerId, newStatus) => {
    setMessage("");
    setError("");
    setUpdatingId(prayerId);
    try {
      const res = await fetch(`${API_URL}/prayers/${prayerId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update status");
      setPrayers((prev) => prev.map((p) => (p._id === prayerId ? { ...p, status: newStatus } : p)));
      setMessage("Prayer request status updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = filterStatus === "all" ? prayers : prayers.filter((p) => p.status === filterStatus);
  const visibleStatuses = filterStatus === "all" ? STATUS_OPTIONS.map((s) => s.value) : [filterStatus];

  const prayersByStatus = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status.value] = filtered.filter((p) => p.status === status.value);
    return acc;
  }, {});

  const counts = {
    all: prayers.length,
    new: prayers.filter((p) => p.status === "new").length,
    in_progress: prayers.filter((p) => p.status === "in_progress").length,
    answered: prayers.filter((p) => p.status === "answered").length,
  };

  const content = (
    <>
        {!hideHeader && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#15436b]">Submitted Prayer Requests</h1>
            <p className="text-gray-500 mt-1">Welcome, {user?.firstName}. Track and support prayer requests.</p>
          </div>
        )}

        {!embedded && <DashboardSwitcher />}

        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { key: "all", label: "Total", color: "text-[#15436b]" },
            { key: "new", label: "New", color: "text-blue-500" },
            { key: "in_progress", label: "In Progress", color: "text-amber-500" },
            { key: "answered", label: "Answered", color: "text-green-500" },
          ].map(({ key, label, color }) => (
            <div key={key} className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-100">
              <p className={`text-3xl font-bold ${color}`}>{counts[key]}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {message && <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">{message}</div>}
        {error && <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { key: "all", label: "All" },
            { key: "new", label: "New" },
            { key: "in_progress", label: "In Progress" },
            { key: "answered", label: "Answered" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterStatus === key
                  ? "bg-[#15436b] text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-[#15436b]"
              }`}
            >
              {label} <span className="text-xs opacity-70">({counts[key] ?? 0})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-500 border border-gray-100">Loading prayer requests...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-500 border border-gray-100">No prayer requests found.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {visibleStatuses.map((status) => {
              const meta = statusMeta(status);
              const items = prayersByStatus[status] || [];

              return (
                <section key={status} className={`rounded-2xl border ${meta.panel} p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-[#15436b] flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden="true" />
                      {meta.label}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white text-gray-700 border border-gray-200">
                      {items.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-xs text-gray-500 text-center">
                        No requests in this column.
                      </div>
                    ) : (
                      items.map((p) => {
                        const isAnon = !p.createdBy;
                        return (
                          <article key={p._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <p className="text-gray-800 text-sm leading-relaxed">{p.text}</p>

                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <span className="text-[11px] text-gray-400">
                                {new Date(p.createdAt).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              {isAnon ? (
                                <span className="text-[11px] text-gray-400 italic">Anonymous</span>
                              ) : (
                                <span className="text-[11px] text-gray-500">
                                  {p.createdBy?.firstName} {p.createdBy?.lastName}
                                </span>
                              )}
                            </div>

                            <div className="mt-3">
                              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                                Update Status
                              </label>
                              <select
                                value={p.status}
                                onChange={(e) => handleStatusChange(p._id, e.target.value)}
                                disabled={updatingId === p._id}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#15436b] focus:border-transparent disabled:opacity-50"
                              >
                                {STATUS_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
    </>
  );

  if (embedded) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-6 lg:p-8 shadow-sm">{content}</div>;
  }

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-4xl mx-auto">{content}</div>
    </div>
  );
}
