import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockUser = {
  findById: jest.fn(),
};
const mockCalendlyMeetingAction = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

jest.unstable_mockModule("../../models/User.js", () => ({ default: mockUser }));
jest.unstable_mockModule("../../models/CalendlyMeetingAction.js", () => ({ default: mockCalendlyMeetingAction }));

const {
  getCalendlyEventTypes,
  getCalendlyScheduledMeetings,
  updateCalendlyMeetingAction,
} = await import("../../controllers/calendlyController.js");

const createMockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

const jsonResponse = (body, ok = true) => ({
  ok,
  text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  json: jest.fn().mockResolvedValue(body),
});

const textResponse = (text, ok = true) => ({
  ok,
  text: jest.fn().mockResolvedValue(text),
  json: jest.fn().mockImplementation(async () => (text ? JSON.parse(text) : {})),
});

const mockUserLookup = (user) => {
  mockUser.findById.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(user) }),
  });
};

const mockDecisionFind = (decisions) => {
  mockCalendlyMeetingAction.find.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(decisions) }),
  });
};

const mockExistingDecision = (decision) => {
  mockCalendlyMeetingAction.findOne.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(decision) }),
  });
};

const mockSaveDecision = (decision) => {
  mockCalendlyMeetingAction.findOneAndUpdate.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(decision),
    }),
  });
};

describe("Calendly Controller", () => {
  const originalToken = process.env.CALENDLY_API_TOKEN;
  const originalUserUri = process.env.CALENDLY_USER_URI;
  const originalOrgUri = process.env.CALENDLY_ORGANIZATION_URI;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CALENDLY_API_TOKEN = "token";
    process.env.CALENDLY_USER_URI = "https://api.calendly.com/users/user-1";
    process.env.CALENDLY_ORGANIZATION_URI = "https://api.calendly.com/organizations/org-1";
    global.fetch = jest.fn();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.CALENDLY_API_TOKEN = originalToken;
    process.env.CALENDLY_USER_URI = originalUserUri;
    process.env.CALENDLY_ORGANIZATION_URI = originalOrgUri;
  });

  it("returns configuration error when token is missing", async () => {
    delete process.env.CALENDLY_API_TOKEN;
    const res = createMockRes();

    await getCalendlyEventTypes({}, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toContain("not configured");
  });

  it("maps Calendly event types", async () => {
    global.fetch.mockResolvedValue(
      jsonResponse({
        collection: [
          {
            uri: "event-uri",
            name: "Pastoral Care",
            slug: "pastoral-care",
            duration: 30,
            scheduling_url: "https://calendly.com/test",
            profile: { name: "Pastor Victor", type: "User" },
          },
        ],
      })
    );
    const res = createMockRes();

    await getCalendlyEventTypes({}, res);

    expect(res.body.count).toBe(1);
    expect(res.body.eventTypes[0]).toMatchObject({
      name: "Pastoral Care",
      schedulingUrl: "https://calendly.com/test",
      hostName: "Pastor Victor",
    });
  });

  it("maps default event type values and fallback description", async () => {
    global.fetch.mockResolvedValue(
      jsonResponse({
        collection: [
          {
            description_html: "<p>Details</p>",
            duration: "30",
          },
        ],
      })
    );
    const res = createMockRes();

    await getCalendlyEventTypes({}, res);

    expect(res.body.eventTypes[0]).toMatchObject({
      uri: "",
      name: "Untitled event",
      duration: null,
      description: "<p>Details</p>",
      hostName: "",
    });
  });

  it("uses organization lookup when user uri is unavailable", async () => {
    delete process.env.CALENDLY_USER_URI;
    delete process.env.CALENDLY_ORGANIZATION_URI;
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ message: "no user" }, false))
      .mockResolvedValueOnce(jsonResponse({ resource: { current_organization: "org-from-profile" } }))
      .mockResolvedValueOnce(jsonResponse({ collection: [] }));
    const res = createMockRes();

    await getCalendlyEventTypes({}, res);

    const eventTypeUrl = String(global.fetch.mock.calls[2][0]);
    expect(eventTypeUrl).toContain("organization=org-from-profile");
    expect(res.body.count).toBe(0);
  });

  it("falls back to organization memberships and handles unresolved Calendly owner", async () => {
    delete process.env.CALENDLY_USER_URI;
    delete process.env.CALENDLY_ORGANIZATION_URI;
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ message: "no user" }, false))
      .mockRejectedValueOnce(new Error("profile org failed"))
      .mockResolvedValueOnce(jsonResponse({ collection: [{ organization: "org-from-membership" }] }))
      .mockResolvedValueOnce(jsonResponse({ collection: [] }));
    const membershipRes = createMockRes();

    await getCalendlyEventTypes({}, membershipRes);

    expect(String(global.fetch.mock.calls[3][0])).toContain("organization=org-from-membership");

    global.fetch.mockReset();
    global.fetch
      .mockResolvedValueOnce(textResponse("not-json", false))
      .mockResolvedValueOnce(jsonResponse({ resource: {} }))
      .mockResolvedValueOnce(jsonResponse({ collection: [] }, false));
    const unresolvedRes = createMockRes();

    await getCalendlyEventTypes({}, unresolvedRes);

    expect(unresolvedRes.body.warning).toContain("could not resolve");
    expect(unresolvedRes.body.eventTypes).toEqual([]);
  });

  it("continues organization lookup when user profile has no organization", async () => {
    delete process.env.CALENDLY_USER_URI;
    delete process.env.CALENDLY_ORGANIZATION_URI;
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ resource: { uri: "user-from-profile" } }))
      .mockResolvedValueOnce(jsonResponse({ resource: {} }))
      .mockResolvedValueOnce(jsonResponse({ collection: "not-array" }))
      .mockResolvedValueOnce(jsonResponse({ collection: [] }));
    const res = createMockRes();

    await getCalendlyEventTypes({}, res);

    expect(res.body.count).toBe(0);
    expect(String(global.fetch.mock.calls[2][0])).toContain("user=user-from-profile");
  });

  it("handles failed event type fetches", async () => {
    global.fetch.mockResolvedValue(jsonResponse({ message: "Calendly failed" }, false));
    const res = createMockRes();

    await getCalendlyEventTypes({}, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Calendly failed");
  });

  it("returns current user's upcoming scheduled meetings", async () => {
    mockUserLookup({ email: "member@example.com", firstName: "Mem", lastName: "Ber", role: "member" });
    global.fetch
      .mockResolvedValueOnce(
        jsonResponse({
          collection: [
            {
              uri: "https://api.calendly.com/scheduled_events/event-1",
              name: "Meeting",
              status: "active",
              start_time: new Date(Date.now() + 3600000).toISOString(),
              end_time: new Date(Date.now() + 5400000).toISOString(),
              event_memberships: [{ user_email: "pastor@example.com", user_name: "Pastor Victor" }],
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          collection: [{ email: "member@example.com", name: "Member", cancel_url: "cancel", reschedule_url: "reschedule" }],
        })
      );
    mockDecisionFind([{ eventUuid: "event-1", action: "approved" }]);
    const res = createMockRes();

    await getCalendlyScheduledMeetings({ userId: "u1" }, res);

    expect(res.body.count).toBe(1);
    expect(res.body.meetings[0].memberCancelUrl).toBe("cancel");
    expect(res.body.meetings[0].pastorDecision).toBe("approved");
  });

  it("handles scheduled meetings config, missing user, unresolved Calendly account, and fetch errors", async () => {
    delete process.env.CALENDLY_API_TOKEN;
    const configRes = createMockRes();

    await getCalendlyScheduledMeetings({ userId: "u1" }, configRes);

    expect(configRes.statusCode).toBe(500);

    process.env.CALENDLY_API_TOKEN = "token";
    mockUserLookup(null);
    const missingUserRes = createMockRes();

    await getCalendlyScheduledMeetings({ userId: "missing" }, missingUserRes);

    expect(missingUserRes.statusCode).toBe(404);

    delete process.env.CALENDLY_USER_URI;
    delete process.env.CALENDLY_ORGANIZATION_URI;
    mockUserLookup({ email: "member@example.com", firstName: "Mem", lastName: "Ber" });
    global.fetch
      .mockResolvedValueOnce(jsonResponse({}, false))
      .mockResolvedValueOnce(jsonResponse({ resource: {} }))
      .mockResolvedValueOnce(jsonResponse({ collection: [] }));
    const unresolvedRes = createMockRes();

    await getCalendlyScheduledMeetings({ userId: "u1" }, unresolvedRes);

    expect(unresolvedRes.body.warning).toContain("could not resolve");

    process.env.CALENDLY_USER_URI = "https://api.calendly.com/users/user-1";
    process.env.CALENDLY_ORGANIZATION_URI = "https://api.calendly.com/organizations/org-1";
    mockUserLookup({ email: "member@example.com", firstName: "Mem", lastName: "Ber" });
    global.fetch.mockResolvedValueOnce(jsonResponse({ message: "events failed" }, false));
    const fetchErrorRes = createMockRes();

    await getCalendlyScheduledMeetings({ userId: "u1" }, fetchErrorRes);

    expect(fetchErrorRes.statusCode).toBe(500);
    expect(fetchErrorRes.body.error).toBe("events failed");
  });

  it("filters past and invalid meetings and skips decision lookup when no uuids exist", async () => {
    mockUserLookup({ email: "member@example.com", firstName: "Mem", lastName: "Ber" });
    global.fetch.mockResolvedValueOnce(
      jsonResponse({
        collection: [
          { uri: "", start_time: new Date(Date.now() + 3600000).toISOString(), event_memberships: "bad" },
          { uri: "https://api.calendly.com/scheduled_events/past", start_time: new Date(Date.now() - 3600000).toISOString() },
          { uri: "https://api.calendly.com/scheduled_events/bad-date", start_time: "not-a-date" },
        ],
      })
    );
    const res = createMockRes();

    await getCalendlyScheduledMeetings({ userId: "u1" }, res);

    expect(res.body.count).toBe(1);
    expect(mockCalendlyMeetingAction.find).not.toHaveBeenCalled();
    expect(res.body.meetings[0].hosts).toEqual([]);
    expect(res.body.meetings[0].invitees).toEqual([]);
  });

  it("hydrates scheduled meeting defaults and handles invitee failures", async () => {
    mockUserLookup({ email: "host@example.com", firstName: "Pastor", lastName: "Victor" });
    global.fetch
      .mockResolvedValueOnce(
        jsonResponse({
          collection: [
            {
              uri: "https://api.calendly.com/scheduled_events/event-2",
              start_time: new Date(Date.now() + 3600000).toISOString(),
              event_memberships: [{ user_email: "host@example.com", user_name: "Pastor Victor" }],
            },
          ],
        })
      )
      .mockResolvedValueOnce(jsonResponse({ message: "invitees failed" }, false));
    mockDecisionFind([]);
    const res = createMockRes();

    await getCalendlyScheduledMeetings({ userId: "u1" }, res);

    expect(res.body.meetings[0]).toMatchObject({
      name: "Meeting",
      memberCancelUrl: "",
      memberRescheduleUrl: "",
      pastorDecision: "",
      pastorDecisionUpdatedAt: "",
    });
  });

  it("maps scheduled meeting host and invitee defaults", async () => {
    mockUserLookup({ email: "member@example.com", firstName: "Mem", lastName: "Ber" });
    global.fetch
      .mockResolvedValueOnce(
        jsonResponse({
          collection: [
            {
              uri: "https://api.calendly.com/scheduled_events/event-3",
              name: "Meeting",
              start_time: new Date(Date.now() + 3600000).toISOString(),
              event_memberships: [{}],
            },
          ],
        })
      )
      .mockResolvedValueOnce(jsonResponse({ collection: [{}] }));
    mockDecisionFind([{ eventUuid: "event-3", action: "declined", updatedAt: "then" }]);
    const res = createMockRes();

    await getCalendlyScheduledMeetings({ userId: "u1" }, res);

    expect(res.body.meetings[0].hosts).toEqual([{ uri: "", email: "", name: "" }]);
    expect(res.body.meetings[0].invitees).toEqual([
      { email: "", name: "", status: "", timezone: "", createdAt: "", cancelUrl: "", rescheduleUrl: "" },
    ]);
    expect(res.body.meetings[0].pastorDecisionUpdatedAt).toBe("then");
  });


  it("requires pastor access to update meeting action", async () => {
    mockUserLookup({ role: "member" });
    const res = createMockRes();

    await updateCalendlyMeetingAction({ userId: "u1", params: { eventUuid: "e1" }, body: { action: "approve" } }, res);

    expect(res.statusCode).toBe(403);
  });

  it("saves pastor approval action", async () => {
    mockUserLookup({ role: "pastor" });
    mockExistingDecision(null);
    mockSaveDecision({ eventUuid: "e1", action: "approved", updatedAt: "now" });
    const res = createMockRes();

    await updateCalendlyMeetingAction({ userId: "p1", params: { eventUuid: "e1" }, body: { action: "approve" } }, res);

    expect(res.body.action).toBe("approved");
    expect(res.body.meetingStatus).toBe("active");
  });

  it("validates meeting action configuration, id, and action input", async () => {
    delete process.env.CALENDLY_API_TOKEN;
    const configRes = createMockRes();

    await updateCalendlyMeetingAction({ userId: "p1", params: { eventUuid: "e1" }, body: { action: "approve" } }, configRes);

    expect(configRes.statusCode).toBe(500);

    process.env.CALENDLY_API_TOKEN = "token";
    mockUserLookup({ role: "pastor" });
    const missingIdRes = createMockRes();

    await updateCalendlyMeetingAction({ userId: "p1", params: {}, body: { action: "approve" } }, missingIdRes);

    expect(missingIdRes.statusCode).toBe(400);
    expect(missingIdRes.body.message).toBe("Meeting event id is required");

    mockUserLookup({ role: "pastor" });
    const invalidActionRes = createMockRes();

    await updateCalendlyMeetingAction({ userId: "p1", params: { eventUuid: "e1" }, body: { action: "maybe" } }, invalidActionRes);

    expect(invalidActionRes.statusCode).toBe(400);
    expect(invalidActionRes.body.message).toBe("Invalid meeting action");
  });

  it("enforces meeting action workflow rules", async () => {
    mockUserLookup({ role: "pastor" });
    mockExistingDecision(null);
    const firstCancelRes = createMockRes();

    await updateCalendlyMeetingAction({ userId: "p1", params: { eventUuid: "e1" }, body: { action: "cancel" } }, firstCancelRes);

    expect(firstCancelRes.statusCode).toBe(400);
    expect(firstCancelRes.body.message).toContain("only allowed after");

    mockUserLookup({ role: "pastor" });
    mockExistingDecision({ action: "approved" });
    const approvedDeclineRes = createMockRes();

    await updateCalendlyMeetingAction({ userId: "p1", params: { eventUuid: "e1" }, body: { action: "decline" } }, approvedDeclineRes);

    expect(approvedDeclineRes.statusCode).toBe(400);
    expect(approvedDeclineRes.body.message).toContain("only be cancelled");

    mockUserLookup({ role: "pastor" });
    mockExistingDecision({ action: "declined" });
    const alreadyFinalRes = createMockRes();

    await updateCalendlyMeetingAction({ userId: "p1", params: { eventUuid: "e1" }, body: { action: "approve" } }, alreadyFinalRes);

    expect(alreadyFinalRes.statusCode).toBe(400);
    expect(alreadyFinalRes.body.message).toContain("already declined");
  });

  it("returns already-set actions without saving again", async () => {
    mockUserLookup({ role: "pastor" });
    mockExistingDecision({ action: "approved" });
    const res = createMockRes();

    await updateCalendlyMeetingAction({ userId: "p1", params: { eventUuid: "e1" }, body: { action: "approved" } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Meeting action already set.");
    expect(mockCalendlyMeetingAction.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("cancels Calendly event when declining or cancelling a meeting", async () => {
    mockUserLookup({ role: "pastor" });
    mockExistingDecision(null);
    global.fetch.mockResolvedValueOnce(textResponse(""));
    mockSaveDecision({ eventUuid: "e1", action: "declined", updatedAt: "now" });
    const declineRes = createMockRes();

    await updateCalendlyMeetingAction({
      userId: "p1",
      params: { eventUuid: " e1 " },
      body: { action: "decline", meetingUri: " meeting-uri " },
    }, declineRes);

    expect(declineRes.body.action).toBe("declined");
    expect(declineRes.body.meetingStatus).toBe("cancelled");
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/scheduled_events/e1/cancellation"), expect.objectContaining({ method: "POST" }));

    mockUserLookup({ role: "pastor" });
    mockExistingDecision({ action: "approved" });
    global.fetch.mockResolvedValueOnce(jsonResponse({}));
    mockSaveDecision({ eventUuid: "e2", action: "cancelled", updatedAt: "later" });
    const cancelRes = createMockRes();

    await updateCalendlyMeetingAction({ userId: "p1", params: { eventUuid: "e2" }, body: { action: "canceled" } }, cancelRes);

    expect(cancelRes.body.action).toBe("cancelled");
  });

  it("handles Calendly cancellation and save errors", async () => {
    mockUserLookup({ role: "pastor" });
    mockExistingDecision(null);
    global.fetch.mockResolvedValueOnce(jsonResponse({ message: "cancel failed" }, false));
    const cancelErrorRes = createMockRes();

    await updateCalendlyMeetingAction({ userId: "p1", params: { eventUuid: "e1" }, body: { action: "declined" } }, cancelErrorRes);

    expect(cancelErrorRes.statusCode).toBe(500);
    expect(cancelErrorRes.body.error).toBe("cancel failed");

    mockUserLookup({ role: "pastor" });
    mockExistingDecision(null);
    mockCalendlyMeetingAction.findOneAndUpdate.mockImplementationOnce(() => {
      throw new Error("save failed");
    });
    const saveErrorRes = createMockRes();

    await updateCalendlyMeetingAction({ userId: "p1", params: { eventUuid: "e1" }, body: { action: "approve" } }, saveErrorRes);

    expect(saveErrorRes.statusCode).toBe(500);
    expect(saveErrorRes.body.error).toBe("save failed");
  });
});
