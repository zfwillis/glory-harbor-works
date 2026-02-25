import { describe, it, expect } from "@jest/globals";
import router from "../../routes/sermonRoutes.js";

describe("Sermon Routes", () => {
  it("should export an express router", () => {
    expect(router).toBeDefined();
    expect(Array.isArray(router.stack)).toBe(true);
  });

  it("should register GET / route", () => {
    const hasGetRoot = router.stack.some(
      (layer) => layer.route?.path === "/" && layer.route?.methods?.get
    );

    expect(hasGetRoot).toBe(true);
  });

  it("should register POST / route", () => {
    const hasPostRoot = router.stack.some(
      (layer) => layer.route?.path === "/" && layer.route?.methods?.post
    );

    expect(hasPostRoot).toBe(true);
  });

  it("should register PATCH /:id route", () => {
    const hasPatch = router.stack.some(
      (layer) => layer.route?.path === "/:id" && layer.route?.methods?.patch
    );

    expect(hasPatch).toBe(true);
  });

  it("should register DELETE /:id route", () => {
    const hasDelete = router.stack.some(
      (layer) => layer.route?.path === "/:id" && layer.route?.methods?.delete
    );

    expect(hasDelete).toBe(true);
  });

  it("should register like/unlike routes", () => {
    const hasLike = router.stack.some(
      (layer) => layer.route?.path === "/:id/like" && layer.route?.methods?.post
    );
    const hasUnlike = router.stack.some(
      (layer) => layer.route?.path === "/:id/like" && layer.route?.methods?.delete
    );

    expect(hasLike).toBe(true);
    expect(hasUnlike).toBe(true);
  });
});
