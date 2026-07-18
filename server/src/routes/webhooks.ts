import { Hono } from "hono";
import { db } from "../db/index.js";
import { transactions, subscriptions } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { addDays } from "date-fns";
import { getPaymentConfig } from "./admin-settings.js";

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

    const trx = await db.query.transactions.findFirst({
      where: eq(transactions.id, trxId),
      with: { package: true },
    });

    if (!trx) {
      console.warn(`[Webhook] Transaction ${trxId} not found in database.`);
      return c.json({ error: "Transaction not found" }, 404);
    }

    if (trx.status === "paid") {
      return c.json({ status: "already_paid" }, 200);
    }

    const now = new Date();
    const warrantyEndsAt = addDays(now, trx.package.warrantyDays);

    await db
      .update(transactions)
      .set({ 
        status: "paid", 
        paidAt: now,
        externalRefId: data.payment_id || null
      })
      .where(eq(transactions.id, trxId));

    await db.insert(subscriptions).values({
      userId: trx.userId,
      packageId: trx.packageId,
      transactionId: trx.id,
      status: "active",
      startsAt: now,
      warrantyEndsAt,
    });

    return c.json({ status: "processed" }, 200);
  }

  // Tangani event expired/failed
  if ((event_type === "payment.failed" || event_type === "payment.expired") && data?.order_id) {
    const trxId = data.order_id;
    console.log(`[Webhook] Payment ${event_type} for order: ${trxId}`);

    await db
      .update(transactions)
      .set({ status: "failed" })
      .where(eq(transactions.id, trxId));

    return c.json({ status: "processed" }, 200);
  }

  return c.json({ status: "ignored_event" }, 200);
});

export default app;
