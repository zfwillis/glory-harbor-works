import User from "../models/User.js";
import CalendlyMeetingAction from "../models/CalendlyMeetingAction.js";

const CALENDLY_BASE_URL = "https://api.calendly.com";
const CALENDLY_VERSION = "2020-08-01";

const buildCalendlyHeaders = () => {
  const token = process.env.CALENDLY_API_TOKEN;

  if (!token) {
    return null;
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Calendly-Version": CALENDLY_VERSION,
  };
};

const mapEventType = (eventType = {}) => ({
  uri: eventType.uri || "",
  name: eventType.name || "Untitled event",
  slug: eventType.slug || "",
  duration: Number.isFinite(eventType.duration) ? eventType.duration : null,
  schedulingUrl: eventType.scheduling_url || "",
  description: eventType.description_plain || eventType.description_html || "",
  color: eventType.color || "",
  kind: eventType.kind || "",
  hostName: eventType.profile?.name || "",
  hostType: eventType.profile?.type || "",
});

const toLower = (value = "") => String(value).trim().toLowerCase();

const sanitizeUri = (value = "") => String(value || "").trim();

const safeReadJson = async (response) => {
  try {
    const raw = await response.text();
    if (!raw) {
      return {};
    }

    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const getFirstConfiguredEnv = (...keys) => {
  for (const key of keys) {
    const value = sanitizeUri(process.env[key]);
    if (value) {
      return value;
    }
  }

  return "";
};

const getEventUuid = (uri = "") => {
  const parts = String(uri).split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
};

const isUpcomingMeeting = (startTime) => {
  const startDate = new Date(startTime || "");
  if (Number.isNaN(startDate.getTime())) {
    return false;
  }

  return startDate.getTime() >= Date.now();
};

const mapHosts = (memberships = []) =>
  Array.isArray(memberships)
    ? memberships.map((membership) => ({
        uri: membership.user || "",
        email: membership.user_email || "",
        name: membership.user_name || "",
      }))
    : [];

const mapInvitees = (invitees = []) =>
  Array.isArray(invitees)
    ? invitees.map((invitee) => ({
        email: invitee.email || "",
        name: invitee.name || "",
        status: invitee.status || "",
        timezone: invitee.timezone || "",
        createdAt: invitee.created_at || "",
        cancelUrl: invitee.cancel_url || "",
        rescheduleUrl: invitee.reschedule_url || "",
      }))
    : [];

const userFullName = (user = {}) => `${user.firstName || ""} ${user.lastName || ""}`.trim();

const isHostedByUser = (event = {}, appUser = {}) => {
  const userEmail = toLower(appUser.email);
  const fullName = toLower(userFullName(appUser));
  const hosts = Array.isArray(event.hosts) ? event.hosts : [];

  return hosts.some((host) => {
    const hostEmail = toLower(host.email);
    const hostName = toLower(host.name);

    if (userEmail && hostEmail === userEmail) {
      return true;
    }

    if (fullName && hostName && hostName.includes(fullName)) {
      return true;
    }

    return false;
  });
};

const isBookedByUser = (event = {}, appUser = {}) => {
  const userEmail = toLower(appUser.email);
  const invitees = Array.isArray(event.invitees) ? event.invitees : [];
  return invitees.some((invitee) => toLower(invitee.email) === userEmail);
};

const getScheduledEventInvitees = async (eventUri, headers) => {
  const uuid = getEventUuid(eventUri);
  if (!uuid) {
    return [];
  }

  const inviteeUrl = new URL(`${CALENDLY_BASE_URL}/scheduled_events/${uuid}/invitees`);
  inviteeUrl.searchParams.set("count", "100");

  try {
    const response = await fetch(inviteeUrl, { headers });
    const data = await response.json();

    if (!response.ok) {
      return [];
    }

    return mapInvitees(data.collection || []);
  } catch {
    return [];
  }
};

const getUserUri = async (headers) => {
  const configuredUserUri = getFirstConfiguredEnv(
    "CALENDLY_USER_URI",
    "CALENDLY_USER",
    "CALENDLY_OWNER_URI"
  );
  if (configuredUserUri) {
    return configuredUserUri;
  }

  try {
    const response = await fetch(`${CALENDLY_BASE_URL}/users/me`, { headers });
    const data = await safeReadJson(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to load Calendly user");
    }

    return sanitizeUri(data.resource?.uri || "");
  } catch (error) {
    // Do not block requests when /users/me fails; callers can fall back to organization-based queries.
    console.warn("Calendly users/me lookup failed, falling back to configured organization URI.", error.message);
    return "";
  }
};

const getOrganizationUri = async (headers, ownerUserUri = "") => {
  const configuredOrgUri = getFirstConfiguredEnv(
    "CALENDLY_ORGANIZATION_URI",
    "CALENDLY_ORGANIZATION",
    "CALENDLY_ORG_URI",
    "CALENDLY_ORG"
  );
  if (configuredOrgUri) {
    return configuredOrgUri;
  }

  // Some Calendly accounts expose current organization directly on /users/me.
  try {
    const response = await fetch(`${CALENDLY_BASE_URL}/users/me`, { headers });
    const data = await safeReadJson(response);

    if (response.ok) {
      const fromUserProfile = sanitizeUri(data.resource?.current_organization || data.resource?.organization || "");
      if (fromUserProfile) {
        return fromUserProfile;
      }
    }
  } catch {
    // Ignore and continue to membership lookup.
  }

  try {
    const membershipsUrl = new URL(`${CALENDLY_BASE_URL}/organization_memberships`);
    membershipsUrl.searchParams.set("count", "100");

    if (ownerUserUri) {
      membershipsUrl.searchParams.set("user", ownerUserUri);
    }

    const response = await fetch(membershipsUrl, { headers });
    const data = await safeReadJson(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to load Calendly organization memberships");
    }

    const firstMembership = Array.isArray(data.collection) ? data.collection[0] : null;
    return sanitizeUri(firstMembership?.organization || "");
  } catch (error) {
    console.warn(
      "Calendly organization membership lookup failed.",
      error.message
    );
    return "";
  }
};

export const getCalendlyEventTypes = async (req, res) => {
  const headers = buildCalendlyHeaders();

  if (!headers) {
    return res.status(500).json({
      message: "Calendly is not configured on the server.",
    });
  }

  try {
    const ownerUserUri = await getUserUri(headers);
    const organizationUri = await getOrganizationUri(headers, ownerUserUri);

    if (!ownerUserUri && !organizationUri) {
      return res.status(200).json({
        count: 0,
        eventTypes: [],
        warning:
          "Calendly could not resolve a user or organization with the current API token. Set CALENDLY_USER_URI or CALENDLY_ORGANIZATION_URI in server/.env.",
      });
    }

    const eventTypeUrl = new URL(`${CALENDLY_BASE_URL}/event_types`);
    eventTypeUrl.searchParams.set("active", "true");
    eventTypeUrl.searchParams.set("count", "100");
    eventTypeUrl.searchParams.set("sort", "name:asc");

    if (ownerUserUri) {
      eventTypeUrl.searchParams.set("user", ownerUserUri);
    } else if (organizationUri) {
      eventTypeUrl.searchParams.set("organization", organizationUri);
    }

    const response = await fetch(eventTypeUrl, { headers });
    const data = await safeReadJson(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to load Calendly event types");
    }

    const eventTypes = Array.isArray(data.collection) ? data.collection.map(mapEventType) : [];

    return res.status(200).json({
      count: eventTypes.length,
      eventTypes,
    });
  } catch (error) {
    console.error("Calendly event type fetch error:", error);
    return res.status(500).json({
      message: "Unable to load Calendly event types right now.",
      error: error.message,
    });
  }
};

export const getCalendlyScheduledMeetings = async (req, res) => {
  const headers = buildCalendlyHeaders();

  if (!headers) {
    return res.status(500).json({
      message: "Calendly is not configured on the server.",
    });
  }

  try {
    const appUser = await User.findById(req.userId).select("email firstName lastName role").lean();

    if (!appUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const ownerUserUri = await getUserUri(headers);
    const organizationUri = await getOrganizationUri(headers, ownerUserUri);

    if (!ownerUserUri && !organizationUri) {
      return res.status(200).json({
        count: 0,
        meetings: [],
        warning:
          "Calendly could not resolve a user or organization with the current API token. Set CALENDLY_USER_URI or CALENDLY_ORGANIZATION_URI in server/.env.",
      });
    }
    const scheduledEventsUrl = new URL(`${CALENDLY_BASE_URL}/scheduled_events`);
    scheduledEventsUrl.searchParams.set("count", "100");
    scheduledEventsUrl.searchParams.set("sort", "start_time:desc");
    scheduledEventsUrl.searchParams.set("status", "active");

    if (ownerUserUri) {
      scheduledEventsUrl.searchParams.set("user", ownerUserUri);
    } else if (organizationUri) {
      scheduledEventsUrl.searchParams.set("organization", organizationUri);
    }

    const response = await fetch(scheduledEventsUrl, { headers });
    const data = await safeReadJson(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to load scheduled events");
    }

    const events = Array.isArray(data.collection) ? data.collection : [];

    const hydratedEvents = await Promise.all(
      events.map(async (event) => {
        const invitees = await getScheduledEventInvitees(event.uri, headers);

        return {
          uri: event.uri || "",
          name: event.name || "Meeting",
          status: event.status || "",
          startTime: event.start_time || "",
          endTime: event.end_time || "",
          location: event.location || {},
          eventType: event.event_type || "",
          cancelUrl: event.cancel_url || "",
          rescheduleUrl: event.reschedule_url || "",
          hosts: mapHosts(event.event_memberships),
          invitees,
          // Member-facing action links come from invitee records in Calendly.
          memberCancelUrl:
            invitees.find((invitee) => toLower(invitee.email) === toLower(appUser.email))?.cancelUrl || "",
          memberRescheduleUrl:
            invitees.find((invitee) => toLower(invitee.email) === toLower(appUser.email))?.rescheduleUrl || "",
        };
      })
    );

    const upcomingMeetings = hydratedEvents.filter((meeting) => isUpcomingMeeting(meeting.startTime));
    const eventUuids = upcomingMeetings.map((meeting) => getEventUuid(meeting.uri)).filter(Boolean);
    const decisions = eventUuids.length
      ? await CalendlyMeetingAction.find({ eventUuid: { $in: eventUuids } })
          .select("eventUuid action updatedAt")
          .lean()
      : [];

    const decisionByEventUuid = new Map(decisions.map((decision) => [decision.eventUuid, decision]));

    const meetings = upcomingMeetings.map((meeting) => {
      const eventUuid = getEventUuid(meeting.uri);
      const decision = eventUuid ? decisionByEventUuid.get(eventUuid) : null;

      return {
        ...meeting,
        pastorDecision: decision?.action || "",
        pastorDecisionUpdatedAt: decision?.updatedAt || "",
      };
    });

    return res.status(200).json({
      count: meetings.length,
      meetings,
    });
  } catch (error) {
    console.error("Calendly meetings fetch error:", error);
    return res.status(500).json({
      message: "Unable to load meetings right now.",
      error: error.message,
    });
  }
};

const cancelCalendlyScheduledEvent = async ({ eventUuid, headers }) => {
  const cancellationUrl = `${CALENDLY_BASE_URL}/scheduled_events/${eventUuid}/cancellation`;
  const response = await fetch(cancellationUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ reason: "Updated by pastoral staff" }),
  });

  const data = await safeReadJson(response);

  if (!response.ok) {
    throw new Error(data.message || "Failed to cancel Calendly meeting");
  }
};

export const updateCalendlyMeetingAction = async (req, res) => {
  const headers = buildCalendlyHeaders();

  if (!headers) {
    return res.status(500).json({
      message: "Calendly is not configured on the server.",
    });
  }

  try {
    const requester = await User.findById(req.userId).select("role").lean();
    if (!requester || toLower(requester.role) !== "pastor") {
      return res.status(403).json({ message: "Pastor access required" });
    }

    const eventUuid = sanitizeUri(req.params.eventUuid || "");
    const actionInput = toLower(req.body?.action || "");
    const meetingUri = sanitizeUri(req.body?.meetingUri || "");

    if (!eventUuid) {
      return res.status(400).json({ message: "Meeting event id is required" });
    }

    const actionMap = {
      approve: "approved",
      approved: "approved",
      decline: "declined",
      declined: "declined",
      cancel: "cancelled",
      cancelled: "cancelled",
      canceled: "cancelled",
    };

    const normalizedAction = actionMap[actionInput];
    if (!normalizedAction) {
      return res.status(400).json({ message: "Invalid meeting action" });
    }

    const existingDecision = await CalendlyMeetingAction.findOne({ eventUuid })
      .select("action")
      .lean();
    const currentAction = existingDecision?.action || "";

    // Workflow: first action must be approve/decline. Cancel is only allowed after approval.
    if (!currentAction) {
      if (normalizedAction === "cancelled") {
        return res.status(400).json({
          message: "Cancel is only allowed after a meeting has been approved.",
        });
      }
    } else if (currentAction === "approved") {
      if (normalizedAction !== "cancelled" && normalizedAction !== "approved") {
        return res.status(400).json({
          message: "Approved meetings can only be cancelled.",
        });
      }
    } else {
      return res.status(400).json({
        message: `This meeting is already ${currentAction} and can no longer be updated.`,
      });
    }

    if (currentAction && currentAction === normalizedAction) {
      return res.status(200).json({
        message: "Meeting action already set.",
        action: currentAction,
        eventUuid,
        updatedAt: new Date().toISOString(),
        meetingStatus: currentAction === "approved" ? "active" : "cancelled",
      });
    }

    if (normalizedAction === "declined" || normalizedAction === "cancelled") {
      await cancelCalendlyScheduledEvent({ eventUuid, headers });
    }

    const saved = await CalendlyMeetingAction.findOneAndUpdate(
      { eventUuid },
      {
        eventUuid,
        meetingUri,
        action: normalizedAction,
        updatedBy: req.userId,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .select("eventUuid action updatedAt")
      .lean();

    return res.status(200).json({
      message: "Meeting action updated successfully",
      action: saved.action,
      eventUuid: saved.eventUuid,
      updatedAt: saved.updatedAt,
      meetingStatus: normalizedAction === "approved" ? "active" : "cancelled",
    });
  } catch (error) {
    console.error("Calendly meeting action update error:", error);
    return res.status(500).json({
      message: "Unable to update meeting action right now.",
      error: error.message,
    });
  }
};
