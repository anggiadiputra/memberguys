import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Service yang sedang diedit. null = mode tambah baru */
  service: any | null;
  adminId: string;
  onSaved: () => void;
}

/** Auto-generate slug dari teks Indonesia */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  adminId,
  onSaved,
}: ServiceFormDialogProps) {
  const isEdit = !!service;

  const [nameId, setNameId] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [descriptionId, setDescriptionId] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [icon, setIcon] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true); // apakah slug auto-dari nameId

  // Pre-fill saat mode edit
  useEffect(() => {
    if (service) {
      setNameId(service.nameId || "");
      setNameEn(service.nameEn || "");
      setSlug(service.slug || "");
      setDescriptionId(service.descriptionId || "");
      setDescriptionEn(service.descriptionEn || "");
      setIcon(service.icon || "");
      setIsActive(service.isActive ?? true);
      setAutoSlug(false);
    } else {
      setNameId("");
      setNameEn("");
      setSlug("");
      setDescriptionId("");
      setDescriptionEn("");
      setIcon("");
      setIsActive(true);
      setAutoSlug(true);
    }
  }, [service, open]);

  // Auto-slug dari nameId jika belum di-edit manual
  useEffect(() => {
    if (autoSlug) {
      setSlug(slugify(nameId));
    }
  }, [nameId, autoSlug]);

  const handleSlugChange = (v: string) => {
    setAutoSlug(false);
    setSlug(slugify(v));
  };

  const handleSave = async () => {
    if (!nameId.trim() || !nameEn.trim()) {
      toast.error("Nama Indonesia dan English wajib diisi");
      return;
    }
    if (!slug.trim()) {
      toast.error("Slug tidak valid");
      return;
    }

    setSaving(true);
    const headers = { "X-Admin-Id": adminId };
    const body = {
      nameId: nameId.trim(),
      nameEn: nameEn.trim(),
      slug: slug.trim(),
      descriptionId: descriptionId.trim() || null,
      descriptionEn: descriptionEn.trim() || null,
      icon: icon.trim() || null,
      isActive,
    };

    try {
      if (isEdit) {
        await api.patch(`/admin/services/${service.id}`, body, { headers });
        toast.success("Layanan berhasil diperbarui");
      } else {
        await api.post("/admin/services", body, { headers });
        toast.success("Layanan berhasil ditambahkan");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan layanan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Layanan" : "Tambah Layanan Baru"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ubah detail layanan. Slug yang sudah dipakai tidak boleh sama dengan layanan lain."
              : "Isi detail layanan baru. Slug akan auto-generate dari nama Indonesia."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Nama Indonesia */}
          <div className="space-y-1.5">
            <Label htmlFor="svc-nameId">Nama Indonesia *</Label>
            <Input
              id="svc-nameId"
              value={nameId}
              onChange={(e) => setNameId(e.target.value)}
              placeholder="Contoh: Hapus Malware & Judi Online"
              required
            />
          </div>

          {/* Nama English */}
          <div className="space-y-1.5">
            <Label htmlFor="svc-nameEn">Nama English *</Label>
            <Input
              id="svc-nameEn"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Contoh: Malware & Gambling Ads Removal"
              required
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="svc-slug">
              Slug *
              {autoSlug && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">(auto)</span>
              )}
            </Label>
            <Input
              id="svc-slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="hapus-malware"
              required
            />
          </div>

          {/* Icon */}
          <div className="space-y-1.5">
            <Label htmlFor="svc-icon">Icon (Lucide)</Label>
            <Input
              id="svc-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="ShieldAlert, Globe, Server, dll."
            />
            <p className="text-xs text-muted-foreground">
              Nama ikon dari Lucide Icons. Misalnya: ShieldAlert, Globe, Server.
            </p>
          </div>

          {/* Deskripsi Indonesia */}
          <div className="space-y-1.5">
            <Label htmlFor="svc-descId">Deskripsi Indonesia</Label>
            <Input
              id="svc-descId"
              value={descriptionId}
              onChange={(e) => setDescriptionId(e.target.value)}
              placeholder="Pembersihan total website dari malware..."
            />
          </div>

          {/* Deskripsi English */}
          <div className="space-y-1.5">
            <Label htmlFor="svc-descEn">Deskripsi English</Label>
            <Input
              id="svc-descEn"
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              placeholder="Complete website cleanup from malware..."
            />
          </div>

          {/* Status Aktif */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-green-500 peer-focus-visible:ring-2 peer-focus-visible:ring-ring transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <span className="text-sm font-medium">Layanan Aktif</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Layanan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
