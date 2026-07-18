import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import "dotenv/config";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { eq } from "drizzle-orm";

import servicesRoutes from "./routes/services.js";
import packagesRoutes from "./routes/packages.js";
import transactionsRoutes from "./routes/transactions.js";
import subscriptionsRoutes from "./routes/subscriptions.js";
import adminRoutes from "./routes/admin.js";
import adminSettingsRoutes from "./routes/admin-settings.js";
import usersRoutes from "./routes/users.js";
import webhooksRoutes from "./routes/webhooks.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.get("/api/health", (c) => c.json({ status: "ok" }));

// Webhook routes
app.route("/api/webhooks", webhooksRoutes);

// Middleware untuk memproteksi semua rute admin
app.use("/api/admin/*", async (c, next) => {
  const adminId = c.req.header("X-Admin-Id");
  if (!adminId) return c.json({ error: "Unauthorized" }, 401);

  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, adminId) });
    if (!user) return c.json({ error: "Forbidden: User not synced" }, 403);
    
    if (user.role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, adminId));
    }
  } catch (err: any) {
    console.error("DB Error in admin check:", err.message);
    return c.json({ error: "Internal Server Error during DB check" }, 500);
  }
  
  await next();
});

app.route("/api/users", usersRoutes);
app.route("/api/services", servicesRoutes);
app.route("/api/packages", packagesRoutes);
app.route("/api/transactions", transactionsRoutes);
app.route("/api/subscriptions", subscriptionsRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/admin/settings", adminSettingsRoutes);

export default app;

