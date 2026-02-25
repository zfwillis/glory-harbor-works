import { describe, it, expect } from "@jest/globals";
import router from "../../routes/contactRoutes.js";

const getRoutes = () =>
  router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: layer.route.methods,
      middlewareCount: layer.route.stack.length,
    }));

describe("Contact Routes", () => {
  it("should register POST / for contact form submission", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/" && item.methods.post);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBe(1);
  });

  it("should register GET / with auth and role middleware", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/" && item.methods.get);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(3);
  });

  it("should register PATCH /:id/status with auth and role middleware", () => {
    const routes = getRoutes();
    const route = routes.find((item) => item.path === "/:id/status" && item.methods.patch);

    expect(route).toBeDefined();
    expect(route.middlewareCount).toBeGreaterThanOrEqual(3);
  });
});
