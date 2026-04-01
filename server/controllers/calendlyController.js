import User from "../models/User.js";

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

const getEventUuid = (uri = "") => {
  const parts = String(uri).split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
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
  if (process.env.CALENDLY_USER_URI) {
    return process.env.CALENDLY_USER_URI;
  }

  const response = await fetch(`${CALENDLY_BASE_URL}/users/me`, { headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to load Calendly user");
  }

  return data.resource?.uri || "";
};

export const getCalendlyEventTypes = async (req, res) => {
  const headers = buildCalendlyHeaders();

  if (!headers) {
    return res.status(500).json({
      message: "Calendly is not configured on the server.",
    });
  }

  try {
    const configuredOrgUri = process.env.CALENDLY_ORGANIZATION_URI;
    const ownerUserUri = await getUserUri(headers);

    const eventTypeUrl = new URL(`${CALENDLY_BASE_URL}/event_types`);
    eventTypeUrl.searchParams.set("active", "true");
    eventTypeUrl.searchParams.set("count", "100");
    eventTypeUrl.searchParams.set("sort", "name:asc");

    if (ownerUserUri) {
      eventTypeUrl.searchParams.set("user", ownerUserUri);
    } else if (configuredOrgUri) {
      eventTypeUrl.searchParams.set("organization", configuredOrgUri);
    }

    const response = await fetch(eventTypeUrl, { headers });
    const data = await response.json();

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

    const configuredOrgUri = process.env.CALENDLY_ORGANIZATION_URI;
    const ownerUserUri = await getUserUri(headers);
    const normalizedRole = toLower(appUser.role);
    const isPastoralAccount = normalizedRole === "pastor";
    const userEmail = toLower(appUser.email);

    const scheduledEventsUrl = new URL(`${CALENDLY_BASE_URL}/scheduled_events`);
    scheduledEventsUrl.searchParams.set("count", "25");
    scheduledEventsUrl.searchParams.set("sort", "start_time:desc");
    scheduledEventsUrl.searchParams.set("status", "active");

    if (ownerUserUri) {
      scheduledEventsUrl.searchParams.set("user", ownerUserUri);
    } else if (configuredOrgUri) {
      scheduledEventsUrl.searchParams.set("organization", configuredOrgUri);
    }

    // For members, ask Calendly to pre-filter by invitee email.
    if (!isPastoralAccount && userEmail) {
      scheduledEventsUrl.searchParams.set("invitee_email", userEmail);
    }

    const response = await fetch(scheduledEventsUrl, { headers });
    const data = await response.json();

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

    const queriedByInviteeEmail = !isPastoralAccount && !!scheduledEventsUrl.searchParams.get("invitee_email");

    const meetings =
      isPastoralAccount
        ? hydratedEvents.filter((event) => isHostedByUser(event, appUser))
        : hydratedEvents.filter((event) => {
            if (isBookedByUser(event, appUser)) {
              return true;
            }

            // If Calendly already filtered by invitee_email, keep the event even if invitee expansion was unavailable.
            return queriedByInviteeEmail;
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
