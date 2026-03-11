import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function PrayerRequests() {
  const { token } = useAuth();
  const [text, setText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPrayerRequests = async () => {
    if (!token) {
      setLoadingRequests(false);
      return;
    }

    try {
      setLoadingRequests(true);
      const response = await fetch(`${API_URL}/prayers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load prayer requests");
      }

      setRequests(Array.isArray(data.prayers) ? data.prayers : []);
    } catch (err) {
      setError(err.message || "Failed to load prayer requests.");
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }
    loadPrayerRequests();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const trimmedText = text.trim();
    if (!trimmedText) {
      setError("Please enter your prayer request.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${API_URL}/prayers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: trimmedText,
          isAnonymous,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not submit prayer request");
      }

      const createdPrayer = data?.prayer;
      if (createdPrayer?.createdBy) {
        setRequests((prev) => [createdPrayer, ...prev]);
      }

      setMessage(
        isAnonymous
          ? "Prayer request submitted successfully. Anonymous requests are not shown in your personal list."
          : "Prayer request submitted successfully."
      );
      setText("");
      setIsAnonymous(false);
      if (!isAnonymous) {
        await loadPrayerRequests();
      }
    } catch (err) {
      setError(err.message || "Failed to submit prayer request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-[#15436b]">Prayer Requests</h1>
      <p className="mt-3 text-gray-700">
        Share your prayer need and our team will stand with you in prayer.
      </p>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Submit Prayer Request</h2>

        {message && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="prayer-text" className="mb-1 block text-sm font-medium text-gray-700">
              Prayer Request
            </label>
            <textarea
              id="prayer-text"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your prayer request here..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
              maxLength={2000}
              required
            />
            <p className="mt-1 text-xs text-gray-500">{text.length}/2000 characters</p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#15436b] focus:ring-[#15436b]"
            />
            Submit anonymously
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#15436b] px-5 py-2.5 font-semibold text-white transition hover:bg-[#1b5385] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Your Prayer Requests</h2>

        {loadingRequests && <p className="mt-4 text-gray-600">Loading your requests...</p>}

        {!loadingRequests && requests.length === 0 && (
          <p className="mt-4 text-gray-600">You have not submitted any non-anonymous prayer requests yet.</p>
        )}

        {!loadingRequests && requests.length > 0 && (
          <div className="mt-4 space-y-3">
            {requests.map((request) => (
              <article key={request._id} className="rounded-lg border border-gray-200 bg-[#f8fbfd] p-4">
                <p className="text-gray-800 whitespace-pre-wrap">{request.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>Status: {request.status}</span>
                  <span>
                    Submitted: {new Date(request.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
