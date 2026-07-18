import { Hono } from "hono";
import { db } from "../db/index.js";
import { transactions, subscriptions, packages } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { addDays } from "date-fns";
import { getPaymentConfig } from "./admin-settings.js";

const app = new Hono();

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

// POST /api/transactions — buat transaksi baru
app.post("/", async (c) => {
  const body = await c.req.json<{ userId: string; packageId: string }>();
  const { userId, packageId } = body;

  const pkg = await db.query.packages.findFirst({
    where: eq(packages.id, packageId),
  });
  if (!pkg) return c.json({ error: "Package not found" }, 404);

  const transactionId = `TRX-${Date.now()}`;
  let paymentUrl = "";
  let externalRefId = null;

  const paymentConfig = await getPaymentConfig();

  // Jika API Key SumoPod dikonfigurasi, gunakan API SumoPod asli
  if (paymentConfig.apiKey) {
    const baseUrl = paymentConfig.isSandbox
      ? "https://api-pay-sandbox.sumopod.com"
      : "https://api-pay.sumopod.com";
      
    // Pakai fallback hardcode host jika admin belum setup success URL
    const host = process.env.CLIENT_URL || "http://localhost:5173";
    const successUrl = paymentConfig.successUrl || `${host}/payment/success?order_id=${transactionId}`;
    const cancelUrl = paymentConfig.cancelUrl || `${host}/payment/cancel?order_id=${transactionId}`;

    try {
      const res = await fetch(`${baseUrl}/api/v1/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": paymentConfig.apiKey,
        },
        body: JSON.stringify({
          order_id: transactionId,
          amount: pkg.price,
          currency: "IDR",
          expires_in_hours: 24,
          success_return_url: successUrl,
          cancel_return_url: cancelUrl,
          payment_method_type_code: "QRIS", // Default QRIS SumoPod
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal membuat payment link di SumoPod");
      }

      const sumopodData = await res.json();
      paymentUrl = sumopodData.payment_link_url;
      externalRefId = sumopodData.payment_id;
      
    } catch (err: any) {
      console.error("[SumoPod] Create payment error:", err.message);
      return c.json({ error: "Gagal memproses pembayaran. Hubungi admin." }, 502);
    }
  } else {
    // Fallback: Jika SumoPod belum dikonfigurasi admin, fallback ke WhatsApp manual payment
    const waNumber = process.env.WHATSAPP_NUMBER || "6281234567890";
    const text = encodeURIComponent(
      `Halo, saya ingin membayar pesanan ${transactionId} sebesar Rp${pkg.price.toLocaleString("id-ID")}.`
    );
    paymentUrl = `https://wa.me/${waNumber}?text=${text}`;
  }

  const [trx] = await db
    .insert(transactions)
    .values({
      id: transactionId,
      userId,
      packageId,
      amount: pkg.price,
      paymentMethod: paymentConfig.apiKey ? "qris" : "manual",
      status: "pending",
      paymentUrl,
      externalRefId,
    })
    .returning();

  return c.json({ transaction: trx, paymentUrl }, 201);
});

// PATCH /api/transactions/:id/confirm — admin konfirmasi pembayaran (manual)
app.patch("/:id/confirm", async (c) => {
  const id = c.req.param("id");

  const trx = await db.query.transactions.findFirst({
    where: eq(transactions.id, id),
    with: { package: true },
  });
  if (!trx) return c.json({ error: "Not found" }, 404);
  if (trx.status === "paid") return c.json({ error: "Already paid" }, 400);

  const now = new Date();
  const warrantyEndsAt = addDays(now, trx.package.warrantyDays);

  // Update transaksi
  await db
    .update(transactions)
    .set({ status: "paid", paidAt: now })
    .where(eq(transactions.id, id));

  // Buat subscription
  const [sub] = await db
    .insert(subscriptions)
    .values({
      userId: trx.userId,
      packageId: trx.packageId,
      transactionId: trx.id,
      status: "active",
      startsAt: now,
      warrantyEndsAt,
    })
    .returning();

  return c.json({ transaction: { ...trx, status: "paid" }, subscription: sub });
});

export default app;
