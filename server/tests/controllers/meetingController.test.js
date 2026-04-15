import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import mongoose from "mongoose";

const mockMeeting = {
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

const mockUser = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

jest.unstable_mockModule("../../models/Meeting.js", () => ({ default: mockMeeting }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: mockUser }));

const {
  createMeeting,
  listMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  approveOrDeclineMeeting,
  cancelMeeting,
  getPastorSchedule,
  getPastorAvailability,
  updatePastorAvailability,
  runMeetingReminders,
} = await import("../../controllers/meetingController.js");

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

const oid = () => new mongoose.Types.ObjectId().toString();

const mockRequester = (user) => {
  mockUser.findById.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(user) }),
  });
};

const mockLeanUserLookup = (user) => {
  mockUser.findById.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(user) }),
  });
};

const mockPopulateMeetingLookup = (meeting) => {
  mockMeeting.findById.mockReturnValueOnce({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(meeting),
    }),
  });
};

const mockMeetingList = (meetings) => {
  mockMeeting.find.mockReturnValueOnce({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(meetings) }),
      }),
    }),
  });
};

const mockConflictLookup = (meetings) => {
  mockMeeting.find.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(meetings) }),
  });
};

const mockPastorScheduleList = (meetings) => {
  mockMeeting.find.mockReturnValueOnce({
    populate: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(meetings) }),
    }),
  });
};

const mockReminderList = (meetings) => {
  mockMeeting.find.mockReturnValueOnce({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(meetings),
    }),
  });
};

describe("Meeting Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a meeting when member selects available pastor slot", async () => {
    const memberId = oid();
    const pastorId = oid();
    const meetingId = oid();
    const scheduledFor = "2026-04-20T18:00:00.000Z";
    mockRequester({ _id: memberId, role: "member" });
    mockUser.findById.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          role: "pastor",
          availability: [{ day: "Monday", start: "13:00", end: "16:00" }],
        }),
      }),
    });
    mockMeeting.find.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    });
    mockMeeting.create.mockResolvedValue({ _id: meetingId });
    mockMeeting.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue({ _id: meetingId, memberId, pastorId }),
      }),
    });
    const res = createMockRes();

    await createMeeting({ userId: memberId, body: { pastorId, scheduledFor } }, res);

    expect(res.statusCode).toBe(201);
    expect(mockMeeting.create).toHaveBeenCalledWith(expect.objectContaining({ memberId, pastorId, status: "pending" }));
  });

  it("rejects meeting creation without an authenticated requester", async () => {
    mockRequester(null);
    const res = createMockRes();

    await createMeeting({ userId: "missing", body: {} }, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });

  it("rejects non-member meeting creation", async () => {
    mockRequester({ _id: oid(), role: "pastor" });
    const res = createMockRes();

    await createMeeting({ userId: "p1", body: { pastorId: oid(), scheduledFor: "2026-04-20T14:00:00.000Z" } }, res);

    expect(res.statusCode).toBe(403);
  });

  it("validates meeting creation input before querying pastor availability", async () => {
    const memberId = oid();
    mockRequester({ _id: memberId, role: "member" });
    const res = createMockRes();

    await createMeeting({ userId: memberId, body: { pastorId: "bad-id", scheduledFor: "2026-04-20" } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Valid pastorId is required.");
  });

  it("rejects invalid scheduled date and duration during meeting creation", async () => {
    const memberId = oid();
    const pastorId = oid();
    mockRequester({ _id: memberId, role: "member" });
    const invalidDateRes = createMockRes();

    await createMeeting({ userId: memberId, body: { pastorId, scheduledFor: "not-a-date" } }, invalidDateRes);

    expect(invalidDateRes.statusCode).toBe(400);
    expect(invalidDateRes.body.message).toBe("Valid scheduledFor date is required.");

    mockRequester({ _id: memberId, role: "member" });
    const invalidDurationRes = createMockRes();

    await createMeeting({
      userId: memberId,
      body: { pastorId, scheduledFor: "2026-04-20T18:00:00.000Z", durationMinutes: 5 },
    }, invalidDurationRes);

    expect(invalidDurationRes.statusCode).toBe(400);
    expect(invalidDurationRes.body.message).toBe("durationMinutes must be between 15 and 180.");
  });

  it("rejects missing pastor, unavailable pastor slot, and conflicting meeting creation", async () => {
    const memberId = oid();
    const pastorId = oid();

    mockRequester({ _id: memberId, role: "member" });
    mockLeanUserLookup(null);
    const missingPastorRes = createMockRes();

    await createMeeting({
      userId: memberId,
      body: { pastorId, scheduledFor: "2026-04-20T18:00:00.000Z" },
    }, missingPastorRes);

    expect(missingPastorRes.statusCode).toBe(404);

    mockRequester({ _id: memberId, role: "member" });
    mockLeanUserLookup({ role: "pastor", availability: [{ day: "Tuesday", start: "bad", end: "11:00" }] });
    const unavailableRes = createMockRes();

    await createMeeting({
      userId: memberId,
      body: { pastorId, scheduledFor: "2026-04-20T18:00:00.000Z" },
    }, unavailableRes);

    expect(unavailableRes.statusCode).toBe(400);
    expect(unavailableRes.body.message).toBe("Selected time is outside pastor availability.");

    mockRequester({ _id: memberId, role: "member" });
    mockLeanUserLookup({ role: "pastor", availability: [{ day: "Monday", start: "13:00", end: "16:00" }] });
    mockConflictLookup([{ scheduledFor: "2026-04-20T17:45:00.000Z", durationMinutes: 30 }]);
    const conflictRes = createMockRes();

    await createMeeting({
      userId: memberId,
      body: { pastorId, scheduledFor: "2026-04-20T18:00:00.000Z" },
    }, conflictRes);

    expect(conflictRes.statusCode).toBe(409);
  });

  it("rejects malformed availability windows during meeting creation", async () => {
    const memberId = oid();
    const pastorId = oid();

    mockRequester({ _id: memberId, role: "member" });
    mockLeanUserLookup({ role: "pastor", availability: [{ day: "Monday", start: "bad", end: "16:00" }] });
    const badTimeRes = createMockRes();

    await createMeeting({
      userId: memberId,
      body: { pastorId, scheduledFor: "2026-04-20T18:00:00.000Z" },
    }, badTimeRes);

    expect(badTimeRes.statusCode).toBe(400);

    mockRequester({ _id: memberId, role: "member" });
    mockLeanUserLookup({ role: "pastor", availability: [{ day: "Monday", start: "25:00", end: "26:00" }] });
    const outOfRangeTimeRes = createMockRes();

    await createMeeting({
      userId: memberId,
      body: { pastorId, scheduledFor: "2026-04-20T18:00:00.000Z" },
    }, outOfRangeTimeRes);

    expect(outOfRangeTimeRes.statusCode).toBe(400);

    mockRequester({ _id: memberId, role: "member" });
    mockLeanUserLookup({ role: "pastor", availability: [{ day: "Monday", start: "16:00", end: "15:00" }] });
    const reversedWindowRes = createMockRes();

    await createMeeting({
      userId: memberId,
      body: { pastorId, scheduledFor: "2026-04-20T18:00:00.000Z" },
    }, reversedWindowRes);

    expect(reversedWindowRes.statusCode).toBe(400);

    mockRequester({ _id: memberId, role: "member" });
    mockLeanUserLookup({ role: "pastor", availability: [{ day: "Monday", end: "16:00" }] });
    const missingStartRes = createMockRes();

    await createMeeting({
      userId: memberId,
      body: { pastorId, scheduledFor: "2026-04-20T18:00:00.000Z" },
    }, missingStartRes);

    expect(missingStartRes.statusCode).toBe(400);

    mockRequester({ _id: memberId, role: "member" });
    mockLeanUserLookup({ role: "pastor" });
    const missingAvailabilityRes = createMockRes();

    await createMeeting({
      userId: memberId,
      body: { pastorId, scheduledFor: "2026-04-20T18:00:00.000Z" },
    }, missingAvailabilityRes);

    expect(missingAvailabilityRes.statusCode).toBe(400);
  });

  it("returns server error when meeting creation throws", async () => {
    mockUser.findById.mockImplementationOnce(() => {
      throw new Error("database down");
    });
    const res = createMockRes();

    await createMeeting({ userId: oid(), body: {} }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Unable to create meeting right now.");
  });

  it("lists meetings scoped to member requester", async () => {
    const memberId = oid();
    const meetings = [{ _id: oid() }];
    mockRequester({ _id: memberId, role: "member" });
    mockMeeting.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(meetings) }),
        }),
      }),
    });
    const res = createMockRes();

    await listMeetings({ userId: memberId, query: {} }, res);

    expect(mockMeeting.find).toHaveBeenCalledWith({ memberId });
    expect(res.body.count).toBe(1);
  });

  it("lists pastor meetings and admin-filtered meetings with status and dates", async () => {
    const pastorId = oid();
    mockRequester({ _id: pastorId, role: "pastor" });
    mockMeetingList([]);
    const pastorRes = createMockRes();

    await listMeetings({ userId: pastorId, query: { status: "approved" } }, pastorRes);

    expect(mockMeeting.find).toHaveBeenLastCalledWith({ pastorId, status: "approved" });

    const adminId = oid();
    const memberId = oid();
    mockRequester({ _id: adminId, role: "admin" });
    mockMeetingList([{ _id: oid() }]);
    const adminRes = createMockRes();

    await listMeetings({
      userId: adminId,
      query: {
        pastorId,
        memberId,
        dateFrom: "2026-04-01T00:00:00.000Z",
        dateTo: "2026-04-30T23:59:59.000Z",
      },
    }, adminRes);

    expect(mockMeeting.find).toHaveBeenLastCalledWith({
      pastorId,
      memberId,
      scheduledFor: {
        $gte: new Date("2026-04-01T00:00:00.000Z"),
        $lte: new Date("2026-04-30T23:59:59.000Z"),
      },
    });
    expect(adminRes.body.count).toBe(1);
  });

  it("ignores invalid admin filters and supports one-sided date filters", async () => {
    const adminId = oid();
    mockRequester({ _id: adminId, role: "admin" });
    mockMeetingList([]);
    const invalidFilterRes = createMockRes();

    await listMeetings({
      userId: adminId,
      query: { pastorId: "bad", memberId: "also-bad", dateFrom: "2026-04-01T00:00:00.000Z" },
    }, invalidFilterRes);

    expect(mockMeeting.find).toHaveBeenLastCalledWith({
      scheduledFor: { $gte: new Date("2026-04-01T00:00:00.000Z") },
    });

    mockRequester({ _id: adminId, role: "admin" });
    mockMeetingList([]);
    const dateToOnlyRes = createMockRes();

    await listMeetings({ userId: adminId, query: { dateTo: "2026-04-30T23:59:59.000Z" } }, dateToOnlyRes);

    expect(mockMeeting.find).toHaveBeenLastCalledWith({
      scheduledFor: { $lte: new Date("2026-04-30T23:59:59.000Z") },
    });
  });

  it("handles unauthorized and failed list meetings requests", async () => {
    mockRequester(null);
    const unauthorizedRes = createMockRes();

    await listMeetings({ userId: "missing", query: {} }, unauthorizedRes);

    expect(unauthorizedRes.statusCode).toBe(401);

    mockRequester({ _id: oid(), role: "member" });
    mockMeeting.find.mockImplementationOnce(() => {
      throw new Error("find failed");
    });
    const errorRes = createMockRes();

    await listMeetings({ userId: oid(), query: {} }, errorRes);

    expect(errorRes.statusCode).toBe(500);
  });

  it("blocks unauthorized meeting detail access", async () => {
    const meetingId = oid();
    mockRequester({ _id: oid(), role: "member" });
    mockMeeting.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue({ _id: meetingId, memberId: oid(), pastorId: oid() }),
      }),
    });
    const res = createMockRes();

    await getMeetingById({ userId: "u1", params: { id: meetingId } }, res);

    expect(res.statusCode).toBe(403);
  });

  it("returns meeting details for admin, pastor, and owner member", async () => {
    const meetingId = oid();
    const pastorId = oid();
    const memberId = oid();

    mockRequester({ _id: oid(), role: "leader" });
    mockPopulateMeetingLookup({ _id: meetingId, memberId, pastorId });
    const leaderRes = createMockRes();

    await getMeetingById({ userId: "leader", params: { id: meetingId } }, leaderRes);

    expect(leaderRes.statusCode).toBe(200);

    mockRequester({ _id: pastorId, role: "pastor" });
    mockPopulateMeetingLookup({ _id: meetingId, memberId, pastorId });
    const pastorRes = createMockRes();

    await getMeetingById({ userId: pastorId, params: { id: meetingId } }, pastorRes);

    expect(pastorRes.statusCode).toBe(200);

    mockRequester({ _id: memberId, role: "member" });
    mockPopulateMeetingLookup({ _id: meetingId, memberId, pastorId });
    const memberRes = createMockRes();

    await getMeetingById({ userId: memberId, params: { id: meetingId } }, memberRes);

    expect(memberRes.statusCode).toBe(200);
  });

  it("validates meeting detail id and missing meeting", async () => {
    mockRequester({ _id: oid(), role: "admin" });
    const invalidRes = createMockRes();

    await getMeetingById({ userId: "admin", params: { id: "bad" } }, invalidRes);

    expect(invalidRes.statusCode).toBe(400);

    const meetingId = oid();
    mockRequester({ _id: oid(), role: "admin" });
    mockPopulateMeetingLookup(null);
    const missingRes = createMockRes();

    await getMeetingById({ userId: "admin", params: { id: meetingId } }, missingRes);

    expect(missingRes.statusCode).toBe(404);
  });

  it("handles unauthenticated and failed meeting detail requests", async () => {
    mockRequester(null);
    const unauthorizedRes = createMockRes();

    await getMeetingById({ userId: "missing", params: { id: oid() } }, unauthorizedRes);

    expect(unauthorizedRes.statusCode).toBe(401);

    mockUser.findById.mockImplementationOnce(() => {
      throw new Error("detail failed");
    });
    const errorRes = createMockRes();

    await getMeetingById({ userId: "u1", params: { id: oid() } }, errorRes);

    expect(errorRes.statusCode).toBe(500);
  });

  it("updates a member-owned meeting and resets status to pending", async () => {
    const memberId = oid();
    const pastorId = oid();
    const meetingId = oid();
    const meeting = {
      _id: meetingId,
      memberId,
      pastorId,
      scheduledFor: new Date("2026-04-20T18:00:00.000Z"),
      durationMinutes: 30,
      status: "approved",
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockRequester({ _id: memberId, role: "member" });
    mockMeeting.findById.mockResolvedValueOnce(meeting);
    mockLeanUserLookup({ availability: [{ day: "Monday", start: "13:00", end: "16:00" }] });
    mockConflictLookup([]);
    mockPopulateMeetingLookup({ _id: meetingId, title: "Updated" });
    const res = createMockRes();

    await updateMeeting({
      userId: memberId,
      params: { id: meetingId },
      body: { title: "Updated", notes: "New notes", scheduledFor: "2026-04-20T18:30:00.000Z", durationMinutes: 45 },
    }, res);

    expect(meeting.title).toBe("Updated");
    expect(meeting.notes).toBe("New notes");
    expect(meeting.status).toBe("pending");
    expect(res.statusCode).toBe(200);
  });

  it("lets admin update a meeting without resetting status", async () => {
    const adminId = oid();
    const meetingId = oid();
    const meeting = {
      _id: meetingId,
      memberId: oid(),
      pastorId: oid(),
      scheduledFor: new Date("2026-04-20T18:00:00.000Z"),
      durationMinutes: 30,
      status: "approved",
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockRequester({ _id: adminId, role: "admin" });
    mockMeeting.findById.mockResolvedValueOnce(meeting);
    mockLeanUserLookup({ availability: [{ day: "Monday", start: "13:00", end: "16:00" }] });
    mockConflictLookup([]);
    mockPopulateMeetingLookup({ _id: meetingId });
    const res = createMockRes();

    await updateMeeting({ userId: adminId, params: { id: meetingId }, body: {} }, res);

    expect(meeting.status).toBe("approved");
    expect(res.body.message).toBe("Meeting updated successfully.");
  });

  it("rejects invalid or unauthorized meeting updates", async () => {
    mockRequester(null);
    const unauthorizedRes = createMockRes();

    await updateMeeting({ userId: "missing", params: { id: oid() }, body: {} }, unauthorizedRes);

    expect(unauthorizedRes.statusCode).toBe(401);

    mockRequester({ _id: oid(), role: "member" });
    const invalidIdRes = createMockRes();

    await updateMeeting({ userId: "u1", params: { id: "bad" }, body: {} }, invalidIdRes);

    expect(invalidIdRes.statusCode).toBe(400);

    const meetingId = oid();
    mockRequester({ _id: oid(), role: "member" });
    mockMeeting.findById.mockResolvedValueOnce(null);
    const missingRes = createMockRes();

    await updateMeeting({ userId: "u1", params: { id: meetingId }, body: {} }, missingRes);

    expect(missingRes.statusCode).toBe(404);

    mockRequester({ _id: oid(), role: "pastor" });
    mockMeeting.findById.mockResolvedValueOnce({ _id: meetingId, memberId: oid(), pastorId: oid(), status: "pending" });
    const forbiddenRes = createMockRes();

    await updateMeeting({ userId: "p1", params: { id: meetingId }, body: {} }, forbiddenRes);

    expect(forbiddenRes.statusCode).toBe(403);
  });

  it("rejects closed, invalid, unavailable, and conflicting meeting updates", async () => {
    const memberId = oid();
    const pastorId = oid();
    const meetingId = oid();

    mockRequester({ _id: memberId, role: "member" });
    mockMeeting.findById.mockResolvedValueOnce({ _id: meetingId, memberId, pastorId, status: "completed" });
    const closedRes = createMockRes();

    await updateMeeting({ userId: memberId, params: { id: meetingId }, body: {} }, closedRes);

    expect(closedRes.statusCode).toBe(400);

    mockRequester({ _id: memberId, role: "member" });
    mockMeeting.findById.mockResolvedValueOnce({ _id: meetingId, memberId, pastorId, status: "pending", scheduledFor: new Date(), durationMinutes: 30 });
    const invalidDateRes = createMockRes();

    await updateMeeting({ userId: memberId, params: { id: meetingId }, body: { scheduledFor: "bad-date" } }, invalidDateRes);

    expect(invalidDateRes.body.message).toBe("scheduledFor must be a valid date.");

    mockRequester({ _id: memberId, role: "member" });
    mockMeeting.findById.mockResolvedValueOnce({ _id: meetingId, memberId, pastorId, status: "pending", scheduledFor: new Date(), durationMinutes: 30 });
    const invalidDurationRes = createMockRes();

    await updateMeeting({ userId: memberId, params: { id: meetingId }, body: { durationMinutes: 181 } }, invalidDurationRes);

    expect(invalidDurationRes.body.message).toBe("durationMinutes must be between 15 and 180.");

    mockRequester({ _id: memberId, role: "member" });
    mockMeeting.findById.mockResolvedValueOnce({
      _id: meetingId,
      memberId,
      pastorId,
      status: "pending",
      scheduledFor: new Date("2026-04-20T18:00:00.000Z"),
      durationMinutes: 30,
    });
    mockLeanUserLookup({ availability: [{ day: "Monday", start: "17:00", end: "17:30" }] });
    const unavailableRes = createMockRes();

    await updateMeeting({ userId: memberId, params: { id: meetingId }, body: {} }, unavailableRes);

    expect(unavailableRes.body.message).toBe("Selected time is outside pastor availability.");

    mockRequester({ _id: memberId, role: "member" });
    mockMeeting.findById.mockResolvedValueOnce({
      _id: meetingId,
      memberId,
      pastorId,
      status: "pending",
      scheduledFor: new Date("2026-04-20T18:00:00.000Z"),
      durationMinutes: 30,
    });
    mockLeanUserLookup({ availability: [{ day: "Monday", start: "13:00", end: "16:00" }] });
    mockConflictLookup([{ scheduledFor: "2026-04-20T18:15:00.000Z" }]);
    const conflictRes = createMockRes();

    await updateMeeting({ userId: memberId, params: { id: meetingId }, body: {} }, conflictRes);

    expect(conflictRes.statusCode).toBe(409);

    mockRequester({ _id: memberId, role: "member" });
    mockMeeting.findById.mockResolvedValueOnce({
      _id: meetingId,
      memberId,
      pastorId,
      status: "pending",
      scheduledFor: new Date("2026-04-20T18:00:00.000Z"),
      durationMinutes: 30,
    });
    mockLeanUserLookup(null);
    const missingPastorRes = createMockRes();

    await updateMeeting({ userId: memberId, params: { id: meetingId }, body: {} }, missingPastorRes);

    expect(missingPastorRes.statusCode).toBe(400);
  });

  it("handles update meeting server errors", async () => {
    mockUser.findById.mockImplementationOnce(() => {
      throw new Error("lookup failed");
    });
    const res = createMockRes();

    await updateMeeting({ userId: "u1", params: { id: oid() }, body: {} }, res);

    expect(res.statusCode).toBe(500);
  });

  it("deletes a manageable meeting", async () => {
    const leaderId = oid();
    const meeting = { _id: oid(), memberId: oid(), pastorId: oid(), deleteOne: jest.fn().mockResolvedValue(undefined) };
    mockRequester({ _id: leaderId, role: "leader" });
    mockMeeting.findById.mockResolvedValueOnce(meeting);
    const res = createMockRes();

    await deleteMeeting({ userId: leaderId, params: { id: String(meeting._id) } }, res);

    expect(meeting.deleteOne).toHaveBeenCalled();
    expect(res.body.message).toBe("Meeting deleted successfully.");
  });

  it("validates delete meeting authorization and lookup failures", async () => {
    mockRequester(null);
    const unauthorizedRes = createMockRes();

    await deleteMeeting({ userId: "missing", params: { id: oid() } }, unauthorizedRes);

    expect(unauthorizedRes.statusCode).toBe(401);

    mockRequester({ _id: oid(), role: "admin" });
    const invalidRes = createMockRes();

    await deleteMeeting({ userId: "admin", params: { id: "bad" } }, invalidRes);

    expect(invalidRes.statusCode).toBe(400);

    const meetingId = oid();
    mockRequester({ _id: oid(), role: "admin" });
    mockMeeting.findById.mockResolvedValueOnce(null);
    const missingRes = createMockRes();

    await deleteMeeting({ userId: "admin", params: { id: meetingId } }, missingRes);

    expect(missingRes.statusCode).toBe(404);

    mockRequester({ _id: oid(), role: "member" });
    mockMeeting.findById.mockResolvedValueOnce({ _id: meetingId, memberId: oid(), pastorId: oid() });
    const forbiddenRes = createMockRes();

    await deleteMeeting({ userId: "member", params: { id: meetingId } }, forbiddenRes);

    expect(forbiddenRes.statusCode).toBe(403);
  });

  it("handles delete meeting server errors", async () => {
    mockUser.findById.mockImplementationOnce(() => {
      throw new Error("delete failed");
    });
    const res = createMockRes();

    await deleteMeeting({ userId: "admin", params: { id: oid() } }, res);

    expect(res.statusCode).toBe(500);
  });

  it("pastor approves assigned meeting", async () => {
    const pastorId = oid();
    const meetingId = oid();
    const meeting = { _id: meetingId, pastorId, save: jest.fn().mockResolvedValue(undefined) };
    mockRequester({ _id: pastorId, role: "pastor" });
    mockMeeting.findById
      .mockResolvedValueOnce(meeting)
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({ _id: meetingId, status: "approved" }),
        }),
      });
    const res = createMockRes();

    await approveOrDeclineMeeting({ userId: pastorId, params: { id: meetingId }, body: { status: "approved" } }, res);

    expect(meeting.status).toBe("approved");
    expect(res.body.message).toBe("Meeting approved.");
  });

  it("rejects invalid meeting review requests", async () => {
    mockRequester({ _id: oid(), role: "member" });
    const roleRes = createMockRes();

    await approveOrDeclineMeeting({ userId: "m1", params: { id: oid() }, body: { status: "approved" } }, roleRes);

    expect(roleRes.statusCode).toBe(403);

    mockRequester({ _id: oid(), role: "pastor" });
    const idRes = createMockRes();

    await approveOrDeclineMeeting({ userId: "p1", params: { id: "bad" }, body: { status: "approved" } }, idRes);

    expect(idRes.statusCode).toBe(400);

    mockRequester({ _id: oid(), role: "pastor" });
    const statusRes = createMockRes();

    await approveOrDeclineMeeting({ userId: "p1", params: { id: oid() }, body: { status: "pending" } }, statusRes);

    expect(statusRes.statusCode).toBe(400);
  });

  it("rejects review of missing or unassigned meetings and handles review errors", async () => {
    const pastorId = oid();
    const meetingId = oid();
    mockRequester({ _id: pastorId, role: "pastor" });
    mockMeeting.findById.mockResolvedValueOnce(null);
    const missingRes = createMockRes();

    await approveOrDeclineMeeting({ userId: pastorId, params: { id: meetingId }, body: { status: "approved" } }, missingRes);

    expect(missingRes.statusCode).toBe(404);

    mockRequester({ _id: pastorId, role: "pastor" });
    mockMeeting.findById.mockResolvedValueOnce({ _id: meetingId, pastorId: oid() });
    const forbiddenRes = createMockRes();

    await approveOrDeclineMeeting({ userId: pastorId, params: { id: meetingId }, body: { status: "approved" } }, forbiddenRes);

    expect(forbiddenRes.statusCode).toBe(403);

    mockUser.findById.mockImplementationOnce(() => {
      throw new Error("review failed");
    });
    const errorRes = createMockRes();

    await approveOrDeclineMeeting({ userId: pastorId, params: { id: meetingId }, body: { status: "approved" } }, errorRes);

    expect(errorRes.statusCode).toBe(500);
  });

  it("pastor cancels assigned meeting", async () => {
    const pastorId = oid();
    const meeting = { _id: oid(), pastorId, save: jest.fn().mockResolvedValue(undefined) };
    mockRequester({ _id: pastorId, role: "pastor" });
    mockMeeting.findById.mockResolvedValue(meeting);
    const res = createMockRes();

    await cancelMeeting({ userId: pastorId, params: { id: String(meeting._id) } }, res);

    expect(meeting.status).toBe("cancelled");
    expect(res.body.message).toBe("Meeting cancelled.");
  });

  it("rejects invalid cancel meeting requests", async () => {
    mockRequester({ _id: oid(), role: "member" });
    const roleRes = createMockRes();

    await cancelMeeting({ userId: "m1", params: { id: oid() } }, roleRes);

    expect(roleRes.statusCode).toBe(403);

    mockRequester({ _id: oid(), role: "pastor" });
    const invalidIdRes = createMockRes();

    await cancelMeeting({ userId: "p1", params: { id: "bad" } }, invalidIdRes);

    expect(invalidIdRes.statusCode).toBe(400);

    const pastorId = oid();
    const meetingId = oid();
    mockRequester({ _id: pastorId, role: "pastor" });
    mockMeeting.findById.mockResolvedValueOnce(null);
    const missingRes = createMockRes();

    await cancelMeeting({ userId: pastorId, params: { id: meetingId } }, missingRes);

    expect(missingRes.statusCode).toBe(404);

    mockRequester({ _id: pastorId, role: "pastor" });
    mockMeeting.findById.mockResolvedValueOnce({ _id: meetingId, pastorId: oid() });
    const forbiddenRes = createMockRes();

    await cancelMeeting({ userId: pastorId, params: { id: meetingId } }, forbiddenRes);

    expect(forbiddenRes.statusCode).toBe(403);
  });

  it("handles cancel meeting server errors", async () => {
    mockUser.findById.mockImplementationOnce(() => {
      throw new Error("cancel failed");
    });
    const res = createMockRes();

    await cancelMeeting({ userId: "p1", params: { id: oid() } }, res);

    expect(res.statusCode).toBe(500);
  });

  it("gets pastor schedule with date filters", async () => {
    const pastorId = oid();
    mockRequester({ _id: pastorId, role: "pastor" });
    mockPastorScheduleList([{ _id: oid() }]);
    const res = createMockRes();

    await getPastorSchedule({
      userId: pastorId,
      query: { dateFrom: "2026-04-01T00:00:00.000Z", dateTo: "2026-04-30T23:59:59.000Z" },
    }, res);

    expect(mockMeeting.find).toHaveBeenCalledWith({
      pastorId,
      status: { $in: ["pending", "approved", "completed"] },
      scheduledFor: {
        $gte: new Date("2026-04-01T00:00:00.000Z"),
        $lte: new Date("2026-04-30T23:59:59.000Z"),
      },
    });
    expect(res.body.count).toBe(1);
  });

  it("gets pastor schedule without dates and with one-sided date filters", async () => {
    const pastorId = oid();
    mockRequester({ _id: pastorId, role: "pastor" });
    mockPastorScheduleList([]);
    const noDatesRes = createMockRes();

    await getPastorSchedule({ userId: pastorId, query: {} }, noDatesRes);

    expect(mockMeeting.find).toHaveBeenLastCalledWith({
      pastorId,
      status: { $in: ["pending", "approved", "completed"] },
    });

    mockRequester({ _id: pastorId, role: "pastor" });
    mockPastorScheduleList([]);
    const fromOnlyRes = createMockRes();

    await getPastorSchedule({ userId: pastorId, query: { dateFrom: "2026-04-01T00:00:00.000Z" } }, fromOnlyRes);

    expect(mockMeeting.find).toHaveBeenLastCalledWith({
      pastorId,
      status: { $in: ["pending", "approved", "completed"] },
      scheduledFor: { $gte: new Date("2026-04-01T00:00:00.000Z") },
    });

    mockRequester({ _id: pastorId, role: "pastor" });
    mockPastorScheduleList([]);
    const toOnlyRes = createMockRes();

    await getPastorSchedule({ userId: pastorId, query: { dateTo: "2026-04-30T23:59:59.000Z" } }, toOnlyRes);

    expect(mockMeeting.find).toHaveBeenLastCalledWith({
      pastorId,
      status: { $in: ["pending", "approved", "completed"] },
      scheduledFor: { $lte: new Date("2026-04-30T23:59:59.000Z") },
    });
  });

  it("rejects non-pastor schedule access and handles schedule errors", async () => {
    mockRequester({ _id: oid(), role: "member" });
    const forbiddenRes = createMockRes();

    await getPastorSchedule({ userId: "m1", query: {} }, forbiddenRes);

    expect(forbiddenRes.statusCode).toBe(403);

    mockUser.findById.mockImplementationOnce(() => {
      throw new Error("schedule failed");
    });
    const errorRes = createMockRes();

    await getPastorSchedule({ userId: "p1", query: {} }, errorRes);

    expect(errorRes.statusCode).toBe(500);
  });

  it("gets pastor availability", async () => {
    const availability = [{ day: "Tuesday", start: "09:00", end: "10:00" }];
    mockRequester({ _id: oid(), role: "pastor", availability });
    const res = createMockRes();

    await getPastorAvailability({ userId: "p1" }, res);

    expect(res.body.availability).toEqual(availability);
  });

  it("returns an empty pastor availability list when none is saved", async () => {
    mockRequester({ _id: oid(), role: "pastor" });
    const res = createMockRes();

    await getPastorAvailability({ userId: "p1" }, res);

    expect(res.body.availability).toEqual([]);
  });

  it("rejects availability access/update by non-pastors and invalid availability payloads", async () => {
    mockRequester({ _id: oid(), role: "member" });
    const getRes = createMockRes();

    await getPastorAvailability({ userId: "m1" }, getRes);

    expect(getRes.statusCode).toBe(403);

    mockRequester({ _id: oid(), role: "member" });
    const updateRoleRes = createMockRes();

    await updatePastorAvailability({ userId: "m1", body: { availability: [] } }, updateRoleRes);

    expect(updateRoleRes.statusCode).toBe(403);

    mockRequester({ _id: oid(), role: "pastor" });
    const invalidPayloadRes = createMockRes();

    await updatePastorAvailability({ userId: "p1", body: { availability: "Monday" } }, invalidPayloadRes);

    expect(invalidPayloadRes.statusCode).toBe(400);
  });

  it("handles pastor availability server errors", async () => {
    mockUser.findById.mockImplementationOnce(() => {
      throw new Error("availability failed");
    });
    const getErrorRes = createMockRes();

    await getPastorAvailability({ userId: "p1" }, getErrorRes);

    expect(getErrorRes.statusCode).toBe(500);

    mockUser.findById.mockImplementationOnce(() => {
      throw new Error("availability update failed");
    });
    const updateErrorRes = createMockRes();

    await updatePastorAvailability({ userId: "p1", body: { availability: [] } }, updateErrorRes);

    expect(updateErrorRes.statusCode).toBe(500);
  });

  it("updates pastor availability", async () => {
    const pastorId = oid();
    mockRequester({ _id: pastorId, role: "pastor" });
    mockUser.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue({ availability: [{ day: "Monday", start: "09:00", end: "11:00" }] }),
    });
    const res = createMockRes();

    await updatePastorAvailability({
      userId: pastorId,
      body: { availability: [{ day: "Monday", start: "09:00", end: "11:00" }, { day: "", start: "", end: "" }] },
    }, res);

    expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
      pastorId,
      { availability: [{ day: "Monday", start: "09:00", end: "11:00" }] },
      { new: true, runValidators: true }
    );
    expect(res.body.message).toBe("Availability updated.");
  });

  it("falls back to empty availability when update returns no user", async () => {
    const pastorId = oid();
    mockRequester({ _id: pastorId, role: "pastor" });
    mockUser.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });
    const res = createMockRes();

    await updatePastorAvailability({ userId: pastorId, body: { availability: [] } }, res);

    expect(res.body.availability).toEqual([]);
  });

  it("runs reminders for admin and pastor requesters", async () => {
    const adminMeeting = {
      _id: oid(),
      scheduledFor: new Date("2026-04-15T15:00:00.000Z"),
      memberId: { email: "member@test.com" },
      pastorId: { email: "pastor@test.com" },
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockRequester({ _id: oid(), role: "admin" });
    mockReminderList([adminMeeting]);
    const adminRes = createMockRes();

    await runMeetingReminders({ userId: "admin" }, adminRes);

    expect(adminMeeting.reminderSentAt).toBeInstanceOf(Date);
    expect(adminRes.body.count).toBe(1);

    const pastorId = oid();
    mockRequester({ _id: pastorId, role: "pastor" });
    mockReminderList([]);
    const pastorRes = createMockRes();

    await runMeetingReminders({ userId: pastorId }, pastorRes);

    expect(mockMeeting.find).toHaveBeenLastCalledWith(expect.objectContaining({ pastorId }));
    expect(pastorRes.body.message).toBe("Processed 0 reminder(s).");
  });

  it("uses empty reminder emails when populated users are missing", async () => {
    const meeting = {
      _id: oid(),
      scheduledFor: new Date("2026-04-15T15:00:00.000Z"),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockRequester({ _id: oid(), role: "leader" });
    mockReminderList([meeting]);
    const res = createMockRes();

    await runMeetingReminders({ userId: "leader" }, res);

    expect(res.body.reminders[0]).toEqual(expect.objectContaining({ memberEmail: "", pastorEmail: "" }));
  });

  it("rejects reminder access for members and handles reminder errors", async () => {
    mockRequester({ _id: oid(), role: "member" });
    const forbiddenRes = createMockRes();

    await runMeetingReminders({ userId: "m1" }, forbiddenRes);

    expect(forbiddenRes.statusCode).toBe(403);

    mockUser.findById.mockImplementationOnce(() => {
      throw new Error("reminder failed");
    });
    const errorRes = createMockRes();

    await runMeetingReminders({ userId: "admin" }, errorRes);

    expect(errorRes.statusCode).toBe(500);
  });
});
