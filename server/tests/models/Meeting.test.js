import { describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";
import Meeting from "../../models/Meeting.js";

describe("Meeting Model", () => {
  it("creates a meeting with defaults and trims text fields", () => {
    const memberId = new mongoose.Types.ObjectId();
    const pastorId = new mongoose.Types.ObjectId();
    const meeting = new Meeting({
      memberId,
      pastorId,
      title: "  Care Meeting  ",
      notes: "  Bring notes  ",
      scheduledFor: new Date("2026-04-20T18:00:00.000Z"),
      reminderMeta: "  Reminder note  ",
    });

    expect(meeting.memberId).toEqual(memberId);
    expect(meeting.pastorId).toEqual(pastorId);
    expect(meeting.title).toBe("Care Meeting");
    expect(meeting.notes).toBe("Bring notes");
    expect(meeting.durationMinutes).toBe(30);
    expect(meeting.status).toBe("pending");
    expect(meeting.reminderSentAt).toBeNull();
    expect(meeting.reminderMeta).toBe("Reminder note");
  });

  it("requires member, pastor, and schedule date", () => {
    const meeting = new Meeting({});
    const error = meeting.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.memberId).toBeDefined();
    expect(error.errors.pastorId).toBeDefined();
    expect(error.errors.scheduledFor).toBeDefined();
  });

  it("rejects invalid duration and status values", () => {
    const meeting = new Meeting({
      memberId: new mongoose.Types.ObjectId(),
      pastorId: new mongoose.Types.ObjectId(),
      scheduledFor: new Date("2026-04-20T18:00:00.000Z"),
      durationMinutes: 5,
      status: "unknown",
    });
    const error = meeting.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.durationMinutes).toBeDefined();
    expect(error.errors.status).toBeDefined();
  });
});
