import { describe, it, expect } from "@jest/globals";
import router from "../../routes/sermonRoutes.js";

const getRoutes = () =>
  router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: layer.route.methods,
      middlewareCount: layer.route.stack.length,
    }));

describe("Sermon Routes", () => {
  it("should register GET /", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/" && item.methods.get);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });

  it("should register POST /:id/like", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/:id/like" && item.methods.post);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });

  it("should register DELETE /:id/like", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/:id/like" && item.methods.delete);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });
});
