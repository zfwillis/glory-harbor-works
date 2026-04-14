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

  it("returns current user's upcoming scheduled meetings", async () => {
    mockUser.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ email: "member@example.com", firstName: "Mem", lastName: "Ber", role: "member" }),
      }),
    });
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
    mockCalendlyMeetingAction.find.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ eventUuid: "event-1", action: "approved" }]) }),
    });
    const res = createMockRes();

    await getCalendlyScheduledMeetings({ userId: "u1" }, res);

    expect(res.body.count).toBe(1);
    expect(res.body.meetings[0].memberCancelUrl).toBe("cancel");
    expect(res.body.meetings[0].pastorDecision).toBe("approved");
  });

  it("requires pastor access to update meeting action", async () => {
    mockUser.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ role: "member" }) }),
    });
    const res = createMockRes();

    await updateCalendlyMeetingAction({ userId: "u1", params: { eventUuid: "e1" }, body: { action: "approve" } }, res);

    expect(res.statusCode).toBe(403);
  });

  it("saves pastor approval action", async () => {
    mockUser.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ role: "pastor" }) }),
    });
    mockCalendlyMeetingAction.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    });
    mockCalendlyMeetingAction.findOneAndUpdate.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ eventUuid: "e1", action: "approved", updatedAt: "now" }),
      }),
    });
    const res = createMockRes();

    await updateCalendlyMeetingAction({ userId: "p1", params: { eventUuid: "e1" }, body: { action: "approve" } }, res);

    expect(res.body.action).toBe("approved");
    expect(res.body.meetingStatus).toBe("active");
  });
});
