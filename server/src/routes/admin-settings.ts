import { Hono } from "hono";
import { db } from "../db/index.js";
import { users, settings } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { sendFonnteMessage } from "../lib/fonnte.js";

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
    manualPaymentEnabled: false,
    bankAccounts: [] as Array<{
      bankName: string;
      accountNumber: string;
      accountHolder: string;
    }>,
    fonnteToken: process.env.FONNTE_TOKEN || "",
    adminWhatsApp: process.env.ADMIN_WHATSAPP || "",
    ga4Id: process.env.GA4_ID || "",
    gtmId: process.env.GTM_ID || "",
    fbPixelId: process.env.FB_PIXEL_ID || "",
    trackingEnabled: false,
  };

  try {
    const row = await db.query.settings.findFirst({
      where: eq(settings.key, "payment_gateway"),
    });

    if (row && row.value) {
      return { ...defaultCfg, ...(row.value as any), _version: row.version };
    }
  } catch (e) {
    console.error("Gagal membaca settings dari database:", e);
  }

  return { ...defaultCfg, _version: 0 };
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
    fonnteToken: config.fonnteToken ? "••••" + config.fonnteToken.slice(-6) : "",
  });
});

app.post("/payment", async (c) => {
  const body = await c.req.json<any>();
  const currentConfig = await getPaymentConfig();

  // Merge dan pertahankan nilai lama jika frontend mengirim value "••••"
  const newConfig: any = { ...currentConfig };
  // _version ditahan di kolom terpisah (settings.version), jangan dibawa ke jsonb.
  delete newConfig._version;
  if (body.apiKey && !body.apiKey.startsWith("••••")) newConfig.apiKey = body.apiKey;
  if (body.webhookSecret && !body.webhookSecret.startsWith("••••")) newConfig.webhookSecret = body.webhookSecret;
  if (body.webhookToken && !body.webhookToken.startsWith("••••")) newConfig.webhookToken = body.webhookToken;
  if (body.successUrl !== undefined) newConfig.successUrl = body.successUrl;
  if (body.cancelUrl !== undefined) newConfig.cancelUrl = body.cancelUrl;
  if (body.isSandbox !== undefined) newConfig.isSandbox = body.isSandbox;
  if (body.manualPaymentEnabled !== undefined) newConfig.manualPaymentEnabled = body.manualPaymentEnabled;
  if (body.bankAccounts !== undefined) newConfig.bankAccounts = body.bankAccounts;
  if (body.fonnteToken !== undefined) newConfig.fonnteToken = body.fonnteToken.startsWith("••••") ? currentConfig.fonnteToken : body.fonnteToken;
  if (body.adminWhatsApp !== undefined) newConfig.adminWhatsApp = body.adminWhatsApp;
  if (body.ga4Id !== undefined) newConfig.ga4Id = body.ga4Id;
  if (body.gtmId !== undefined) newConfig.gtmId = body.gtmId;
  if (body.fbPixelId !== undefined) newConfig.fbPixelId = body.fbPixelId;
  if (body.trackingEnabled !== undefined) newConfig.trackingEnabled = body.trackingEnabled;

  // Optimistic concurrency: klien mengirim _version yang dia baca. Server hanya
  // menerima write kalau version di DB sama — race antar admin akan ditolak
  // dengan 409 supaya klien reload & retry. Jika klien tidak mengirim _version
  // (klien lama), pakai version terbaru yang dibaca server (best-effort compat).
  const clientVersion = typeof body._version === "number" ? body._version : currentConfig._version;
  const now = new Date();

  // UPDATE atomik bersyarat: hanya match kalau version di DB masih sama.
  const updated = await db
    .update(settings)
    .set({
      value: newConfig,
      updatedAt: now,
      version: clientVersion + 1,
    })
    .where(and(eq(settings.key, "payment_gateway"), eq(settings.version, clientVersion)))
    .returning();

  if (updated.length > 0) {
    return c.json({ status: "saved", _version: updated[0].version });
  }

  // Tidak ada row yang ter-update. Bedakan: row tidak ada vs version mismatch.
  const existing = await db.query.settings.findFirst({
    where: eq(settings.key, "payment_gateway"),
  });

  if (!existing) {
    // Row belum ada (first-time setup). Insert atomik; onConflictDoNothing
    // menangani race kalau admin lain insert tepat sebelum kita.
    const [row] = await db
      .insert(settings)
      .values({
        key: "payment_gateway",
        value: newConfig,
        updatedAt: now,
        version: 1,
      })
      .onConflictDoNothing({ target: settings.key })
      .returning();

    if (row) return c.json({ status: "saved", _version: row.version });

    return c.json({ error: "Config changed by another session. Please reload and retry.", conflict: true }, 409);
  }

  // Row ada tapi version berubah → lost-update terdeteksi.
  return c.json(
    { error: "Config was modified by another admin. Please reload and retry.", conflict: true, currentVersion: existing.version },
    409
  );
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

// POST /api/admin/settings/fonnte-test
app.post("/fonnte-test", async (c) => {
  const body = await c.req.json<{ token?: string; target?: string }>();
  const config = await getPaymentConfig();
  const t = body.token || config.fonnteToken || "";
  const n = body.target || config.adminWhatsApp || "";
  if (!t) return c.json({ error: "Token belum diisi" }, 400);
  if (!n) return c.json({ error: "Nomor tujuan belum diisi" }, 400);
  const ok = await sendFonnteMessage(n, "✅ Test WA dari MemberGuys berhasil!", t);
  if (ok) return c.json({ status: "ok" });
  return c.json({ error: "Gagal kirim. Cek token & nomor." }, 502);
});

export default app;
