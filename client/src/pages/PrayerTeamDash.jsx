import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import DashboardSwitcher from "../components/DashboardSwitcher";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700" },
  { value: "in_progress", label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  { value: "answered", label: "Answered", color: "bg-green-100 text-green-700" },
];

const statusMeta = (status) => STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

export default function PrayerTeamDash() {
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

  const counts = {
    all: prayers.length,
    new: prayers.filter((p) => p.status === "new").length,
    in_progress: prayers.filter((p) => p.status === "in_progress").length,
    answered: prayers.filter((p) => p.status === "answered").length,
  };

  return (
    <div className="min-h-screen bg-[#f7fff5] py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#15436b]">Prayer Team Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome, {user?.firstName}. Track and support prayer requests.</p>
        </div>

        <DashboardSwitcher />

        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { key: "all", label: "Total", color: "text-[#15436b]" },
            { key: "new", label: "New", color: "text-blue-600" },
            { key: "in_progress", label: "In Progress", color: "text-yellow-600" },
            { key: "answered", label: "Answered", color: "text-green-600" },
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

        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500">Loading prayer requests...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500">No prayer requests found.</div>
          ) : (
            filtered.map((p) => {
              const meta = statusMeta(p.status);
              const isAnon = !p.createdBy;
              return (
                <div key={p._id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 leading-relaxed">{p.text}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-gray-400">
                          {new Date(p.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {isAnon ? (
                          <span className="text-xs text-gray-400 italic">Anonymous</span>
                        ) : (
                          <span className="text-xs text-gray-500">{p.createdBy?.firstName} {p.createdBy?.lastName}</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <select
                        value={p.status}
                        onChange={(e) => handleStatusChange(p._id, e.target.value)}
                        disabled={updatingId === p._id}
                        className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#15436b] focus:border-transparent disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
