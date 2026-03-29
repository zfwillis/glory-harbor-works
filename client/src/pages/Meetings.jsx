import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const emptyForm = {
  pastorId: "",
  scheduledFor: "",
  location: "",
  notes: "",
};

const formatMeetingDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getMinutesFromTimeString = (value = "") => {
  const [hours, minutes] = String(value).split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return -1;
  }

  return hours * 60 + minutes;
};

const isWithinPastorAvailability = (scheduledForValue, availability = []) => {
  if (!scheduledForValue) {
    return true;
  }

  const scheduledFor = new Date(scheduledForValue);
  if (Number.isNaN(scheduledFor.getTime())) {
    return false;
  }

  if (!Array.isArray(availability) || availability.length === 0) {
    return false;
  }

  const dayName = scheduledFor.toLocaleDateString("en-US", { weekday: "long" });
  const scheduledMinutes = scheduledFor.getHours() * 60 + scheduledFor.getMinutes();

  return availability.some((slot) => {
    if (!slot || slot.day !== dayName) {
      return false;
    }

    const startMinutes = getMinutesFromTimeString(slot.start);
    const endMinutes = getMinutesFromTimeString(slot.end);

    if (startMinutes < 0 || endMinutes < 0) {
      return false;
    }

    return scheduledMinutes >= startMinutes && scheduledMinutes <= endMinutes;
  });
};

const getStatusClasses = (status = "") => {
  const normalizedStatus = String(status).toLowerCase();

  if (normalizedStatus === "approved") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (normalizedStatus === "declined") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
};

export default function Meetings() {
  const { token, user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [pastors, setPastors] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPastors, setLoadingPastors] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [editingMeetingId, setEditingMeetingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [availabilityModalMessage, setAvailabilityModalMessage] = useState("");

  const selectedPastor = useMemo(
    () => pastors.find((pastor) => pastor._id === form.pastorId || pastor.id === form.pastorId),
    [form.pastorId, pastors]
  );
  const selectedPastorAvailability = Array.isArray(selectedPastor?.availability)
    ? selectedPastor.availability
    : [];

  const loadPastors = async () => {
    try {
      setLoadingPastors(true);
      const response = await fetch(`${API_URL}/users/role/pastor`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load pastors");
      }

      setPastors(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setError(err.message || "Failed to load pastors.");
    } finally {
      setLoadingPastors(false);
    }
  };

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/appointments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load meetings");
      }

      setMeetings(Array.isArray(data.appointments) ? data.appointments : []);
    } catch (err) {
      setError(err.message || "Failed to load meetings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    loadPastors();
    loadMeetings();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setMessage("");
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingMeetingId("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.pastorId) {
      setError("Please choose a pastor.");
      return;
    }

    if (!form.scheduledFor) {
      setError("Please choose a meeting date and time.");
      return;
    }

    if (!selectedPastor) {
      setError("Please choose a valid pastor.");
      return;
    }

    if (!isWithinPastorAvailability(form.scheduledFor, selectedPastorAvailability)) {
      setAvailabilityModalMessage(
        "You can't schedule this meeting because the selected time is outside the pastor's availability."
      );
      return;
    }

    try {
      setSaving(true);
      const endpoint = editingMeetingId
        ? `${API_URL}/appointments/${editingMeetingId}`
        : `${API_URL}/appointments`;
      const method = editingMeetingId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save meeting");
      }

      setMessage(editingMeetingId ? "Meeting updated successfully." : "Meeting scheduled successfully.");
      resetForm();
      await loadMeetings();
    } catch (err) {
      setError(err.message || "Failed to save meeting.");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (meeting) => {
    setEditingMeetingId(meeting._id);
    setForm({
      pastorId: meeting.pastorId?._id || meeting.pastorId?.id || "",
      scheduledFor: meeting.scheduledFor ? new Date(meeting.scheduledFor).toISOString().slice(0, 16) : "",
      location: meeting.location || "",
      notes: meeting.notes || "",
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditing = () => {
    resetForm();
    setError("");
    setMessage("");
  };

  const deleteMeeting = async (meetingId) => {
    const shouldDelete = window.confirm("Cancel this meeting?");
    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingId(meetingId);
      setError("");
      setMessage("");

      const response = await fetch(`${API_URL}/appointments/${meetingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not cancel meeting");
      }

      setMeetings((prev) => prev.filter((meeting) => meeting._id !== meetingId));
      if (editingMeetingId === meetingId) {
        resetForm();
      }
      setMessage("Meeting cancelled successfully.");
    } catch (err) {
      setError(err.message || "Failed to cancel meeting.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      {availabilityModalMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900">Scheduling Unavailable</h2>
            <p className="mt-3 text-sm text-gray-700">{availabilityModalMessage}</p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setAvailabilityModalMessage("")}
                className="rounded-lg bg-[#15436b] px-5 py-2.5 font-semibold text-white transition hover:bg-[#1b5385]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-[#15436b]">Meetings</h1>
        <p className="mt-3 text-gray-700">
          Schedule a one-on-one meeting with a pastor, then review, update, or cancel it here.
        </p>
      </div>

      {message && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingMeetingId ? "Update Meeting" : "Schedule Meeting"}
          </h2>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="pastorId" className="mb-1 block text-sm font-medium text-gray-700">
                Pastor
              </label>
              <select
                id="pastorId"
                name="pastorId"
                value={form.pastorId}
                onChange={handleChange}
                disabled={loadingPastors}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
                required
              >
                <option value="">{loadingPastors ? "Loading pastors..." : "Select a pastor"}</option>
                {pastors.map((pastor) => (
                  <option key={pastor._id || pastor.id} value={pastor._id || pastor.id}>
                    {pastor.firstName} {pastor.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="scheduledFor" className="mb-1 block text-sm font-medium text-gray-700">
                Date and Time
              </label>
              <input
                id="scheduledFor"
                name="scheduledFor"
                type="datetime-local"
                value={form.scheduledFor}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
                required
              />
              {selectedPastor && selectedPastorAvailability.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  This pastor has not added availability yet, so you cannot request a meeting time.
                </p>
              )}
              {selectedPastor &&
                selectedPastorAvailability.length > 0 &&
                form.scheduledFor &&
                !isWithinPastorAvailability(form.scheduledFor, selectedPastorAvailability) && (
                  <p className="mt-1 text-xs text-red-600">
                    The selected time is outside this pastor&apos;s availability.
                  </p>
                )}
            </div>

            <div>
              <label htmlFor="location" className="mb-1 block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                id="location"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Church office, phone, Zoom, etc."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
                maxLength={120}
              />
            </div>

            <div>
              <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                value={form.notes}
                onChange={handleChange}
                placeholder="Share any context for the meeting."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
                maxLength={1000}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={
                  saving ||
                  loadingPastors ||
                  (selectedPastor && selectedPastorAvailability.length === 0)
                }
                className="rounded-lg bg-[#15436b] px-5 py-2.5 font-semibold text-white transition hover:bg-[#1b5385] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : editingMeetingId ? "Save Changes" : "Schedule Meeting"}
              </button>
              {editingMeetingId && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        <aside className="rounded-2xl border border-gray-200 bg-[#f8fbfd] p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Selected Pastor</h2>
          {!selectedPastor ? (
            <p className="mt-3 text-gray-600">Choose a pastor to see who you are scheduling with.</p>
          ) : (
            <div className="mt-4">
              <p className="text-lg font-semibold text-[#15436b]">
                {selectedPastor.firstName} {selectedPastor.lastName}
              </p>
              {selectedPastor.email && <p className="mt-1 text-sm text-gray-600">{selectedPastor.email}</p>}
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-900">Availability</p>
                {selectedPastorAvailability.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-600">No availability has been added yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {selectedPastorAvailability.map((slot, index) => (
                      <li key={`${slot.day}-${slot.start}-${slot.end}-${index}`}>
                        {slot.day}: {slot.start} - {slot.end}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="mt-3 text-sm text-gray-600">
                New or edited meetings are submitted with a <span className="font-semibold">pending</span> status.
              </p>
            </div>
          )}
        </aside>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Your Scheduled Meetings</h2>

        {loading && <p className="mt-4 text-gray-600">Loading your meetings...</p>}

        {!loading && meetings.length === 0 && (
          <p className="mt-4 text-gray-600">You have not scheduled any meetings yet.</p>
        )}

        {!loading && meetings.length > 0 && (
          <div className="mt-4 space-y-4">
            {meetings.map((meeting) => {
              const pastor = meeting.pastorId || {};
              const pastorName = [pastor.firstName, pastor.lastName].filter(Boolean).join(" ").trim() || "The pastor";

              return (
                <article key={meeting._id} className="rounded-xl border border-gray-200 bg-[#f8fbfd] p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-[#15436b]">
                        {pastor.firstName} {pastor.lastName}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {formatMeetingDate(meeting.scheduledFor)}
                      </p>
                      {meeting.topic && <p className="mt-2 text-sm text-gray-800">Topic: {meeting.topic}</p>}
                      {meeting.location && (
                        <p className="mt-1 text-sm text-gray-800">Location: {meeting.location}</p>
                      )}
                      {meeting.notes && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{meeting.notes}</p>
                      )}
                      {meeting.status === "declined" && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          {pastorName} has declined your meeting. You can edit it and send a new request, or cancel it.
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span
                          className={`rounded-full border px-3 py-1 text-sm font-semibold capitalize ${getStatusClasses(
                            meeting.status
                          )}`}
                        >
                          Status: {meeting.status}
                        </span>
                        <span>Requested: {formatMeetingDate(meeting.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(meeting)}
                        disabled={deletingId === meeting._id}
                        className="rounded-lg border border-[#15436b] px-3 py-2 text-sm font-semibold text-[#15436b] transition hover:bg-[#eaf3fb] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMeeting(meeting._id)}
                        disabled={deletingId === meeting._id}
                        className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {deletingId === meeting._id ? "Cancelling..." : "Cancel"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
