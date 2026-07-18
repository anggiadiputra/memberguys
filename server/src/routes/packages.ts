import { Hono } from "hono";
import { db } from "../db/index.js";
import { packages } from "../db/schema.js";
import { eq } from "drizzle-orm";

const app = new Hono();

// GET /api/packages/:id
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await db.query.packages.findFirst({
    where: eq(packages.id, id),
    with: { service: true },
  });
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

export default app;
