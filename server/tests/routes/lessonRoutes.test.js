import { describe, expect, it } from "@jest/globals";
import router from "../../routes/lessonRoutes.js";

const getRoutes = () =>
  router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: layer.route.methods,
      middlewareCount: layer.route.stack.length,
    }));

describe("Lesson Routes", () => {
  it("registers GET / with auth middleware", () => {
    const route = getRoutes().find((item) => item.path === "/" && item.methods.get);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });

  it("registers GET /children/:childId/progress with auth middleware", () => {
    const route = getRoutes().find((item) => item.path === "/children/:childId/progress" && item.methods.get);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });

  it("registers POST /children/:childId/:lessonId/quiz with auth middleware", () => {
    const route = getRoutes().find((item) => item.path === "/children/:childId/:lessonId/quiz" && item.methods.post);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });
});
