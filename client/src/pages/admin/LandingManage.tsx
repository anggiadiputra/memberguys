import { useState } from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, ExternalLink, Eye } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function LandingManagePage() {
  usePageTitle("Landing Page");
  const { t, i18n } = useTranslation();
  const { data: session } = authClient.useSession();
  const adminId = (session?.user as any)?.id;

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    heroTitleId: "Bersihkan Website Dari Iklan Judi & Malware",
    heroDescId: "Kembalikan reputasi SEO dan lindungi pengunjung Anda.",
    heroTitleEn: "Clean Your Website from Gambling Ads & Malware",
    heroDescEn: "Restore SEO reputation and protect your visitors.",
    heroCta: "Pesan Sekarang",
    aboutTitleId: "Mengapa Memilih Kami?",
    aboutTitleEn: "Why Choose Us?",
    aboutDescId: "Kami adalah tim profesional yang berpengalaman dalam membersihkan website dari malware, iklan judi, dan serangan siber lainnya.",
    aboutDescEn: "We are a professional team experienced in cleaning websites from malware, gambling ads, and other cyber attacks.",
  });

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/admin/settings/landing", form, { headers: { "X-Admin-Id": adminId } });
      toast.success("Landing page berhasil diperbarui!");
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Landing Page</h1>
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="w-4 h-4" /> Lihat Halaman
            </Button>
          </a>
        </div>

        <Tabs defaultValue="hero" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="hero">Hero Section</TabsTrigger>
            <TabsTrigger value="about">Tentang</TabsTrigger>
          </TabsList>

          <TabsContent value="hero">
            <Card>
              <CardHeader>
                <CardTitle>Hero Section</CardTitle>
                <CardDescription>Konten utama di halaman depan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Judul (Indonesia)</Label>
                    <Input value={form.heroTitleId} onChange={(e) => update("heroTitleId", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Judul (English)</Label>
                    <Input value={form.heroTitleEn} onChange={(e) => update("heroTitleEn", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Deskripsi (Indonesia)</Label>
                    <Input value={form.heroDescId} onChange={(e) => update("heroDescId", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Deskripsi (English)</Label>
                    <Input value={form.heroDescEn} onChange={(e) => update("heroDescEn", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle>Tentang / Keunggulan</CardTitle>
                <CardDescription>Bagian tentang layanan dan keunggulan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Judul (Indonesia)</Label>
                    <Input value={form.aboutTitleId} onChange={(e) => update("aboutTitleId", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Judul (English)</Label>
                    <Input value={form.aboutTitleEn} onChange={(e) => update("aboutTitleEn", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Deskripsi (Indonesia)</Label>
                    <Input value={form.aboutDescId} onChange={(e) => update("aboutDescId", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Deskripsi (English)</Label>
                    <Input value={form.aboutDescEn} onChange={(e) => update("aboutDescEn", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
