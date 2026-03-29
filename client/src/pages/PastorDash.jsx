import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const emptySlot = { day: "Monday", start: "09:00", end: "17:00" };

const formatDateTime = (value) => {
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

export default function PastorDash() {
  const { token, user, setUser } = useAuth();
  const normalizedRole = String(user?.role || "").trim().toLowerCase();
  const [availability, setAvailability] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [statusBusyById, setStatusBusyById] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setAvailability(Array.isArray(user?.availability) ? user.availability : []);
  }, [user]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/appointments/pastor`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load pastor schedule");
      }

      setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
    } catch (err) {
      setError(err.message || "Failed to load pastor schedule.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || normalizedRole !== "pastor") {
      return;
    }

    loadAppointments();
  }, [token, normalizedRole]);

  const pendingAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === "pending"),
    [appointments]
  );

  const scheduledAppointments = useMemo(
    () =>
      appointments.filter((appointment) =>
        ["approved", "pending", "completed", "cancelled", "declined"].includes(appointment.status)
      ),
    [appointments]
  );

  const addAvailabilitySlot = () => {
    setAvailability((prev) => [...prev, { ...emptySlot }]);
  };

  const updateAvailabilitySlot = (index, field, value) => {
    setAvailability((prev) =>
      prev.map((slot, slotIndex) => (slotIndex === index ? { ...slot, [field]: value } : slot))
    );
    setError("");
    setMessage("");
  };

  const removeAvailabilitySlot = (index) => {
    setAvailability((prev) => prev.filter((_, slotIndex) => slotIndex !== index));
    setError("");
    setMessage("");
  };

  const saveAvailability = async () => {
    if (!user?._id && !user?.id) {
      return;
    }

    try {
      setSavingAvailability(true);
      setError("");
      setMessage("");

      const sanitizedAvailability = availability
        .filter((slot) => slot.day && slot.start && slot.end)
        .map((slot) => ({
          day: slot.day,
          start: slot.start,
          end: slot.end,
        }));

      const userId = user.id || user._id;
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ availability: sanitizedAvailability }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save availability");
      }

      setAvailability(Array.isArray(data.user?.availability) ? data.user.availability : []);
      if (setUser) {
        setUser((prev) => ({ ...prev, ...data.user }));
      }
      setMessage("Availability updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to save availability.");
    } finally {
      setSavingAvailability(false);
    }
  };

  const updateMeetingStatus = async (meetingId, status) => {
    try {
      setStatusBusyById((prev) => ({ ...prev, [meetingId]: true }));
      setError("");
      setMessage("");

      const response = await fetch(`${API_URL}/appointments/${meetingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update meeting status");
      }

      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment._id === meetingId ? { ...appointment, ...data.appointment } : appointment
        )
      );
      setMessage(
        status === "approved"
          ? "Meeting approved."
          : status === "declined"
          ? "Meeting declined."
          : "Meeting cancelled."
      );
    } catch (err) {
      setError(err.message || "Failed to update meeting status.");
    } finally {
      setStatusBusyById((prev) => ({ ...prev, [meetingId]: false }));
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-[#15436b]">Pastor Dashboard</h1>
        <p className="mt-3 text-gray-700">
          Manage your availability, respond to meeting requests, and review your schedule.
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

      <div className="mt-8 grid gap-8 xl:grid-cols-[0.95fr,1.05fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Availability</h2>
              <p className="mt-1 text-sm text-gray-600">Set the times members can request meetings with you.</p>
            </div>
            <button
              type="button"
              onClick={addAvailabilitySlot}
              className="rounded-lg border border-[#15436b] px-4 py-2 text-sm font-semibold text-[#15436b] transition hover:bg-[#eaf3fb]"
            >
              Add Slot
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {availability.length === 0 && (
              <p className="text-sm text-gray-600">No availability slots saved yet.</p>
            )}

            {availability.map((slot, index) => (
              <div key={`${slot.day}-${slot.start}-${index}`} className="grid gap-3 rounded-xl border border-gray-200 bg-[#f8fbfd] p-4 md:grid-cols-[1fr,1fr,1fr,auto]">
                <select
                  value={slot.day}
                  onChange={(e) => updateAvailabilitySlot(index, "day", e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
                >
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={slot.start}
                  onChange={(e) => updateAvailabilitySlot(index, "start", e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
                />
                <input
                  type="time"
                  value={slot.end}
                  onChange={(e) => updateAvailabilitySlot(index, "end", e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
                />
                <button
                  type="button"
                  onClick={() => removeAvailabilitySlot(index)}
                  className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={saveAvailability}
              disabled={savingAvailability}
              className="rounded-lg bg-[#15436b] px-5 py-2.5 font-semibold text-white transition hover:bg-[#1b5385] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingAvailability ? "Saving..." : "Save Availability"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Pending Requests</h2>
          <p className="mt-1 text-sm text-gray-600">Approve or decline incoming meeting requests.</p>

          {loading && <p className="mt-4 text-gray-600">Loading requests...</p>}
          {!loading && pendingAppointments.length === 0 && (
            <p className="mt-4 text-sm text-gray-600">No pending meeting requests right now.</p>
          )}

          {!loading && pendingAppointments.length > 0 && (
            <div className="mt-4 space-y-4">
              {pendingAppointments.map((appointment) => {
                const member = appointment.memberId || {};
                const isBusy = Boolean(statusBusyById[appointment._id]);

                return (
                  <article key={appointment._id} className="rounded-xl border border-gray-200 bg-[#f8fbfd] p-4">
                    <p className="text-lg font-semibold text-[#15436b]">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="mt-1 text-sm text-gray-700">{formatDateTime(appointment.scheduledFor)}</p>
                    {appointment.topic && <p className="mt-2 text-sm text-gray-800">Topic: {appointment.topic}</p>}
                    {appointment.location && (
                      <p className="mt-1 text-sm text-gray-800">Location: {appointment.location}</p>
                    )}
                    {appointment.notes && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{appointment.notes}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateMeetingStatus(appointment._id, "approved")}
                        disabled={isBusy}
                        className="rounded-lg bg-[#15436b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b5385] disabled:opacity-70"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateMeetingStatus(appointment._id, "declined")}
                        disabled={isBusy}
                        className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-70"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => updateMeetingStatus(appointment._id, "cancelled")}
                        disabled={isBusy}
                        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-70"
                      >
                        Cancel
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Schedule</h2>
        <p className="mt-1 text-sm text-gray-600">Review all meetings assigned to you.</p>

        {loading && <p className="mt-4 text-gray-600">Loading your schedule...</p>}

        {!loading && scheduledAppointments.length === 0 && (
          <p className="mt-4 text-gray-600">You do not have any meetings yet.</p>
        )}

        {!loading && scheduledAppointments.length > 0 && (
          <div className="mt-4 space-y-4">
            {scheduledAppointments.map((appointment) => {
              const member = appointment.memberId || {};
              const canCancel = appointment.status !== "cancelled" && appointment.status !== "declined";

              return (
                <article key={appointment._id} className="rounded-xl border border-gray-200 bg-[#f8fbfd] p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-[#15436b]">
                        {member.firstName} {member.lastName}
                      </p>
                      {member.email && <p className="mt-1 text-sm text-gray-600">{member.email}</p>}
                      <p className="mt-2 text-sm text-gray-700">{formatDateTime(appointment.scheduledFor)}</p>
                      {appointment.topic && <p className="mt-2 text-sm text-gray-800">Topic: {appointment.topic}</p>}
                      {appointment.location && (
                        <p className="mt-1 text-sm text-gray-800">Location: {appointment.location}</p>
                      )}
                      {appointment.notes && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{appointment.notes}</p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span>Status: {appointment.status}</span>
                        <span>Requested: {formatDateTime(appointment.createdAt)}</span>
                      </div>
                    </div>

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => updateMeetingStatus(appointment._id, "cancelled")}
                        disabled={statusBusyById[appointment._id]}
                        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-70"
                      >
                        Cancel Meeting
                      </button>
                    )}
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
