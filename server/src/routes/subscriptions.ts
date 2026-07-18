import { Hono } from "hono";
import { db } from "../db/index.js";
import { subscriptions } from "../db/schema.js";
import { eq } from "drizzle-orm";

const app = new Hono();

// GET /api/subscriptions?userId=xxx
app.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId required" }, 400);

  const rows = await db.query.subscriptions.findMany({
    where: eq(subscriptions.userId, userId),
    with: { package: { with: { service: true } } },
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  });
  return c.json(rows);
});

export default app;
