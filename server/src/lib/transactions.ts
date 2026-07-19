import { db } from "../db/index.js";
import { transactions, subscriptions, packages } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { addDays } from "date-fns";

/**
 * Menandai transaksi sebagai "paid" secara atomik dan membuat subscription.
 *
 * Race-condition-safe: menggunakan conditional UPDATE (WHERE status = 'pending')
 * yang dijamin atomic oleh Postgres per-statement. RETURNING * memastikan HANYA
 * satu request yang mendapat row kembali (request paralel/concurrent lain akan
 * mendapat array kosong karena status sudah tidak 'pending' lagi).
 *
 * Ini melindungi dari:
 *  - Webhook retry (payment gateway sering mengirim ulang event yang sama)
 *  - Admin double-click tombol "Confirm Payment"
 *  - Webhook & admin confirm yang terjadi bersamaan
 *
 * Mengembalikan:
 *   { kind: "paid", transaction, subscription }  — berhasil (caller sudah bayar)
 *   { kind: "created", transaction, subscription } — baru saja berhasil
 *   { kind: "not_found" }
 */
import { users } from "../db/schema.js";

type TransactionWithRelations = typeof transactions.$inferSelect & {
  package: typeof packages.$inferSelect & { service: any };
  user: typeof users.$inferSelect;
};

export type MarkPaidResult =
  | { kind: "paid"; transaction: TransactionWithRelations; subscription: typeof subscriptions.$inferSelect }
  | { kind: "created"; transaction: TransactionWithRelations; subscription: typeof subscriptions.$inferSelect }
  | { kind: "not_found" };

export async function markTransactionPaid(
  trxId: string,
  opts: { externalRefId?: string | null; fee?: number | null } = {}
): Promise<MarkPaidResult> {
  // 1. Atomic conditional UPDATE: hanya berlaku jika status masih 'pending'.
  //    Postgres menggaransi atomicity per-statement, jadi walau ada 10 request
  //    bersamaan, hanya SATU yang akan mengubah row & mendapat RETURNING *.
  const updated = await db
    .update(transactions)
    .set({
      status: "paid",
      paidAt: new Date(),
      // Hanya update externalRefId jika nilai baru diberikan; pertahankan yang lama jika tidak.
      ...(opts.externalRefId
        ? { externalRefId: opts.externalRefId }
        : {}),
      ...(opts.fee !== undefined && opts.fee !== null
        ? { fee: opts.fee }
        : {}),
    })
    .where(and(eq(transactions.id, trxId), eq(transactions.status, "pending")))
    .returning();

  if (updated.length === 0) {
    // Bisa karena: (a) transaksi tidak ada, atau (b) sudah tidak pending lagi.
    const existing = await db.query.transactions.findFirst({
      where: eq(transactions.id, trxId),
      with: { package: { with: { service: true } }, user: true },
    });

    if (!existing) return { kind: "not_found" };

    // Sudah paid → cari subscription yang sudah ada agar caller tetap dapat data konsisten.
    const existingSub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.transactionId, trxId),
    });
    if (existingSub) {
      return { kind: "paid", transaction: existing, subscription: existingSub };
    }

    // Edge case: transaksi sudah 'paid' tapi subscription belum sempat dibuat
    // (misalnya proses sebelumnya crash setelah UPDATE tapi sebelum INSERT).
    // Kita buatkan subscription-nya. Unique constraint pada transactionId
    // melindungi dari double-insert di sini.
    const now = new Date();
    const warrantyEndsAt = addDays(now, existing.package.warrantyDays);
    const [sub] = await db
      .insert(subscriptions)
      .values({
        userId: existing.userId,
        packageId: existing.packageId,
        transactionId: existing.id,
        status: "active",
        startsAt: now,
        warrantyEndsAt,
      })
      .returning();
    return { kind: "paid", transaction: existing, subscription: sub };
  }

  const trx = updated[0];

  // 2. Ambil package untuk hitung warranty. Karena transaksi baru saja di-update
  //    dan masih dalam request ini, race sangat tidak mungkin — unique constraint
  //    pada transactionId tetap menjadi defense-in-depth.
  const pkgWithService = await db.query.packages.findFirst({
    where: eq(packages.id, trx.packageId),
    with: { service: true }
  });

  const user = await db.query.users.findFirst({
    where: eq(users.id, trx.userId)
  });

  if (!pkgWithService || !user) {
    return { kind: "not_found" };
  }

  const trxWithRelations = { ...trx, package: pkgWithService, user };

  const now = new Date();
  const warrantyEndsAt = addDays(now, pkgWithService.warrantyDays);

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

  return { kind: "created", transaction: trxWithRelations, subscription: sub };
}

/**
 * Generate transaction ID yang tahan collision.
 *
 * `Date.now()` saja bisa collision kalau 2 request masuk di ms yang sama,
 * menyebabkan primary key violation (HTTP 500 ke customer). Kita tambahkan
 * random suffix agar praktis tidak mungkin tabrakan.
 */
export function generateTransactionId(): string {
  const rand = Math.random().toString(36).slice(2, 8); // 6 char base36
  return `TRX-${Date.now()}-${rand}`;
}
