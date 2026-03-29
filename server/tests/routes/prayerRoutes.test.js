import { describe, it, expect } from "@jest/globals";
import router from "../../routes/prayerRoutes.js";

const getRoutes = () =>
  router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: layer.route.methods,
      middlewareCount: layer.route.stack.length,
    }));

describe("Prayer Routes", () => {
  it("should register GET / with auth middleware", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/" && item.methods.get);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });

  it("should register POST / with auth middleware", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/" && item.methods.post);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });

  it("should register PATCH /:id with auth middleware", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/:id" && item.methods.patch);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });

  it("should register DELETE /:id with auth middleware", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/:id" && item.methods.delete);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });
});
