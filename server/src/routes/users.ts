import { Hono } from "hono";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

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

export default app;
