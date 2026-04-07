import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const CALENDLY_SCHEDULED_EVENTS_URL = "https://calendly.com/app/scheduled_events";

const createEmbedUrl = (schedulingUrl = "") => {
  if (!schedulingUrl) {
    return "";
  }

  try {
    const url = new URL(schedulingUrl);
    url.searchParams.set("hide_event_type_details", "1");
    url.searchParams.set("hide_gdpr_banner", "1");
    return url.toString();
  } catch {
    return schedulingUrl;
  }
};

const formatDateTime = (value) => {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function Meetings() {
  const { token, user } = useAuth();
  const [eventTypes, setEventTypes] = useState([]);
  const [calendlyMeetings, setCalendlyMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [error, setError] = useState("");
  const [meetingsError, setMeetingsError] = useState("");
  const [selectedEventUri, setSelectedEventUri] = useState("");
  const [approvedByUri, setApprovedByUri] = useState({});

  const selectedEventType = useMemo(
    () => eventTypes.find((eventType) => eventType.uri === selectedEventUri) || eventTypes[0] || null,
    [eventTypes, selectedEventUri]
  );

  const normalizedRole = String(user?.role || "").trim().toLowerCase();
  const isPastoralAccount = normalizedRole === "pastor";
  const isMemberAccount = normalizedRole === "member";

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadCalendlyData = async () => {
      try {
        setLoading(true);
        setError("");
        setMeetingsLoading(true);
        setMeetingsError("");

        const [eventTypesResult, meetingsResult] = await Promise.allSettled([
          fetch(`${API_URL}/calendly/event-types`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/calendly/meetings`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (eventTypesResult.status !== "fulfilled") {
          throw new Error("Could not load Calendly event types.");
        }

        const eventTypeResponse = eventTypesResult.value;
        const eventTypeData = await eventTypeResponse.json();
        if (!eventTypeResponse.ok) {
          throw new Error(eventTypeData.message || "Could not load Calendly events");
        }

        const availableEventTypes = Array.isArray(eventTypeData.eventTypes) ? eventTypeData.eventTypes : [];
        setEventTypes(availableEventTypes);

        if (meetingsResult.status === "fulfilled") {
          const meetingsResponse = meetingsResult.value;
          const meetingsData = await meetingsResponse.json();

          if (!meetingsResponse.ok) {
            setMeetingsError(meetingsData.message || "Could not load meetings right now.");
            setCalendlyMeetings([]);
          } else {
            const availableMeetings = Array.isArray(meetingsData.meetings) ? meetingsData.meetings : [];
            setCalendlyMeetings(availableMeetings);
          }
        } else {
          setMeetingsError("Could not load meetings right now.");
          setCalendlyMeetings([]);
        }

        if (availableEventTypes.length > 0) {
          setSelectedEventUri(availableEventTypes[0].uri || "");
        }
      } catch (fetchError) {
        setError(fetchError.message || "Failed to load Calendly data.");
      } finally {
        setLoading(false);
        setMeetingsLoading(false);
      }
    };

    loadCalendlyData();
  }, [token, normalizedRole]);

  const selectedSchedulingUrl = selectedEventType?.schedulingUrl || "";
  const embedUrl = createEmbedUrl(selectedSchedulingUrl);
  const showPastorVictorCard = !isPastoralAccount;

  const getCalendlyMeetingCounterparty = (meeting) => {
    const hosts = Array.isArray(meeting.hosts) ? meeting.hosts : [];
    const invitees = Array.isArray(meeting.invitees) ? meeting.invitees : [];

    if (isPastoralAccount) {
      return invitees.map((invitee) => invitee.name || invitee.email).filter(Boolean).join(", ") || "Member";
    }

    return hosts.map((host) => host.name || host.email).filter(Boolean).join(", ") || "Pastor";
  };

  const handleLocalApprove = (meetingUri) => {
    if (!meetingUri) {
      return;
    }

    setApprovedByUri((prev) => ({ ...prev, [meetingUri]: true }));
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-[#15436b]">Pastoral Meetings</h1>
        <p className="mt-3 text-gray-700">
          {isPastoralAccount
            ? user?.firstName
              ? `Welcome, Pastor ${user.firstName}! View your scheduled Calendly meetings here.`
              : "Welcome, Pastor! View your scheduled Calendly meetings here."
            : user?.firstName
            ? `Welcome, ${user.firstName}! Book and manage your scheduled meetings here.`
            : "Welcome. Book and manage your scheduled meetings here."}
        </p>

        {showPastorVictorCard && (
          <div className="mt-5 flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <img
              src="/pastorvictor.jpg"
              alt="Pastor Victor"
              className="h-16 w-16 rounded-full object-cover ring-2 ring-[#15436b]/20"
              loading="lazy"
            />
            <div>
              <p className="text-lg font-semibold text-[#15436b]">Schedule a Meeting with Pastor Victor</p>
            </div>
          </div>
        )}
      </div>

      {error && <div className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      {!isPastoralAccount && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[360px,1fr]">
          <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">Calendly Meeting Types</h2>

            {loading && <p className="mt-4 text-gray-600">Loading Calendly meeting types...</p>}

            {!loading && eventTypes.length === 0 && (
              <p className="mt-4 text-sm text-gray-600">
                No Calendly event types are available yet. Ask an admin to configure Calendly event types.
              </p>
            )}

            {!loading && eventTypes.length > 0 && (
              <div className="mt-4 space-y-3">
                {eventTypes.map((eventType) => {
                  const isSelected = selectedEventType?.uri === eventType.uri;

                  return (
                    <button
                      key={eventType.uri || eventType.slug}
                      type="button"
                      onClick={() => setSelectedEventUri(eventType.uri)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-[#15436b] bg-[#eaf3fb]"
                          : "border-gray-200 bg-white hover:border-[#15436b]/40 hover:bg-[#f7fbff]"
                      }`}
                    >
                      <p className="font-semibold text-[#15436b]">{eventType.name}</p>
                      {eventType.duration && <p className="mt-1 text-sm text-gray-600">{eventType.duration} minutes</p>}
                      {eventType.hostName && <p className="mt-1 text-sm text-gray-600">Scheduling with: {eventType.hostName}</p>}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedSchedulingUrl && (
              <div className="mt-5 space-y-2">
                <a
                  className="inline-flex w-full items-center justify-center rounded-lg bg-[#15436b] px-4 py-2.5 font-semibold text-white transition hover:bg-[#1b5385]"
                  href={selectedSchedulingUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Booking Page
                </a>
              </div>
            )}
          </aside>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900">Calendly Booking Preview</h2>

            {selectedEventType?.hostName && (
              <p className="mt-2 text-sm text-gray-600">
                You are scheduling with <span className="font-semibold text-gray-800">{selectedEventType.hostName}</span>.
              </p>
            )}

            {!loading && !selectedSchedulingUrl && (
              <p className="mt-3 text-sm text-gray-600">Select a meeting type to preview what members can book.</p>
            )}

            {selectedSchedulingUrl && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                <iframe title="Calendly Scheduler" src={embedUrl} className="h-[760px] w-full" loading="lazy" />
              </div>
            )}
          </div>
        </div>
      )}

      {isPastoralAccount && (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-700">
            This page shows meetings scheduled with you. To adjust your booking windows, update your availability in Calendly.
          </p>
          <a
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-[#15436b] px-4 py-2.5 font-semibold text-[#15436b] transition hover:bg-[#eaf3fb]"
            href="https://calendly.com/app/availability"
            target="_blank"
            rel="noreferrer"
          >
            Set Availability in Calendly
          </a>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">{isPastoralAccount ? "My Calendly Meetings" : "My Scheduled Meetings"}</h2>

        {meetingsError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{meetingsError}</div>
        )}

        {meetingsLoading && <p className="mt-4 text-gray-600">Loading your meetings...</p>}

        {!meetingsLoading && calendlyMeetings.length === 0 && (
          <p className="mt-4 text-sm text-gray-600">
            {isPastoralAccount ? "No Calendly meetings are currently scheduled with you." : "You do not have any scheduled Calendly meetings yet."}
          </p>
        )}

        {!meetingsLoading && calendlyMeetings.length > 0 && (
          <div className="mt-4 space-y-3">
            {calendlyMeetings.map((meeting) => {
              const memberUpdateUrl = meeting.memberRescheduleUrl || meeting.rescheduleUrl || "";
              const memberDeleteUrl = meeting.memberCancelUrl || meeting.cancelUrl || "";
              const pastorDeclineUrl = meeting.cancelUrl || CALENDLY_SCHEDULED_EVENTS_URL;
              const pastorCancelUrl = meeting.cancelUrl || CALENDLY_SCHEDULED_EVENTS_URL;
              const isLocallyApproved = !!approvedByUri[meeting.uri];

              return (
                <article key={meeting.uri || `${meeting.startTime}-${meeting.name}`} className="rounded-xl border border-gray-200 p-4">
                  <p className="font-semibold text-[#15436b]">{meeting.name || "Meeting"}</p>
                  <p className="mt-1 text-sm text-gray-700">{formatDateTime(meeting.startTime)}</p>
                  <p className="mt-1 text-sm text-gray-700">
                    {isPastoralAccount ? "Scheduled by" : "Meeting with"}: {getCalendlyMeetingCounterparty(meeting)}
                  </p>
                  {meeting.status && <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">Status: {meeting.status}</p>}
                  {isPastoralAccount && !isLocallyApproved && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleLocalApprove(meeting.uri)}
                        className="rounded-md border border-emerald-300 px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-50"
                      >
                        Approve
                      </button>
                      <a
                        href={pastorDeclineUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-amber-300 px-3 py-1 text-sm text-amber-700 hover:bg-amber-50"
                      >
                        Decline
                      </a>
                    </div>
                  )}

                  {isPastoralAccount && isLocallyApproved && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={pastorCancelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                      >
                        Cancel Meeting
                      </a>
                    </div>
                  )}

                  {isMemberAccount && (memberUpdateUrl || memberDeleteUrl) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {memberUpdateUrl && (
                        <a
                          href={memberUpdateUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                        >
                          Reschedule
                        </a>
                      )}
                      {memberDeleteUrl && (
                        <a
                          href={memberDeleteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                        >
                          Cancel Meeting
                        </a>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
