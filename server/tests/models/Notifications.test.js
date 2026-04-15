import { describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";
import Notification from "../../models/Notifications.js";

describe("Notification Model", () => {
  it("creates a notification with defaults and trims strings", () => {
    const userId = new mongoose.Types.ObjectId();
    const notification = new Notification({
      userId,
      type: "meeting",
      contact: "  parent@example.com  ",
      message: "  Meeting reminder  ",
    });

    expect(notification.userId).toEqual(userId);
    expect(notification.type).toBe("meeting");
    expect(notification.contact).toBe("parent@example.com");
    expect(notification.message).toBe("Meeting reminder");
    expect(notification.read).toBe(false);
    expect(notification.timeSent).toBeInstanceOf(Date);
  });

  it("requires userId and message", () => {
    const notification = new Notification({});
    const error = notification.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.userId).toBeDefined();
    expect(error.errors.message).toBeDefined();
  });

  it("rejects invalid notification type", () => {
    const notification = new Notification({
      userId: new mongoose.Types.ObjectId(),
      message: "Hello",
      type: "invalid",
    });
    const error = notification.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.type).toBeDefined();
  });
});
