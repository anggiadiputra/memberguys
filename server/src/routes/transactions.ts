import { Hono } from "hono";
import { db } from "../db/index.js";
import { transactions, packages, users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { getPaymentConfig } from "./admin-settings.js";
import { markTransactionPaid, generateTransactionId } from "../lib/transactions.js";

const app = new Hono();

// ─── Helper: Panggil SumoPod API ─────────────────────────
// Mengembalikan { fee, paymentUrl, externalRefId } atau throw.
// Tidak menyentuh database — murni komunikasi dengan SumoPod.
// method: "qris" (via SumoPod) atau "manual" (via WhatsApp, tanpa fee)
async function callSumoPod(
  transactionId: string,
  amount: number,
  method: "qris" | "manual" = "qris"
): Promise<{
  fee: number | null;
  totalAmount: number;
  paymentUrl: string;
  externalRefId: string | null;
}> {
  const paymentConfig = await getPaymentConfig();

  // Manual payment — tanpa redirect ke payment gateway
  if (method === "manual") {
    return {
      fee: 0,
      totalAmount: amount,
      paymentUrl: "",
      externalRefId: null,
    };
  }

  console.log("[SumoPod Debug] Config Status:", {
    hasApiKey: !!paymentConfig.apiKey,
    apiKeyLength: paymentConfig.apiKey?.length || 0,
    isSandbox: paymentConfig.isSandbox,
  });

  if (!paymentConfig.apiKey) {
    throw new Error("SumoPod API Key belum dikonfigurasi admin. Pilih metode Manual atau hubungi admin.");
  }

  const baseUrl = paymentConfig.isSandbox
    ? "https://api-pay-sandbox.sumopod.com"
    : "https://api-pay.sumopod.com";

  const envHost = process.env.CLIENT_URL || "http://localhost:5173";
  const host = envHost.startsWith("http://localhost")
    ? "https://localhost.app.ekstensi.id"
    : envHost;

  const successUrl = paymentConfig.successUrl || `${host}/payment/success?order_id=${transactionId}`;
  const cancelUrl = paymentConfig.cancelUrl || `${host}/payment/cancel?order_id=${transactionId}`;

  const sumopodPayload = {
    order_id: transactionId,
    amount,
    currency: "IDR",
    expires_in_hours: 24,
    success_return_url: successUrl,
    cancel_return_url: cancelUrl,
    payment_method_type_code: "QRIS",
  };

  console.log("[SumoPod Debug] Payload:", sumopodPayload);

  const res = await fetch(`${baseUrl}/api/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": paymentConfig.apiKey,
    },
    body: JSON.stringify(sumopodPayload),
  });

  if (!res.ok) {
    const errorData = await res.text();
    console.error(`[SumoPod Error] ${res.status}: ${errorData}`);
    throw new Error(`SumoPod menolak pembayaran: ${res.statusText}`);
  }

  const sumopodData = await res.json();
  console.log("[SumoPod Debug] Response:", sumopodData);

  const fee = typeof sumopodData.fee === "number" ? sumopodData.fee : null;
  return {
    fee,
    totalAmount: fee != null ? amount + fee : amount,
    paymentUrl: sumopodData.payment_link_url,
    externalRefId: sumopodData.payment_id,
  };
}

// ─── Helper: Get or Create Shadow User ───────────────────
// Jika email sudah ada, kembalikan ID-nya (dan update WA jika belum ada/berbeda).
// Jika belum ada, buat shadow user (guest).
async function getOrCreateUser(name: string, email: string, whatsapp: string): Promise<string> {
  const newId = `guest-${crypto.randomUUID()}`;
  const now = new Date();

  // Atomic upsert — one statement, no race window.
  // ON CONFLICT: jika email sudah ada, update name & whatsapp, kembalikan id yang sudah ada.
  const [user] = await db
    .insert(users)
    .values({
      id: newId,
      name,
      email,
      whatsapp,
      emailVerified: false,
      role: "user",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name,
        whatsapp,
        updatedAt: now,
      },
    })
    .returning({ id: users.id });

  return user.id;
}

// ─── Routes ──────────────────────────────────────────────

// GET /api/transactions?userId=xxx — riwayat transaksi user
app.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "userId required" }, 400);

  const rows = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    with: { package: { with: { service: true } } },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return c.json(rows);
});

// POST /api/checkout — hitung fee & dapatkan payment link (TANPA insert DB)
// Frontend panggil ini dulu → tampilkan modal fee breakdown → user konfirmasi
app.post("/checkout", async (c) => {
  const body = await c.req.json<{ 
    packageId: string; 
    method?: "qris" | "manual";
    name?: string;
    email?: string;
    whatsapp?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }>();
  const { packageId, method, name, email, whatsapp, utmSource, utmMedium, utmCampaign } = body;

  if (!packageId) {
    return c.json({ error: "packageId wajib diisi" }, 400);
  }
  if (!name || !email || !whatsapp) {
    return c.json({ error: "Nama, email, dan WhatsApp wajib diisi" }, 400);
  }

  const pkg = await db.query.packages.findFirst({
    where: eq(packages.id, packageId),
  });
  if (!pkg) return c.json({ error: "Package not found" }, 404);

  const transactionId = generateTransactionId();

  const { fee, totalAmount, paymentUrl, externalRefId } = await callSumoPod(transactionId, pkg.price, method || "qris");

  // Ambil konfigurasi payment untuk kasih tau frontend metode apa saja yang tersedia
  const paymentCfg = await getPaymentConfig();

  // paymentMethod untuk disimpan di DB dan ditampilkan di invoice
  const checkoutPaymentMethod = method === "manual" ? "manual" : "qris";

  return c.json({
    transactionId,
    amount: pkg.price,
    fee,
    totalAmount,
    paymentUrl,
    externalRefId,
    paymentMethod: checkoutPaymentMethod,
    manualPaymentEnabled: paymentCfg.manualPaymentEnabled,
    bankAccounts: paymentCfg.bankAccounts || [],
  });
});

// POST /api/transactions — buat transaksi baru
app.post("/", async (c) => {
  const body = await c.req.json<{
    packageId: string;
    method?: "qris" | "manual";
    name: string;
    email: string;
    whatsapp: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    notes?: string;
    transactionId?: string; // reuse from /checkout
    paymentUrl?: string;
    externalRefId?: string | null;
    fee?: number | null;
  }>();
  const { packageId, method, name, email, whatsapp, notes, utmSource, utmMedium, utmCampaign, transactionId: existingTransactionId, paymentUrl: existingPaymentUrl, externalRefId: existingExternalRefId, fee: existingFee } = body;

  if (!packageId || !name || !email || !whatsapp) {
    return c.json({ error: "Data pelanggan dan paket wajib diisi" }, 400);
  }

  // Shadow User / Guest Checkout logic
  const resolvedUserId = await getOrCreateUser(name, email, whatsapp);

  const pkg = await db.query.packages.findFirst({
    where: eq(packages.id, packageId),
  });
  if (!pkg) return c.json({ error: "Package not found" }, 404);

  // Gunakan ID dari checkout jika disediakan, kalau tidak buat baru
  const transactionId = existingTransactionId || generateTransactionId();

  let paymentUrl = existingPaymentUrl || "";
  let externalRefId = existingExternalRefId ?? null;
  let fee = existingFee !== undefined ? existingFee : null;

  // Jika belum ada data (langsung tanpa /checkout), panggil helper
  if (!paymentUrl || !existingTransactionId) {
    const sumoRes = await callSumoPod(transactionId, pkg.price, method || "qris");
    paymentUrl = sumoRes.paymentUrl;
    externalRefId = sumoRes.externalRefId;
    fee = sumoRes.fee;
  }

  const paymentMethod = method === "manual" ? "manual" : (externalRefId ? "qris" : "manual");

  const [trx] = await db
    .insert(transactions)
    .values({
      id: transactionId,
      userId: resolvedUserId,
      packageId,
      amount: pkg.price,
      fee,
      paymentMethod,
      status: "pending",
      paymentUrl,
      externalRefId,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      notes: notes || null,
    })
    .returning();

  return c.json({ transaction: trx, paymentUrl, fee }, 201);
});

// PATCH /api/transactions/:id/confirm — admin konfirmasi pembayaran (manual)
app.patch("/:id/confirm", async (c) => {
  const id = c.req.param("id");

  const result = await markTransactionPaid(id);

  if (result.status === "not_found") {
    return c.json({ error: "Transaksi tidak ditemukan atau sudah diproses" }, 404);
  }

  // Subscription/garansi diaktifkan manual oleh admin.
  return c.json({ status: "confirmed" });
});

export default app;
