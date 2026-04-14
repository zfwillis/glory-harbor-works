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
  approveOrDeclineMeeting,
  cancelMeeting,
  updatePastorAvailability,
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

describe("Meeting Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("rejects non-member meeting creation", async () => {
    mockRequester({ _id: oid(), role: "pastor" });
    const res = createMockRes();

    await createMeeting({ userId: "p1", body: { pastorId: oid(), scheduledFor: "2026-04-20T14:00:00.000Z" } }, res);

    expect(res.statusCode).toBe(403);
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
});
