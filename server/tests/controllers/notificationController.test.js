import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockNotification = {
  insertMany: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

const mockUser = {
  find: jest.fn(),
};

jest.unstable_mockModule("../../models/Notifications.js", () => ({ default: mockNotification }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: mockUser }));

const {
  sendAnnouncement,
  getMyNotifications,
  markNotificationRead,
} = await import("../../controllers/notificationController.js");

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

describe("Notification Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rejects blank announcement messages", async () => {
    const res = createMockRes();

    await sendAnnouncement({ body: { title: "Update", message: "   " } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Announcement message is required.");
  });

  it("returns success with zero recipients when no active members exist", async () => {
    mockUser.find.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    });
    const res = createMockRes();

    await sendAnnouncement({ body: { message: "Hello members" } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(0);
    expect(mockNotification.insertMany).not.toHaveBeenCalled();
  });

  it("creates an announcement notification for each active member", async () => {
    mockUser.find.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: "u1" }, { _id: "u2" }]) }),
    });
    mockNotification.insertMany.mockResolvedValue([{ _id: "n1" }, { _id: "n2" }]);
    const res = createMockRes();

    await sendAnnouncement({ body: { title: "  Service Update  ", message: "  New time Sunday.  " } }, res);

    expect(mockUser.find).toHaveBeenCalledWith({ role: "member", status: "active" });
    expect(mockNotification.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: "u1", type: "announcement", title: "Service Update", message: "New time Sunday." }),
      expect.objectContaining({ userId: "u2", type: "announcement", title: "Service Update", message: "New time Sunday." }),
    ]);
    expect(res.statusCode).toBe(201);
    expect(res.body.count).toBe(2);
  });

  it("loads current user notifications with unread count", async () => {
    const notifications = [{ _id: "n1", read: false }, { _id: "n2", read: true }];
    mockNotification.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(notifications) }),
      }),
    });
    const res = createMockRes();

    await getMyNotifications({ userId: "u1" }, res);

    expect(mockNotification.find).toHaveBeenCalledWith({
      userId: "u1",
      timeSent: { $gte: expect.any(Date) },
    });
    expect(res.body.count).toBe(2);
    expect(res.body.unreadCount).toBe(1);
  });

  it("marks a notification as read for the current user", async () => {
    mockNotification.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: "n1", read: true }),
    });
    const res = createMockRes();

    await markNotificationRead({ userId: "u1", params: { id: "n1" } }, res);

    expect(mockNotification.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "n1", userId: "u1" },
      { read: true },
      { new: true }
    );
    expect(res.body.message).toBe("Notification marked as read.");
  });

  it("returns 404 when marking a missing notification read", async () => {
    mockNotification.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    const res = createMockRes();

    await markNotificationRead({ userId: "u1", params: { id: "missing" } }, res);

    expect(res.statusCode).toBe(404);
  });
});
