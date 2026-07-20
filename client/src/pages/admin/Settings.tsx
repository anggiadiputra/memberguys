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
import { usePageTitle } from "@/hooks/usePageTitle";

interface BA { bankName: string; accountNumber: string; accountHolder: string; }

function BARow({ index, account, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: any) {
  const [di, setDi] = useState<number | null>(null);
  return (
    <div draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(index)); setDi(index); }}
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const from = Number(e.dataTransfer.getData("text/plain")); if (from !== index) { document.querySelector("[data-bl]")?.dispatchEvent(new CustomEvent("br", { detail: { from, to: index } })); } setDi(null); }}
      onDragEnd={() => setDi(null)} className={`flex items-start gap-2 p-3 rounded-lg border bg-white/80 ${di === index ? "opacity-40 ring-2" : ""}`}>
      <div className="pt-1.5 cursor-grab text-slate-300"><GripVertical className="w-4 h-4" /></div>
      <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
        <div className="space-y-1"><span className="text-muted-foreground">Bank</span><Input value={account.bankName} onChange={(e) => onChange({ ...account, bankName: e.target.value })} placeholder="BCA" className="h-8 text-xs" /></div>
        <div className="space-y-1"><span className="text-muted-foreground">No. Rekening</span><Input value={account.accountNumber} onChange={(e) => onChange({ ...account, accountNumber: e.target.value })} placeholder="1234567890" className="h-8 text-xs" /></div>
        <div className="space-y-1"><span className="text-muted-foreground">A/N</span><Input value={account.accountHolder} onChange={(e) => onChange({ ...account, accountHolder: e.target.value })} placeholder="PT MemberGuys" className="h-8 text-xs" /></div>
      </div>
      <div className="flex flex-col gap-0.5 pt-1">
        <button disabled={isFirst} onClick={onMoveUp} className="h-5 w-5 text-slate-400 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
        <button disabled={isLast} onClick={onMoveDown} className="h-5 w-5 text-slate-400 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
      </div>
      <button onClick={onDelete} className="pt-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );
}

export default function AdminSettingsPage() {
  usePageTitle("Settings");
  const [adminId, setAdminId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "ok" | "fail">("idle");

  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [successUrl, setSuccessUrl] = useState("");
  const [cancelUrl, setCancelUrl] = useState("");
  const [isSandbox, setIsSandbox] = useState(true);
  const [manualEnabled, setManualEnabled] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BA[]>([]);
  const [fonnteToken, setFonnteToken] = useState("");
  const [adminWA, setAdminWA] = useState("");
  const [showFonnte, setShowFonnte] = useState(false);
  const [ft, setFt] = useState(false);
  const [ftok, setFtok] = useState<boolean | null>(null);
  const [ga4Id, setGa4Id] = useState("");
  const [gtmId, setGtmId] = useState("");
  const [fbPixelId, setFbPixelId] = useState("");
  const [showApi, setShowApi] = useState(false);
  const [showWebT, setShowWebT] = useState(false);
  const [showWebS, setShowWebS] = useState(false);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data?.user) return; setAdminId(data.user.id);
      api.get<any>("/admin/settings/payment", { headers: { "X-Admin-Id": data.user.id } }).then((c) => {
        if (!c) return;
        setApiKey(c.apiKey || ""); setWebhookSecret(c.webhookSecret || ""); setWebhookToken(c.webhookToken || "");
        setSuccessUrl(c.successUrl || ""); setCancelUrl(c.cancelUrl || ""); setIsSandbox(c.isSandbox ?? true);
        setManualEnabled(c.manualPaymentEnabled ?? false); setBankAccounts(c.bankAccounts || []);
        setFonnteToken(c.fonnteToken || ""); setAdminWA(c.adminWhatsApp || "");
        setGa4Id(c.ga4Id || ""); setGtmId(c.gtmId || ""); setFbPixelId(c.fbPixelId || "");
      }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    const el = document.querySelector("[data-bl]");
    if (!el) return;
    const h = (e: Event) => { const { from, to } = (e as CustomEvent).detail; setBankAccounts((p) => { const c = [...p]; c.splice(to, 0, c.splice(from, 1)[0]); return c; }); };
    el.addEventListener("br", h);
    return () => el.removeEventListener("br", h);
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      await api.post("/admin/settings/payment", {
        apiKey, webhookSecret, webhookToken, successUrl, cancelUrl, isSandbox,
        manualPaymentEnabled: manualEnabled, bankAccounts, fonnteToken, adminWhatsApp: adminWA, ga4Id, gtmId, fbPixelId,
      }, { headers: { "X-Admin-Id": adminId } });
      toast.success("Tersimpan!");
    } catch (e: any) { toast.error(e.message || "Gagal"); } finally { setSaving(false); }
  };

  const onTest = async () => {
    if (!apiKey) { toast.error("API Key kosong"); return; }
    setTesting(true); setTestStatus("idle");
    try { await api.post("/admin/settings/payment/test", { apiKey, isSandbox }, { headers: { "X-Admin-Id": adminId } }); setTestStatus("ok"); toast.success("Koneksi OK!"); }
    catch (e: any) { setTestStatus("fail"); toast.error(`Gagal: ${e.message}`); } finally { setTesting(false); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>Payment Gateway</CardTitle><CardDescription>SumoPod, Webhook.</CardDescription></div>
                <Badge variant={isSandbox ? "secondary" : "default"}>{isSandbox ? "Sandbox" : "Live"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
                <div className="flex-1"><p className="text-sm font-medium">Mode</p><p className="text-xs text-muted-foreground">Sandbox untuk testing.</p></div>
                <div className="flex gap-2"><Button size="sm" variant={isSandbox ? "default" : "outline"} onClick={() => setIsSandbox(true)}>Sandbox</Button><Button size="sm" variant={!isSandbox ? "default" : "outline"} onClick={() => setIsSandbox(false)}>Live</Button></div>
              </div>
              <div className="space-y-1.5"><Label>API Key</Label>
                <div className="relative"><Input type={showApi ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="pr-10 h-9" />
                  <button type="button" onClick={() => setShowApi(!showApi)} className="absolute right-3 top-1/2">{showApi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Success URL</Label><Input value={successUrl} onChange={(e) => setSuccessUrl(e.target.value)} className="h-9 text-xs" /></div>
                <div className="space-y-1.5"><Label>Cancel URL</Label><Input value={cancelUrl} onChange={(e) => setCancelUrl(e.target.value)} className="h-9 text-xs" /></div>
              </div>
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-semibold">Webhook</p>
                <div className="flex gap-2"><Input readOnly value={`${window.location.origin}/api/webhooks/sumopod`} className="bg-slate-50 text-xs h-9" />
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/sumopod`); toast.success("Copied!"); }}>Salin</Button></div>
                <div className="space-y-1.5"><Label>Webhook Token</Label>
                  <div className="relative"><Input type={showWebT ? "text" : "password"} value={webhookToken} onChange={(e) => setWebhookToken(e.target.value)} className="pr-10 h-9" />
                    <button type="button" onClick={() => setShowWebT(!showWebT)} className="absolute right-3 top-1/2">{showWebT ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                <div className="space-y-1.5"><Label>Webhook Secret</Label>
                  <div className="relative"><Input type={showWebS ? "text" : "password"} value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className="pr-10 h-9" />
                    <button type="button" onClick={() => setShowWebS(!showWebS)} className="absolute right-3 top-1/2">{showWebS ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Pembayaran Manual</p>
                  <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={manualEnabled} onChange={(e) => setManualEnabled(e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-green-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" /></label>
                </div>
                {manualEnabled && <>
                  <div className="flex justify-between mb-2"><span className="text-xs text-muted-foreground">Rekening Tujuan</span>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setBankAccounts([...bankAccounts, { bankName: "", accountNumber: "", accountHolder: "" }])}><Plus className="h-3 w-3" /> Tambah</Button></div>
                  <div className="space-y-2" data-bl>
                    {bankAccounts.map((a, i) => <BARow key={i} index={i} account={a} onChange={(u) => { const c = [...bankAccounts]; c[i] = u; setBankAccounts(c); }}
                      onDelete={() => setBankAccounts(bankAccounts.filter((_, j) => j !== i))} onMoveUp={() => { if (i === 0) return; const c = [...bankAccounts]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; setBankAccounts(c); }}
                      onMoveDown={() => { if (i === bankAccounts.length - 1) return; const c = [...bankAccounts]; [c[i], c[i + 1]] = [c[i + 1], c[i]]; setBankAccounts(c); }}
                      isFirst={i === 0} isLast={i === bankAccounts.length - 1} />)}
                    {bankAccounts.length === 0 && <p className="text-xs text-muted-foreground italic">Belum ada rekening.</p>}
                  </div>
                </>}
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={onSave} disabled={saving} className="gap-2"><Save className="h-4 w-4" />{saving ? "Menyimpan..." : "Simpan"}</Button>
                <Button onClick={onTest} disabled={testing || !apiKey} variant="outline" className="gap-2"><TestTube2 className="h-4 w-4" />{testing ? "Testing..." : "Test"}</Button>
                {testStatus === "ok" && <span className="text-sm text-green-600 flex items-center gap-1"><CircleCheck className="h-4 w-4" /> OK</span>}
                {testStatus === "fail" && <span className="text-sm text-destructive flex items-center gap-1"><CircleX className="h-4 w-4" /> Gagal</span>}
              </div>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader><CardTitle>Tracking & Analytics</CardTitle><CardDescription>GA4, GTM, Facebook Pixel.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5"><Label>GA4 ID</Label><Input placeholder="G-XXXXXXXXXX" value={ga4Id} onChange={(e) => setGa4Id(e.target.value)} className="h-9 text-xs" /></div>
                <div className="space-y-1.5"><Label>GTM ID</Label><Input placeholder="GTM-XXXXXXX" value={gtmId} onChange={(e) => setGtmId(e.target.value)} className="h-9 text-xs" /></div>
                <div className="space-y-1.5"><Label>Facebook Pixel ID</Label><Input placeholder="1234567890" value={fbPixelId} onChange={(e) => setFbPixelId(e.target.value)} className="h-9 text-xs" /></div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader><CardTitle>Notifikasi WhatsApp (Fonnte)</CardTitle><CardDescription>WA otomatis ke admin & pelanggan.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="ft">Fonnte API Token</Label>
                  <div className="relative"><Input id="ft" type={showFonnte ? "text" : "password"} value={fonnteToken} onChange={(e) => setFonnteToken(e.target.value)} className="pr-10 h-9" />
                    <button type="button" onClick={() => setShowFonnte(!showFonnte)} className="absolute right-3 top-1/2">{showFonnte ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                <div className="space-y-1.5"><Label htmlFor="awa">No. WhatsApp Admin</Label><Input id="awa" placeholder="6281234567890" value={adminWA} onChange={(e) => setAdminWA(e.target.value)} className="h-9" /></div>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" disabled={ft} onClick={async () => {
                    setFt(true);
                    try {
                      const r = await api.post<any>("/admin/settings/fonnte-test", {}, { headers: { "X-Admin-Id": adminId } });
                      if (r.status === "ok") { toast.success("WA test terkirim!"); setFtok(true); }
                    } catch(e:any) { toast.error(e.message || "Gagal"); setFtok(false); }
                    finally { setFt(false); }
                  }}>
                    <TestTube2 className="w-3.5 h-3.5" />{ft ? "Mengirim..." : "Test WA"}
                  </Button>
                  {ftok === true && <CircleCheck className="w-4 h-4 text-green-500" />}
                  {ftok === false && <CircleX className="w-4 h-4 text-red-500" />}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
