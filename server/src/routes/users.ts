import { Hono } from "hono";
import { db } from "../db/index.js";
import { users, transactions, subscriptions } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

const app = new Hono();

// POST /api/users/sync — Upsert user from client side auth state
app.post("/sync", async (c) => {
  const body = await c.req.json<{
    id: string;
    email: string;
    name?: string;
    image?: string;
    emailVerified?: boolean;
    createdAt?: string;
    updatedAt?: string;
    role?: string; // Menangkap role dari auth proxy (Neon Auth)
  }>();

  if (!body.id || !body.email) {
    return c.json({ error: "id and email required" }, 400);
  }

  const now = new Date();

  // Upsert (Insert if not exists, do nothing on conflict since auth handles updates)
  await db
    .insert(users)
    .values({
      id: body.id,
      email: body.email,
      name: body.name || body.email.split("@")[0],
      image: body.image || null,
      emailVerified: body.emailVerified ?? false,
      createdAt: body.createdAt ? new Date(body.createdAt) : now,
      updatedAt: body.updatedAt ? new Date(body.updatedAt) : now,
      role: body.role === "admin" ? "admin" : "user", // Mengikuti role dari token
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: body.name || body.email.split("@")[0],
        image: body.image || null,
        updatedAt: now,
        role: body.role === "admin" ? "admin" : undefined, // Auto promote jika diubah di Neon Auth
      },
    });

  return c.json({ status: "synced" });
});

// GET /api/users/me — profil + transaksi + subscription
app.get("/me", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId required" }, 400);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) return c.json({ error: "User not found" }, 404);

  const trxList = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    with: { package: { with: { service: true } } },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const subList = await db.query.subscriptions.findMany({
    where: eq(subscriptions.userId, userId),
    with: { package: { with: { service: true } } },
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  });

  return c.json({ user, transactions: trxList, subscriptions: subList });
});

export default app;
