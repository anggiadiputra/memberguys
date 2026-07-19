import { db } from "../db/index.js";
import { transactions, packages, subscriptions } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { addDays } from "date-fns";

/**
 * Menandai transaksi sebagai "paid" secara atomik.
 * Hanya mengubah status — subscription diaktifkan terpisah oleh admin.
 */
export async function markTransactionPaid(
  trxId: string,
  opts: { externalRefId?: string | null; fee?: number | null } = {}
): Promise<{ status: "paid" | "not_found" }> {
  const updated = await db
    .update(transactions)
    .set({
      status: "paid",
      paidAt: new Date(),
      ...(opts.externalRefId ? { externalRefId: opts.externalRefId } : {}),
      ...(opts.fee !== undefined && opts.fee !== null ? { fee: opts.fee } : {}),
    })
    .where(and(eq(transactions.id, trxId), eq(transactions.status, "pending")))
    .returning();

  if (updated.length === 0) {
    const existing = await db.query.transactions.findFirst({
      where: eq(transactions.id, trxId),
    });
    if (!existing || existing.status !== "paid") return { status: "not_found" };
  }

  return { status: "paid" };
}

/**
 * Aktivasi garansi manual oleh admin.
 * Membuat subscription untuk transaksi yang sudah paid.
 */
export async function activateSubscription(
  trxId: string,
  warrantyDays: number
): Promise<{ id: string } | null> {
  const trx = await db.query.transactions.findFirst({
    where: eq(transactions.id, trxId),
    with: { package: true },
  });

  if (!trx || trx.status !== "paid") return null;

  // Cegah duplikat
  const dup = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.transactionId, trxId),
  });
  if (dup) return dup;

  const now = new Date();
  const warrantyEndsAt = addDays(now, warrantyDays);

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

  return sub || null;
}

/**
 * Generate transaction ID tahan collision.
 */
export function generateTransactionId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `TRX-${Date.now()}-${rand}`;
}
