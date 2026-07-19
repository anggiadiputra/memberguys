import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeatureListEditor } from "./FeatureListEditor";

interface PackageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Paket yang sedang diedit. null = mode tambah baru */
  pkg: any | null;
  /** ID service induk (wajib saat create baru) */
  serviceId: string;
  adminId: string;
  onSaved: () => void;
}

export function PackageFormDialog({
  open,
  onOpenChange,
  pkg,
  serviceId,
  adminId,
  onSaved,
}: PackageFormDialogProps) {
  const isEdit = !!pkg;

  const [nameId, setNameId] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [warrantyDays, setWarrantyDays] = useState<number>(30);
  const [isActive, setIsActive] = useState(true);

  // Fitur termasuk (✓)
  const [featuresId, setFeaturesId] = useState<string[]>([]);
  const [featuresEn, setFeaturesEn] = useState<string[]>([]);

  // Fitur tidak termasuk (✗)
  const [excludedFeaturesId, setExcludedFeaturesId] = useState<string[]>([]);
  const [excludedFeaturesEn, setExcludedFeaturesEn] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);

  // Pre-fill saat mode edit
  useEffect(() => {
    if (pkg) {
      setNameId(pkg.nameId || "");
      setNameEn(pkg.nameEn || "");
      setPrice(pkg.price ?? 0);
      setWarrantyDays(pkg.warrantyDays ?? 30);
      setIsActive(pkg.isActive ?? true);
      setFeaturesId(pkg.featuresId || []);
      setFeaturesEn(pkg.featuresEn || []);
      setExcludedFeaturesId(pkg.excludedFeaturesId || []);
      setExcludedFeaturesEn(pkg.excludedFeaturesEn || []);
    } else {
      setNameId("");
      setNameEn("");
      setPrice(0);
      setWarrantyDays(30);
      setIsActive(true);
      setFeaturesId([]);
      setFeaturesEn([]);
      setExcludedFeaturesId([]);
      setExcludedFeaturesEn([]);
    }
  }, [pkg, open]);

  const handleSave = async () => {
    if (!nameId.trim() || !nameEn.trim()) {
      toast.error("Nama Indonesia dan English wajib diisi");
      return;
    }
    if (price < 0) {
      toast.error("Harga tidak boleh negatif");
      return;
    }
    if (warrantyDays < 0) {
      toast.error("Garansi tidak boleh negatif");
      return;
    }

    setSaving(true);
    const headers = { "X-Admin-Id": adminId };
    const body = {
      nameId: nameId.trim(),
      nameEn: nameEn.trim(),
      price,
      warrantyDays,
      featuresId,
      featuresEn,
      excludedFeaturesId,
      excludedFeaturesEn,
      isActive,
    };

    try {
      if (isEdit) {
        await api.patch(`/admin/packages/${pkg.id}`, body, { headers });
        toast.success("Paket berhasil diperbarui");
      } else {
        await api.post("/admin/packages", { ...body, serviceId }, { headers });
        toast.success("Paket berhasil ditambahkan");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan paket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Paket" : "Tambah Paket Baru"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ubah detail paket dan daftar fitur termasuk/tidak termasuk."
              : "Isi detail paket baru. Fitur termasuk akan ditandai ✓, tidak termasuk akan ditandai ✗."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Baris atas: Nama + Harga + Garansi */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-nameId">Nama Indonesia *</Label>
              <Input
                id="pkg-nameId"
                value={nameId}
                onChange={(e) => setNameId(e.target.value)}
                placeholder="Basic Clean"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-nameEn">Nama English *</Label>
              <Input
                id="pkg-nameEn"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Basic Clean"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-price">Harga (Rp) *</Label>
              <Input
                id="pkg-price"
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="750000"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-warranty">Garansi (Hari) *</Label>
              <Input
                id="pkg-warranty"
                type="number"
                min={0}
                value={warrantyDays}
                onChange={(e) => setWarrantyDays(Number(e.target.value))}
                placeholder="30"
                required
              />
            </div>
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
            <span className="text-sm font-medium">Paket Aktif</span>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Editor Fitur Indonesia (primary) */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Fitur — Indonesia</Label>
            <FeatureListEditor
              label="Termasuk (✓)"
              variant="included"
              values={featuresId}
              onChange={setFeaturesId}
              lang="id"
            />
            <FeatureListEditor
              label="Tidak Termasuk (✗)"
              variant="excluded"
              values={excludedFeaturesId}
              onChange={setExcludedFeaturesId}
              lang="id"
            />
          </div>

          {/* Editor Fitur English (opsional, bisa toggle) */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Fitur — English (opsional) ▾
            </summary>
            <div className="space-y-3 mt-2">
              <FeatureListEditor
                label="Included (✓)"
                variant="included"
                values={featuresEn}
                onChange={setFeaturesEn}
                lang="en"
              />
              <FeatureListEditor
                label="Excluded (✗)"
                variant="excluded"
                values={excludedFeaturesEn}
                onChange={setExcludedFeaturesEn}
                lang="en"
              />
            </div>
          </details>

          {/* Preview */}
          {(featuresId.length > 0 || excludedFeaturesId.length > 0) && (
            <div className="border rounded-lg p-3 bg-slate-50">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Preview tampilan:</p>
              <ul className="space-y-1">
                {featuresId.map((f, i) => (
                  <li key={`in-${i}`} className="flex items-center gap-1.5 text-xs">
                    <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 text-[10px] font-bold">✓</span>
                    </span>
                    {f}
                  </li>
                ))}
                {excludedFeaturesId.map((f, i) => (
                  <li key={`ex-${i}`} className="flex items-center gap-1.5 text-xs">
                    <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-red-500 text-[10px] font-bold">✗</span>
                    </span>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Paket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
