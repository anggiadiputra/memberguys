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
import { Save, TestTube2, CircleCheck, CircleX, ExternalLink, Eye, EyeOff } from "lucide-react";

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

  // Toggle visibility
  const [showApi, setShowApi] = useState(false);
  const [showWebToken, setShowWebToken] = useState(false);
  const [showWebSecret, setShowWebSecret] = useState(false);

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
      }).catch(() => {});
    });
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      await api.post("/admin/settings/payment", {
        apiKey, webhookSecret, webhookToken, successUrl, cancelUrl, isSandbox,
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
