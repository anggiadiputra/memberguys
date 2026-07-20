import { Hono } from "hono";
import { db } from "../db/index.js";
import { users, transactions, subscriptions, services, packages } from "../db/schema.js";
import { count, eq, inArray, and } from "drizzle-orm";
import { activateSubscription } from "../lib/transactions.js";

const app = new Hono();

// GET /api/admin/stats
app.get("/stats", async (c) => {
  const [totalUsers] = await db.select({ count: count() }).from(users);
  const [totalTransactions] = await db.select({ count: count() }).from(transactions);
  const [activeSubscriptions] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));
  const [pendingTransactions] = await db
    .select({ count: count() })
    .from(transactions)
    .where(eq(transactions.status, "pending"));

  return c.json({
    totalUsers: totalUsers.count,
    totalTransactions: totalTransactions.count,
    activeSubscriptions: activeSubscriptions.count,
    pendingTransactions: pendingTransactions.count,
  });
});

// GET /api/admin/transactions
app.get("/transactions", async (c) => {
  const rows = await db.query.transactions.findMany({
    with: { user: true, package: { with: { service: true } } },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 50,
  });
  return c.json(rows);
});

// GET /api/admin/users
app.get("/users", async (c) => {
  const rows = await db.query.users.findMany({
    orderBy: (u, { desc }) => [desc(u.createdAt)],
  });
  return c.json(rows);
});

// GET /api/admin/users/:id — detail user + transaksi + subscription
app.get("/users/:id", async (c) => {
  const id = c.req.param("id");
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  if (!user) return c.json({ error: "User not found" }, 404);

  const trxList = await db.query.transactions.findMany({
    where: eq(transactions.userId, id),
    with: { package: { with: { service: true } } },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const subList = await db.query.subscriptions.findMany({
    where: eq(subscriptions.userId, id),
    with: { package: { with: { service: true } } },
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  });

  return c.json({ user, transactions: trxList, subscriptions: subList });
});

// ============================================================
// SERVICES (Layanan)
// ============================================================

// GET /api/admin/services — list semua service TERMASUK yang non-aktif.
// (Endpoint publik /api/services memfilter isActive=true, jadi admin butuh
//  endpoint sendiri untuk mengelola service yang sedang dinonaktifkan.)
app.get("/services", async (c) => {
  const rows = await db.query.services.findMany({
    with: { packages: true },
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  });
  return c.json(rows);
});

function sanitizeSlug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// POST /api/admin/services — tambah layanan baru
app.post("/services", async (c) => {
  const body = await c.req.json<{
    nameId?: string;
    nameEn?: string;
    slug?: string;
    descriptionId?: string;
    descriptionEn?: string;
    icon?: string;
    isActive?: boolean;
  }>();

  if (!body.nameId || !body.nameEn) {
    return c.json({ error: "nameId dan nameEn wajib diisi" }, 400);
  }

  const slug = sanitizeSlug(body.slug || body.nameId);
  if (!slug) return c.json({ error: "slug tidak valid" }, 400);

  try {
    const [row] = await db
      .insert(services)
      .values({
        nameId: body.nameId,
        nameEn: body.nameEn,
        slug,
        descriptionId: body.descriptionId || null,
        descriptionEn: body.descriptionEn || null,
        icon: body.icon || null,
        isActive: body.isActive ?? true,
      })
      .returning();
    return c.json(row, 201);
  } catch (err: any) {
    // Unique violation di slug
    if (err?.code === "23505") {
      return c.json({ error: `Slug "${slug}" sudah dipakai layanan lain` }, 409);
    }
    throw err;
  }
});

// PATCH /api/admin/services/:id — edit layanan
app.patch("/services/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{
    nameId?: string;
    nameEn?: string;
    slug?: string;
    descriptionId?: string;
    descriptionEn?: string;
    icon?: string;
    isActive?: boolean;
  }>();

  const patch: Record<string, unknown> = {};
  if (body.nameId !== undefined) patch.nameId = body.nameId;
  if (body.nameEn !== undefined) patch.nameEn = body.nameEn;
  if (body.slug !== undefined) {
    const slug = sanitizeSlug(body.slug);
    if (!slug) return c.json({ error: "slug tidak valid" }, 400);
    patch.slug = slug;
  }
  if (body.descriptionId !== undefined) patch.descriptionId = body.descriptionId || null;
  if (body.descriptionEn !== undefined) patch.descriptionEn = body.descriptionEn || null;
  if (body.icon !== undefined) patch.icon = body.icon || null;
  if (body.isActive !== undefined) patch.isActive = body.isActive;

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "Tidak ada field yang dikirim untuk diupdate" }, 400);
  }

  try {
    const updated = await db
      .update(services)
      .set(patch)
      .where(eq(services.id, id))
      .returning();

    if (updated.length === 0) {
      return c.json({ error: "Layanan tidak ditemukan" }, 404);
    }
    return c.json(updated[0]);
  } catch (err: any) {
    if (err?.code === "23505") {
      return c.json({ error: "Slug sudah dipakai layanan lain" }, 409);
    }
    throw err;
  }
});

// DELETE /api/admin/services/:id — hapus layanan
// (Cascade delete ke packages via FK onDelete: cascade di schema.)
app.delete("/services/:id", async (c) => {
  const id = c.req.param("id");
  const deleted = await db
    .delete(services)
    .where(eq(services.id, id))
    .returning({ id: services.id });

  if (deleted.length === 0) {
    return c.json({ error: "Layanan tidak ditemukan" }, 404);
  }
  return c.json({ status: "deleted" });
});

// ============================================================
// PACKAGES (Paket)
// ============================================================

type PackageInsert = typeof packages.$inferInsert;

function parseStringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

// Build payload lengkap untuk INSERT (semua field required divalidasi).
function buildPackageForInsert(body: any): PackageInsert {
  if (!body.serviceId) throw { status: 400, error: "serviceId wajib diisi" };
  if (!body.nameId) throw { status: 400, error: "nameId wajib diisi" };
  if (!body.nameEn) throw { status: 400, error: "nameEn wajib diisi" };
  if (typeof body.price !== "number" || body.price < 0) throw { status: 400, error: "price harus angka ≥ 0" };
  if (typeof body.warrantyDays !== "number" || body.warrantyDays < 0) throw { status: 400, error: "warrantyDays harus angka ≥ 0" };

  return {
    serviceId: body.serviceId,
    nameId: body.nameId,
    nameEn: body.nameEn,
    price: body.price,
    warrantyDays: body.warrantyDays,
    featuresId: parseStringList(body.featuresId),
    featuresEn: parseStringList(body.featuresEn),
    excludedFeaturesId: parseStringList(body.excludedFeaturesId),
    excludedFeaturesEn: parseStringList(body.excludedFeaturesEn),
    isActive: body.isActive ?? true,
  };
}

// Build payload partial untuk PATCH (hanya field yang dikirim).
function buildPackagePatch(body: any): Partial<PackageInsert> {
  const patch: Partial<PackageInsert> = {};
  if (body.nameId !== undefined) patch.nameId = body.nameId;
  if (body.nameEn !== undefined) patch.nameEn = body.nameEn;
  if (body.price !== undefined) {
    if (typeof body.price !== "number" || body.price < 0) throw { status: 400, error: "price harus angka ≥ 0" };
    patch.price = body.price;
  }
  if (body.warrantyDays !== undefined) {
    if (typeof body.warrantyDays !== "number" || body.warrantyDays < 0) throw { status: 400, error: "warrantyDays harus angka ≥ 0" };
    patch.warrantyDays = body.warrantyDays;
  }
  if (body.featuresId !== undefined) patch.featuresId = parseStringList(body.featuresId);
  if (body.featuresEn !== undefined) patch.featuresEn = parseStringList(body.featuresEn);
  if (body.excludedFeaturesId !== undefined) patch.excludedFeaturesId = parseStringList(body.excludedFeaturesId);
  if (body.excludedFeaturesEn !== undefined) patch.excludedFeaturesEn = parseStringList(body.excludedFeaturesEn);
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  return patch;
}

// POST /api/admin/packages — tambah paket baru
app.post("/packages", async (c) => {
  const body = await c.req.json();

  let values: PackageInsert;
  try {
    values = buildPackageForInsert(body);
  } catch (e: any) {
    return c.json({ error: e.error }, e.status ?? 400);
  }

  try {
    const [row] = await db.insert(packages).values(values).returning();
    return c.json(row, 201);
  } catch (err: any) {
    // serviceId tidak valid → foreign key violation
    if (err?.code === "23503") {
      return c.json({ error: "serviceId tidak valid (layanan tidak ditemukan)" }, 400);
    }
    throw err;
  }
});

// PATCH /api/admin/packages/:id — edit paket
app.patch("/packages/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  let patch: Partial<PackageInsert>;
  try {
    patch = buildPackagePatch(body);
  } catch (e: any) {
    return c.json({ error: e.error }, e.status ?? 400);
  }

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "Tidak ada field yang dikirim untuk diupdate" }, 400);
  }

  try {
    const updated = await db
      .update(packages)
      .set(patch)
      .where(eq(packages.id, id))
      .returning();

    if (updated.length === 0) {
      return c.json({ error: "Paket tidak ditemukan" }, 404);
    }
    return c.json(updated[0]);
  } catch (err: any) {
    if (err?.code === "23503") {
      return c.json({ error: "serviceId tidak valid" }, 400);
    }
    throw err;
  }
});

// DELETE /api/admin/packages/:id — hapus paket
app.delete("/packages/:id", async (c) => {
  const id = c.req.param("id");
  const deleted = await db
    .delete(packages)
    .where(eq(packages.id, id))
    .returning({ id: packages.id });

  if (deleted.length === 0) {
    return c.json({ error: "Paket tidak ditemukan" }, 404);
  }
  return c.json({ status: "deleted" });
});

export default app;

// POST /api/admin/activate-subscription — aktivasi garansi manual
app.post("/activate-subscription", async (c) => {
  const body = await c.req.json<{ transactionId: string; warrantyDays?: number }>();
  const { transactionId, warrantyDays } = body;

  if (!transactionId) {
    return c.json({ error: "transactionId wajib diisi" }, 400);
  }

  // Ambil transaksi untuk dapat package info
  const trx = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionId),
    with: { package: true },
  });

  if (!trx) return c.json({ error: "Transaksi tidak ditemukan" }, 404);
  if (trx.status !== "paid") return c.json({ error: "Transaksi belum lunas" }, 400);

  const days = warrantyDays ?? (trx.package?.warrantyDays ?? 30);

  const sub = await activateSubscription(transactionId, days);

  if (!sub) {
    return c.json({ error: "Gagal mengaktifkan garansi. Transaksi mungkin sudah aktif." }, 400);
  }

  return c.json({ subscription: sub });
});

// ─── STAFF MANAGEMENT ────────────────────────────────────
// Endpoint ini hanya untuk role admin (diperiksa di handler).

// GET /api/admin/staff — daftar staff (admin, finance, support)
app.get("/staff", async (c) => {
  // Validasi role
  const adminId = c.req.header("X-Admin-Id");
  const admin = await db.query.users.findFirst({ where: eq(users.id, adminId as string) });
  if (!admin || admin.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const all = await db.select().from(users).where(inArray(users.role, ["admin", "finance", "support"]));
  return c.json(all);
});

// POST /api/admin/staff — tambah staff baru
app.post("/staff", async (c) => {
  const adminId = c.req.header("X-Admin-Id");
  const admin = await db.query.users.findFirst({ where: eq(users.id, adminId as string) });
  if (!admin || admin.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json<{ name: string; email: string; whatsapp?: string; role: "admin" | "finance" | "support" }>();
  if (!body.name || !body.email || !body.role) return c.json({ error: "name, email, role wajib diisi" }, 400);

  const now = new Date();
  const newId = `staff-${crypto.randomUUID()}`;

  try {
    const [row] = await db.insert(users).values({
      id: newId,
      name: body.name,
      email: body.email,
      whatsapp: body.whatsapp || null,
      emailVerified: false,
      role: body.role,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return c.json(row, 201);
  } catch (err: any) {
    if (err?.code === "23505") return c.json({ error: "Email sudah terdaftar" }, 409);
    throw err;
  }
});

// PATCH /api/admin/staff/:id — edit role staff
app.patch("/staff/:id", async (c) => {
  const adminId = c.req.header("X-Admin-Id");
  const admin = await db.query.users.findFirst({ where: eq(users.id, adminId as string) });
  if (!admin || admin.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const id = c.req.param("id");
  const body = await c.req.json<{ role?: "admin" | "finance" | "support"; name?: string }>();
  
  const patch: any = {};
  if (body.role) patch.role = body.role;
  if (body.name) patch.name = body.name;

  if (Object.keys(patch).length === 0) return c.json({ error: "Tidak ada field yang diupdate" }, 400);
  
  const [updated] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
  if (!updated) return c.json({ error: "Staff tidak ditemukan" }, 404);
  return c.json(updated);
});
