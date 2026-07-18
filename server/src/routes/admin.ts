import { Hono } from "hono";
import { db } from "../db/index.js";
import { users, transactions, subscriptions, services, packages } from "../db/schema.js";
import { count, eq, desc } from "drizzle-orm";

const app = new Hono();

// GET /api/admin/stats
app.get("/stats", async (c) => {
  const [totalUsers] = await db.select({ count: count() }).from(users);
  const [totalTransactions] = await db.select({ count: count() }).from(transactions);
  const [activeSubscriptions] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));
  const [pendingTransactions] = await db
    .select({ count: count() })
    .from(transactions)
    .where(eq(transactions.status, "pending"));

  return c.json({
    totalUsers: totalUsers.count,
    totalTransactions: totalTransactions.count,
    activeSubscriptions: activeSubscriptions.count,
    pendingTransactions: pendingTransactions.count,
  });
});

// GET /api/admin/transactions
app.get("/transactions", async (c) => {
  const rows = await db.query.transactions.findMany({
    with: { user: true, package: { with: { service: true } } },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 50,
  });
  return c.json(rows);
});

// GET /api/admin/users
app.get("/users", async (c) => {
  const rows = await db.query.users.findMany({
    orderBy: (u, { desc }) => [desc(u.createdAt)],
  });
  return c.json(rows);
});

// POST /api/admin/services — tambah layanan baru
app.post("/services", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(services).values(body).returning();
  return c.json(row, 201);
});

// POST /api/admin/packages — tambah paket baru
app.post("/packages", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(packages).values(body).returning();
  return c.json(row, 201);
});

export default app;
