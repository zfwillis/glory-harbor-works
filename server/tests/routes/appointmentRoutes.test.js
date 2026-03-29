import { describe, expect, it } from "@jest/globals";
import router from "../../routes/appointmentRoutes.js";

describe("Appointment Routes", () => {
  it("should export an express router", () => {
    expect(router).toBeDefined();
    expect(Array.isArray(router.stack)).toBe(true);
  });

  it("should register GET / route", () => {
    const hasRoute = router.stack.some(
      (layer) => layer.route?.path === "/" && layer.route?.methods?.get
    );

    expect(hasRoute).toBe(true);
  });

  it("should register POST / route", () => {
    const hasRoute = router.stack.some(
      (layer) => layer.route?.path === "/" && layer.route?.methods?.post
    );

    expect(hasRoute).toBe(true);
  });

  it("should register GET /pastor route", () => {
    const hasRoute = router.stack.some(
      (layer) => layer.route?.path === "/pastor" && layer.route?.methods?.get
    );

    expect(hasRoute).toBe(true);
  });

  it("should register PATCH /:id route", () => {
    const hasRoute = router.stack.some(
      (layer) => layer.route?.path === "/:id" && layer.route?.methods?.patch
    );

    expect(hasRoute).toBe(true);
  });

  it("should register PATCH /:id/status route", () => {
    const hasRoute = router.stack.some(
      (layer) => layer.route?.path === "/:id/status" && layer.route?.methods?.patch
    );

    expect(hasRoute).toBe(true);
  });

  it("should register DELETE /:id route", () => {
    const hasRoute = router.stack.some(
      (layer) => layer.route?.path === "/:id" && layer.route?.methods?.delete
    );

    expect(hasRoute).toBe(true);
  });
});
