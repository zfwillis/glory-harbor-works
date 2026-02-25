import { describe, it, expect } from "@jest/globals";
import router from "../../routes/authRoutes.js";

const getRoutes = () =>
  router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: layer.route.methods,
      middlewareCount: layer.route.stack.length,
    }));

describe("Auth Routes", () => {
  it("should register POST /register as public route", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/register" && item.methods.post);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBe(1);
  });

  it("should register POST /login as public route", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/login" && item.methods.post);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBe(1);
  });

  it("should register POST /logout as public route", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/logout" && item.methods.post);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBe(1);
  });

  it("should register GET /me with auth middleware", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/me" && item.methods.get);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(2);
  });
});
