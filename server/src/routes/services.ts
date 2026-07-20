import { Hono } from "hono";
import { db } from "../db/index.js";
import { services, packages } from "../db/schema.js";
import { eq } from "drizzle-orm";

const app = new Hono();

// GET /api/services — list all active services with packages
app.get("/", async (c) => {
  const rows = await db.query.services.findMany({
    where: eq(services.isActive, true),
    with: { packages: true },
  });
  return c.json(rows);
});

// GET /api/services/:slug — return single service with packages
app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const row = await db.query.services.findFirst({
    where: eq(services.slug, slug),
    with: { packages: true },
  });
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// GET /api/packages/public/:serviceSlug/:packageSlug — single package by slugs
app.get("/packages/public/:serviceSlug/:packageSlug", async (c) => {
  const { serviceSlug, packageSlug } = c.req.param();
  const svc = await db.query.services.findFirst({ where: eq(services.slug, serviceSlug) });
  if (!svc) return c.json({ error: "Service not found" }, 404);
  const pkg = await db.query.packages.findFirst({
    where: eq(packages.slug, packageSlug),
    with: { service: true },
  });
  if (!pkg || pkg.serviceId !== svc.id) return c.json({ error: "Package not found" }, 404);
  return c.json({ service: svc, package: pkg });
});

export default app;
