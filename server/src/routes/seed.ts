import { Hono } from "hono";
import { db } from "../db/index.js";
import { services, packages } from "../db/schema.js";

const app = new Hono();

app.get("/", async (c) => {
  const [newService] = await db.insert(services).values({
      nameId: "Hapus Malware & Judi Online", slug: "hapus-malware",
      nameEn: "Malware & Gambling Ads Removal", icon: "Cloud", isActive: true,
      descriptionId: "Pembersihan total website dari malware dan iklan judi online dengan garansi.",
      descriptionEn: "Complete website cleanup from malware and gambling ads with warranty.",
    }).onConflictDoNothing({ target: services.slug }).returning();
  if (!newService) return c.json({ message: "Data sudah ada di database." });

  await db.insert(packages).values([
    { serviceId: newService.id, slug: "basic-clean", nameId: "Basic Clean", nameEn: "Basic Clean", price: 750000, warrantyDays: 30,
      featuresId: ["Scan & hapus malware 1 website","Pembersihan file terinfeksi","Update WordPress core","Hardening dasar (.htaccess, wp-config)","Laporan pengerjaan singkat"], featuresEn: [], isActive: true },
    { serviceId: newService.id, slug: "deep-clean-shield", nameId: "Deep Clean & Shield", nameEn: "Deep Clean & Shield", price: 1500000, warrantyDays: 90,
      featuresId: ["Semua fitur Basic Clean","Pembersihan database & inject script","Audit plugin & theme nulled","Setup security plugin (Wordfence)","Backup penuh sebelum & sesudah","Monitoring 7 hari pasca cleanup"], featuresEn: [], isActive: true },
    { serviceId: newService.id, slug: "enterprise-protection", nameId: "Enterprise Protection", nameEn: "Enterprise Protection", price: 3000000, warrantyDays: 365,
      featuresId: ["Semua fitur Deep Clean & Shield","Multi-site / hosting kompleks","Audit cPanel/VPS menyeluruh","Pembersihan blacklist Google","Setup firewall & 2FA admin","Monitoring 30 hari pasca cleanup","Konsultasi pencegahan privat"], featuresEn: [], isActive: true },
  ]);
  return c.json({ message: "Berhasil menambahkan layanan dan 3 paket ke database!" });
});

export default app;
