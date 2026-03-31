import { describe, expect, it } from "@jest/globals";
import { getDatabaseHealth, getMongoReadyStateLabel } from "../src/db.js";

describe("db utilities", () => {
  it("maps mongoose ready states to readable labels", () => {
    expect(getMongoReadyStateLabel(0)).toBe("disconnected");
    expect(getMongoReadyStateLabel(1)).toBe("connected");
    expect(getMongoReadyStateLabel(2)).toBe("connecting");
    expect(getMongoReadyStateLabel(3)).toBe("disconnecting");
    expect(getMongoReadyStateLabel(99)).toBe("unknown");
  });

  it("reports healthy database details when connected", () => {
    const health = getDatabaseHealth({
      connection: {
        readyState: 1,
        host: "localhost",
        name: "gloryharbor",
      },
    });

    expect(health).toEqual({
      status: "up",
      readyState: 1,
      state: "connected",
      host: "localhost",
      name: "gloryharbor",
    });
  });

  it("reports unhealthy database details when disconnected", () => {
    const health = getDatabaseHealth({
      connection: {
        readyState: 0,
      },
    });

    expect(health).toEqual({
      status: "down",
      readyState: 0,
      state: "disconnected",
      host: "",
      name: "",
    });
  });
});
