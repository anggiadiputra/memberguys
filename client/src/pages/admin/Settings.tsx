import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, TestTube2, CircleCheck, CircleX, ExternalLink, Eye, EyeOff, GripVertical, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

function BankAccountRow({ index, account, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  index: number;
  account: BankAccount;
  onChange: (a: BankAccount) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/plain"));
    if (from !== index) {
      const parentEl = document.querySelector("[data-bank-list]");
      if (parentEl) {
        const event = new CustomEvent("bank-reorder", { detail: { from, to: index } });
        parentEl.dispatchEvent(event);
      }
    }
    setDragIndex(null);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={() => setDragIndex(null)}
      className={`flex items-start gap-2 p-3 rounded-lg border bg-white/80 transition-all ${
        dragIndex === index ? "opacity-40 ring-2 ring-primary/30" : ""
      }`}
    >
      <div className="pt-1.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none">
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
        <div className="space-y-1">
          <span className="text-muted-foreground">Bank</span>
          <Input
            value={account.bankName}
            onChange={(e) => onChange({ ...account, bankName: e.target.value })}
            placeholder="BCA"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground">No. Rekening</span>
          <Input
            value={account.accountNumber}
            onChange={(e) => onChange({ ...account, accountNumber: e.target.value })}
            placeholder="1234567890"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground">A/N</span>
          <Input
            value={account.accountHolder}
            onChange={(e) => onChange({ ...account, accountHolder: e.target.value })}
            placeholder="PT MemberGuys"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-col gap-0.5 pt-1">
        <button type="button" disabled={isFirst} onClick={onMoveUp} className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button type="button" disabled={isLast} onClick={onMoveDown} className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <button type="button" onClick={onDelete} className="pt-1.5 text-slate-400 hover:text-red-500 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [adminId, setAdminId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "ok" | "fail">("idle");

  // SumoPod config state
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [successUrl, setSuccessUrl] = useState("");
  const [cancelUrl, setCancelUrl] = useState("");
  const [isSandbox, setIsSandbox] = useState(true);

  // Manual Payment config
  const [manualPaymentEnabled, setManualPaymentEnabled] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<{bankName: string; accountNumber: string; accountHolder: string}[]>([]);
  const [fonnteToken, setFonnteToken] = useState("");
  const [adminWhatsApp, setAdminWhatsApp] = useState("");

  // Toggle visibility
  const [showApi, setShowApi] = useState(false);
  const [showWebToken, setShowWebToken] = useState(false);
  const [showWebSecret, setShowWebSecret] = useState(false);
  const [showFonnte, setShowFonnte] = useState(false);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data?.user) return;
      setAdminId(data.user.id);
      // Load existing config
      api.get<any>("/admin/settings/payment", {
        headers: { "X-Admin-Id": data.user.id },
      }).then((cfg) => {
        if (!cfg) return;
        setApiKey(cfg.apiKey || "");
        setWebhookSecret(cfg.webhookSecret || "");
        setWebhookToken(cfg.webhookToken || "");
        setSuccessUrl(cfg.successUrl || "");
        setCancelUrl(cfg.cancelUrl || "");
        setIsSandbox(cfg.isSandbox ?? true);
        setManualPaymentEnabled(cfg.manualPaymentEnabled ?? false);
        setBankAccounts(cfg.bankAccounts || []);
        setFonnteToken(cfg.fonnteToken || "");
        setAdminWhatsApp(cfg.adminWhatsApp || "");
      }).catch(() => {});
    });
  }, []);

  // Drag reorder listener untuk bank accounts
  useEffect(() => {
    const el = document.querySelector("[data-bank-list]");
    if (!el) return;
    const handler = (e: Event) => {
      const { from, to } = (e as CustomEvent).detail;
      setBankAccounts((prev) => {
        const copy = [...prev];
        const [moved] = copy.splice(from, 1);
        copy.splice(to, 0, moved);
        return copy;
      });
    };
    el.addEventListener("bank-reorder", handler);
    return () => el.removeEventListener("bank-reorder", handler);
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      await api.post("/admin/settings/payment", {
        apiKey, webhookSecret, webhookToken, successUrl, cancelUrl, isSandbox,
        manualPaymentEnabled, bankAccounts, fonnteToken, adminWhatsApp,
      }, { headers: { "X-Admin-Id": adminId } });
      toast.success("Konfigurasi berhasil disimpan");
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    if (!apiKey) { toast.error("API Key belum diisi"); return; }
    setTesting(true);
    setTestStatus("idle");
    try {
      await api.post("/admin/settings/payment/test", { apiKey, isSandbox }, {
        headers: { "X-Admin-Id": adminId },
      });
      setTestStatus("ok");
      toast.success("Koneksi SumoPod berhasil!");
    } catch (e: any) {
      setTestStatus("fail");
      // Mencegah React Error 418 dengan memastikan error message adalah string murni
      const errMsg = typeof e?.message === "string" ? e.message : "Terjadi kesalahan";
      toast.error(`Gagal terhubung: ${errMsg}`);
    } finally {
      setTesting(false);
    }
  };

  const baseUrl = isSandbox
    ? "https://api-pay-sandbox.sumopod.com"
    : "https://api-pay.sumopod.com";

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

        {/* SumoPod Payment Gateway */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Gateway — SumoPod</CardTitle>
                <CardDescription className="mt-1">
                  Konfigurasi integrasi SumoPod Managed Payment untuk menerima pembayaran QRIS.
                </CardDescription>
              </div>
              <Badge variant={isSandbox ? "secondary" : "default"}>
                {isSandbox ? "Sandbox" : "Production"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Mode toggle */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
              <div className="flex-1">
                <p className="text-sm font-medium">Mode</p>
                <p className="text-xs text-muted-foreground">
                  Gunakan Sandbox untuk testing, Production untuk live.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={isSandbox ? "default" : "outline"}
                  onClick={() => setIsSandbox(true)}
                >
                  Sandbox
                </Button>
                <Button
                  size="sm"
                  variant={!isSandbox ? "default" : "outline"}
                  onClick={() => setIsSandbox(false)}
                >
                  Production
                </Button>
              </div>
            </div>

            {/* API Base URL (read-only info) */}
            <div className="space-y-1.5">
              <Label>API Base URL</Label>
              <div className="flex items-center gap-2">
                <Input value={baseUrl} readOnly className="bg-slate-50 text-muted-foreground text-xs" />
                <a href="https://sumopod.com/dashboard/managed-payment/" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="shrink-0 gap-1">
                    Dashboard <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApi ? "text" : "password"}
                  placeholder="Masukkan API Key dari SumoPod dashboard"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApi(!showApi)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Dapatkan dari SumoPod Dashboard → Settings → API Keys
              </p>
            </div>

            {/* Success / Cancel URL */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="successUrl">Success Return URL</Label>
                <Input
                  id="successUrl"
                  placeholder="https://yourapp.com/success"
                  value={successUrl}
                  onChange={(e) => setSuccessUrl(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cancelUrl">Cancel Return URL</Label>
                <Input
                  id="cancelUrl"
                  placeholder="https://yourapp.com/cancel"
                  value={cancelUrl}
                  onChange={(e) => setCancelUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Webhook */}
            <div className="space-y-3 pt-2 border-t">
              <div>
                <p className="text-sm font-medium">Webhook Configuration</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Daftarkan URL webhook berikut di SumoPod Dashboard → Settings → Webhook
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/api/webhooks/sumopod`}
                    className="bg-slate-50 text-xs text-muted-foreground font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/sumopod`);
                      toast.success("URL disalin");
                    }}
                  >
                    Salin
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="webhookToken">Webhook Token (X-Webhook-Token)</Label>
                <div className="relative">
                  <Input
                    id="webhookToken"
                    type={showWebToken ? "text" : "password"}
                    placeholder="whtok_..."
                    value={webhookToken}
                    onChange={(e) => setWebhookToken(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebToken(!showWebToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showWebToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="webhookSecret">Webhook Signing Secret (Svix)</Label>
                <div className="relative">
                  <Input
                    id="webhookSecret"
                    type={showWebSecret ? "text" : "password"}
                    placeholder="whsec_..."
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebSecret(!showWebSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showWebSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Untuk verifikasi signature pada setiap request webhook dari SumoPod.
                </p>
              </div>
            </div>

          {/* ── Integrasi Fonnte WA ── */}
          <div className="border-t pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold">Notifikasi WhatsApp (Fonnte)</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Notifikasi WA ke admin & pelanggan saat pembayaran lunas.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fonnteToken">Fonnte API Token</Label>
                <div className="relative">
                  <Input
                    id="fonnteToken"
                    type={showFonnte ? "text" : "password"}
                    placeholder="Masukkan token API Fonnte"
                    value={fonnteToken}
                    onChange={(e) => setFonnteToken(e.target.value)}
                    className="h-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFonnte(!showFonnte)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showFonnte ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dapatkan di <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">dashboard Fonnte</a> → Settings → API Key
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adminWhatsApp">Nomor WhatsApp Admin</Label>
                <Input
                  id="adminWhatsApp"
                  placeholder="6281234567890"
                  value={adminWhatsApp}
                  onChange={(e) => setAdminWhatsApp(e.target.value)}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Nomor tujuan notifikasi pesanan masuk. Format: 628xxxxxxxxxx (tanpa + dan spasi).
                </p>
              </div>
            </div>
          </div>

          {/* ── Integrasi Manual Payment (existing) ── */}
          <div className="border-t pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Rekening Tujuan</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 h-8 text-xs"
                    onClick={() => setBankAccounts([...bankAccounts, { bankName: "", accountNumber: "", accountHolder: "" }])}
                  >
                    <Plus className="h-3 w-3" /> Tambah Rekening
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground -mt-1">
                  Drag untuk mengatur urutan. Pelanggan akan melihat urutan ini saat checkout.
                </p>
                <div className="space-y-2" data-bank-list>
                  {bankAccounts.map((acc, i) => (
                    <BankAccountRow
                      key={i}
                      index={i}
                      account={acc}
                      onChange={(updated) => {
                        const copy = [...bankAccounts];
                        copy[i] = updated;
                        setBankAccounts(copy);
                      }}
                      onDelete={() => setBankAccounts(bankAccounts.filter((_, j) => j !== i))}
                      onMoveUp={() => {
                        if (i === 0) return;
                        const copy = [...bankAccounts];
                        [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                        setBankAccounts(copy);
                      }}
                      onMoveDown={() => {
                        if (i === bankAccounts.length - 1) return;
                        const copy = [...bankAccounts];
                        [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
                        setBankAccounts(copy);
                      }}
                      isFirst={i === 0}
                      isLast={i === bankAccounts.length - 1}
                    />
                  ))}
                  {bankAccounts.length === 0 && (
                    <p className="text-xs text-muted-foreground italic px-1">
                      Belum ada rekening. Klik "Tambah Rekening" untuk menambahkan.
                    </p>
                  )}
                </div>
              </div>

          {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={onSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
              </Button>
              <Button onClick={onTest} disabled={testing || !apiKey} variant="outline" className="gap-2">
                <TestTube2 className="h-4 w-4" />
                {testing ? "Testing..." : "Test Koneksi"}
              </Button>
              {testStatus === "ok" && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CircleCheck className="h-4 w-4" /> Terhubung
                </span>
              )}
              {testStatus === "fail" && (
                <span className="flex items-center gap-1 text-sm text-destructive">
                  <CircleX className="h-4 w-4" /> Gagal
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Webhook Events Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Webhook Events yang Didukung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y text-sm">
              {[
                { event: "payment.completed", desc: "Pembayaran berhasil dikonfirmasi" },
                { event: "payment.failed", desc: "Pembayaran gagal" },
                { event: "payment.expired", desc: "Link pembayaran kadaluarsa" },
                { event: "payment.test", desc: "Event test dari SumoPod Settings" },
              ].map((item) => (
                <div key={item.event} className="flex items-center justify-between py-2">
                  <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{item.event}</code>
                  <span className="text-muted-foreground">{item.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
