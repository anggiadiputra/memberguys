import { Hono } from "hono";
import { db } from "../db/index.js";
import { transactions } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { getPaymentConfig } from "./admin-settings.js";
import { markTransactionPaid } from "../lib/transactions.js";

const app = new Hono();

// POST /api/webhooks/sumopod
app.post("/sumopod", async (c) => {
  const paymentConfig = await getPaymentConfig();

  // 1. Validasi Token (Jika dikonfigurasi)
  const expectedToken = paymentConfig.webhookToken;
  if (expectedToken) {
    const receivedToken = c.req.header("X-Webhook-Token");
    if (receivedToken !== expectedToken) {
      console.error("[Webhook] Invalid Token:", receivedToken);
      return c.json({ error: "Invalid webhook token" }, 401);
    }
  }

  // 2. Parse Body (SumoPod format)
  let body: any;
  try {
    body = await c.req.json();
  } catch (err) {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const { event_type, data } = body;

  // Tangani event test
  if (event_type === "payment.test") {
    console.log("[Webhook] Test event received!");
    return c.json({ status: "test_ok" }, 200);
  }

  // Tangani event success
  if (event_type === "payment.completed" && data?.order_id) {
    const trxId = data.order_id;
    console.log(`[Webhook] Payment completed for order: ${trxId}`);

    // Race-condition-safe: atomic conditional UPDATE via markTransactionPaid.
    // Payment gateway sering mengirim webhook berkali-kali (retry) — tanpa proteksi
    // ini, setiap retry akan membuat subscription duplikat untuk transaksi yang sama.
    const result = await markTransactionPaid(trxId, {
      externalRefId: data.payment_id || null,
      fee: typeof data.fee === "number" ? data.fee : null,
    });

    if (result.status === "not_found") {
      console.warn(`[Webhook] Transaction ${trxId} not found in database.`);
      return c.json({ error: "Transaction not found" }, 404);
    }

    // Subscription diaktifkan manual oleh admin melalui halaman transaksi.
    return c.json({ status: "processed" }, 200);
  }

  // Tangani event failed/expired
  if ((event_type === "payment.failed" || event_type === "payment.expired") && data?.order_id) {
    const trxId = data.order_id;
    console.log(`[Webhook] Payment ${event_type} for order: ${trxId}`);

    // Atomic conditional UPDATE: hanya set 'failed' jika masih 'pending'.
    // Mencegah transaksi yang sudah 'paid' tertimpa menjadi 'failed' karena
    // webhook expired terlambat datang setelah pembayaran berhasil.
    await db
      .update(transactions)
      .set({ status: "failed" })
      .where(and(eq(transactions.id, trxId), eq(transactions.status, "pending")));

    return c.json({ status: "processed" }, 200);
  }

  return c.json({ status: "ignored_event" }, 200);
});

export default app;
