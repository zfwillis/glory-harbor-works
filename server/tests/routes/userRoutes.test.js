import { describe, it, expect } from "@jest/globals";
import router from "../../routes/userRoutes.js";

const getRoutes = () =>
  router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: layer.route.methods,
      middlewareCount: layer.route.stack.length,
    }));

describe("User Routes", () => {
  it("should register GET / with auth middleware", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/" && item.methods.get);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });

  it("should register GET /me with auth middleware", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/me" && item.methods.get);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });

  it("should register GET /email/:email with auth middleware", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/email/:email" && item.methods.get);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });

  it("should register GET /role/:role with auth middleware", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/role/:role" && item.methods.get);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });

  it("should register GET /:id with auth middleware", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/:id" && item.methods.get);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });

  it("should register PUT /:id with auth middleware", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/:id" && item.methods.put);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });

  it("should register PATCH /:id/role with auth middleware", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/:id/role" && item.methods.patch);

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
