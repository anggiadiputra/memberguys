import { Hono } from "hono";
import { db } from "../db/index.js";
import { services } from "../db/schema.js";
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

// GET /api/services/:slug
app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const row = await db.query.services.findFirst({
    where: eq(services.slug, slug),
    with: { packages: true },
  });
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

export default app;
