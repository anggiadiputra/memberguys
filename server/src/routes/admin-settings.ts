import { Hono } from "hono";
import { db } from "../db/index.js";
import { users, settings } from "../db/schema.js";
import { eq } from "drizzle-orm";

const app = new Hono();

// Helper: Ambil config dari database (merger dengan environment variables sebagai fallback)
export async function getPaymentConfig() {
  const defaultCfg = {
    apiKey: process.env.SUMOPOD_API_KEY || "",
    webhookSecret: process.env.SUMOPOD_WEBHOOK_SECRET || "",
    webhookToken: process.env.SUMOPOD_WEBHOOK_TOKEN || "",
    successUrl: process.env.SUMOPOD_SUCCESS_URL || "",
    cancelUrl: process.env.SUMOPOD_CANCEL_URL || "",
    isSandbox: process.env.SUMOPOD_SANDBOX !== "false",
  };

  try {
    const row = await db.query.settings.findFirst({
      where: eq(settings.key, "payment_gateway"),
    });

    if (row && row.value) {
      return { ...defaultCfg, ...(row.value as any) };
    }
  } catch (e) {
    console.error("Gagal membaca settings dari database:", e);
  }

  return defaultCfg;
}

app.use("*", async (c, next) => {
  const adminId = c.req.header("X-Admin-Id");
  if (!adminId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, adminId) });
    if (!user || user.role !== "admin") return c.json({ error: "Forbidden" }, 403);
  } catch (err: any) {
    console.error("DB Error in admin check:", err.message);
    return c.json({ error: "Internal Server Error during DB check" }, 500);
  }
  await next();
});

app.get("/payment", async (c) => {
  const config = await getPaymentConfig();
  // Jangan kembalikan API key/secret secara penuh ke frontend
  return c.json({
    ...config,
    apiKey: config.apiKey ? "••••" + config.apiKey.slice(-6) : "",
    webhookSecret: config.webhookSecret ? "••••••••" : "",
    webhookToken: config.webhookToken ? "••••••••" : "",
  });
});

app.post("/payment", async (c) => {
  const body = await c.req.json<any>();
  const currentConfig = await getPaymentConfig();

  // Merge dan pertahankan nilai lama jika frontend mengirim value "••••"
  const newConfig = { ...currentConfig };
  if (body.apiKey && !body.apiKey.startsWith("••••")) newConfig.apiKey = body.apiKey;
  if (body.webhookSecret && !body.webhookSecret.startsWith("••••")) newConfig.webhookSecret = body.webhookSecret;
  if (body.webhookToken && !body.webhookToken.startsWith("••••")) newConfig.webhookToken = body.webhookToken;
  if (body.successUrl !== undefined) newConfig.successUrl = body.successUrl;
  if (body.cancelUrl !== undefined) newConfig.cancelUrl = body.cancelUrl;
  if (body.isSandbox !== undefined) newConfig.isSandbox = body.isSandbox;

  // Simpan permanen ke tabel settings (Upsert)
  await db
    .insert(settings)
    .values({
      key: "payment_gateway",
      value: newConfig,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: newConfig,
        updatedAt: new Date(),
      },
    });

  return c.json({ status: "saved" });
});

app.post("/payment/test", async (c) => {
  const body = await c.req.json<{ apiKey?: string; isSandbox?: boolean }>();
  const currentConfig = await getPaymentConfig();
  
  const isMasked = body.apiKey && body.apiKey.startsWith("••••");
  const key = (!body.apiKey || isMasked) ? currentConfig.apiKey : body.apiKey;
  const sandbox = body.isSandbox ?? currentConfig.isSandbox;
  
  const baseUrl = sandbox
    ? "https://api-pay-sandbox.sumopod.com"
    : "https://api-pay.sumopod.com";

  try {
    const res = await fetch(`${baseUrl}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": key,
      },
      body: JSON.stringify({
        order_id: `TEST-${Date.now()}`,
        amount: 1000,
        currency: "IDR",
        expires_in_hours: 1,
        success_return_url: "https://example.com/success",
        cancel_return_url: "https://example.com/cancel",
        payment_method_type_code: "QRIS",
      }),
    });

    if (res.status === 401 || res.status === 403) {
      return c.json({ error: "Invalid API Key" }, 401);
    }

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`API ditolak (${res.status}): ${txt}`);
    }

    return c.json({ status: "ok", httpStatus: res.status });
  } catch (err: any) {
    return c.json({ error: err.message || "Network Error" }, 502);
  }
});

export default app;
