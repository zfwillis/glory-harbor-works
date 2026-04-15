import { describe, expect, it } from "@jest/globals";
import mongoose from "mongoose";
import CalendlyMeetingAction from "../../models/CalendlyMeetingAction.js";

describe("CalendlyMeetingAction Model", () => {
  it("creates a valid Calendly meeting action", () => {
    const updatedBy = new mongoose.Types.ObjectId();
    const action = new CalendlyMeetingAction({
      eventUuid: "  event-123  ",
      meetingUri: "  https://api.calendly.com/scheduled_events/event-123  ",
      action: "approved",
      updatedBy,
    });

    expect(action.eventUuid).toBe("event-123");
    expect(action.meetingUri).toBe("https://api.calendly.com/scheduled_events/event-123");
    expect(action.action).toBe("approved");
    expect(action.updatedBy).toEqual(updatedBy);
  });

  it("requires eventUuid, action, and updatedBy", () => {
    const action = new CalendlyMeetingAction({});
    const error = action.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.eventUuid).toBeDefined();
    expect(error.errors.action).toBeDefined();
    expect(error.errors.updatedBy).toBeDefined();
  });

  it("rejects invalid action values", () => {
    const action = new CalendlyMeetingAction({
      eventUuid: "event-123",
      action: "maybe",
      updatedBy: new mongoose.Types.ObjectId(),
    });
    const error = action.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.action).toBeDefined();
  });
});
