import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Lock, Circle, CircleDot, Receipt, User, Phone, Mail, Globe, Loader2, Cloud, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePageTitle } from "@/hooks/usePageTitle";

const STORAGE_KEY = "pkg_order_form";

function loadStored() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } }
function saveStored(data: Record<string, string>) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

export default function PackageLandingPage() {
  const { serviceSlug, packageSlug } = useParams<{ serviceSlug: string; packageSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  usePageTitle("Pesan Layanan");

  const [loading, setLoading] = useState(true);
  const [svc, setSvc] = useState<any>(null);
  const [pkg, setPkg] = useState<any>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "manual">("qris");
  const [checkoutStep, setCheckoutStep] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // UTM capture
  useEffect(() => {
    const utm: Record<string, string> = {};
    ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"].forEach(k => {
      const v = searchParams.get(k);
      if (v) utm[k] = v;
    });
    if (Object.keys(utm).length > 0) sessionStorage.setItem("utm_data", JSON.stringify(utm));
  }, [searchParams]);

  // Load data
  useEffect(() => {
    if (!serviceSlug || !packageSlug) return;
    api.get<any>(`/services/packages/public/${serviceSlug}/${packageSlug}`)
      .then((res) => { setSvc(res.service); setPkg(res.package); })
      .catch(() => toast.error("Paket tidak ditemukan"))
      .finally(() => setLoading(false));
  }, [serviceSlug, packageSlug]);

  // Restore form
  useEffect(() => {
    const s = loadStored();
    if (s.name) setName(s.name);
    if (s.email) setEmail(s.email);
    if (s.whatsapp) setWhatsapp(s.whatsapp);
    if (s.websiteUrl) setWebsiteUrl(s.websiteUrl);
  }, []);

  const persist = useCallback((p: Record<string, string>) => saveStored({ ...loadStored(), ...p }), []);

  // Get UTM
  const getUtm = () => {
    try { return JSON.parse(sessionStorage.getItem("utm_data") || "{}"); } catch { return {}; }
  };

  const onCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !whatsapp.trim()) { toast.error("Lengkapi data Anda"); return; }
    if (!websiteUrl?.startsWith("http")) { toast.error("URL harus http:// atau https://"); return; }
    setCheckoutLoading(true);
    try {
      const utm = getUtm();
      const res = await api.post<any>("/transactions/checkout", {
        packageId: pkg.id, method: paymentMethod, name, email, whatsapp,
        ...utm,
      });
      setCheckoutStep({ ...res });
      localStorage.removeItem(STORAGE_KEY);
    } catch (err: any) { toast.error(err.message || "Gagal checkout"); }
    finally { setCheckoutLoading(false); }
  };

  const confirmPayment = async () => {
    setConfirming(true);
    try {
      const utm = getUtm();
      await api.post<any>("/transactions", {
        transactionId: checkoutStep.transactionId, packageId: pkg.id, method: paymentMethod,
        name, email, whatsapp, ...utm,
        paymentUrl: checkoutStep.paymentUrl, externalRefId: checkoutStep.externalRefId, fee: checkoutStep.fee,
      });
      if (checkoutStep.paymentUrl) window.location.href = checkoutStep.paymentUrl;
      else { toast.success("Pesanan dibuat!"); navigate("/"); }
    } catch (err: any) { toast.error(err.message); setConfirming(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!pkg) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Paket tidak ditemukan</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="relative py-16 lg:py-24 bg-slate-900 text-white text-center">
        <Cloud className="w-12 h-12 mx-auto text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-extrabold">{svc?.nameId} — {pkg.nameId}</h1>
        <p className="text-slate-300 mt-4">{svc?.descriptionId}</p>
      </div>

      <div className="max-w-2xl mx-auto py-16 px-4">
        <form onSubmit={onCheckout} className="bg-white p-6 md:p-10 rounded-xl shadow-sm border space-y-8">
          {/* Data Pemesan */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Data Pemesan</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input placeholder="Nama Lengkap" value={name} onChange={e => { setName(e.target.value); persist({name:e.target.value}); }} required className="h-12" />
              <Input type="email" placeholder="Email" value={email} onChange={e => { setEmail(e.target.value); persist({email:e.target.value}); }} required className="h-12" />
            </div>
            <Input placeholder="WhatsApp (628xxx)" value={whatsapp} onChange={e => { setWhatsapp(e.target.value); persist({whatsapp:e.target.value}); }} required className="h-12" />
          </div>

          {/* Website URL */}
          <div className="space-y-2">
            <Label>URL Website Target <span className="text-red-500">*</span></Label>
            <Input placeholder="https://www.websiteanda.com" value={websiteUrl} onChange={e => { setWebsiteUrl(e.target.value); persist({websiteUrl:e.target.value}); }} required className="h-12" />
          </div>

          {/* Features */}
          <div className="space-y-2">
            <p className="font-semibold">Fitur Paket:</p>
            <ul className="space-y-1 text-sm">
              {pkg.featuresId?.map((f: string, i: number) => (
                <li key={i} className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /><span>{f}</span></li>
              ))}
              {pkg.excludedFeaturesId?.map((f: string, i: number) => (
                <li key={i} className="flex gap-2 items-start text-slate-400"><XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /><span>{f}</span></li>
              ))}
            </ul>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="font-semibold">Metode Pembayaran</Label>
            <div className="flex gap-2">
              <label className={`flex-1 p-3 rounded-lg border cursor-pointer text-center text-sm ${paymentMethod === "qris" ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                <input type="radio" name="pm" checked={paymentMethod === "qris"} onChange={() => setPaymentMethod("qris")} className="sr-only" />
                QRIS (Otomatis)
              </label>
              <label className={`flex-1 p-3 rounded-lg border cursor-pointer text-center text-sm ${paymentMethod === "manual" ? "border-green-500 bg-green-50" : "border-slate-200"}`}>
                <input type="radio" name="pm" checked={paymentMethod === "manual"} onChange={() => setPaymentMethod("manual")} className="sr-only" />
                Transfer Manual
              </label>
            </div>
          </div>

          {/* Price */}
          <div className="flex justify-between items-center pt-4 border-t">
            <span className="font-bold text-lg">Total</span>
            <span className="text-2xl font-bold text-primary">Rp {pkg.price.toLocaleString("id-ID")}</span>
          </div>

          <Button type="submit" size="lg" className="w-full h-14 text-base font-bold" disabled={checkoutLoading}>
            {checkoutLoading ? "Menghitung..." : "Proses Pembayaran"}
          </Button>
          <p className="text-center text-xs text-slate-400"><Lock className="w-3 h-3 inline mr-1" />Dilindungi SSL 256-bit</p>
        </form>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={!!checkoutStep} onOpenChange={(o) => { if (!o) setCheckoutStep(null); }}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader><DialogTitle>Konfirmasi Pembayaran</DialogTitle><DialogDescription>Periksa rincian sebelum membayar</DialogDescription></DialogHeader>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-left text-sm">
            <div className="flex justify-between"><span>Paket</span><span className="font-medium">{pkg.nameId}</span></div>
            <div className="flex justify-between"><span>Subtotal</span><span>Rp {pkg.price.toLocaleString("id-ID")}</span></div>
            {checkoutStep?.fee > 0 && <div className="flex justify-between"><span className="text-red-500">Fee</span><span className="text-red-500">Rp {checkoutStep.fee.toLocaleString("id-ID")}</span></div>}
            <div className="border-t pt-2 flex justify-between font-bold"><span>Total</span><span className="text-primary">Rp {checkoutStep?.totalAmount?.toLocaleString("id-ID")}</span></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setCheckoutStep(null)}>Batal</Button>
            <Button className="flex-1" disabled={confirming} onClick={confirmPayment}>
              {confirming ? "Memproses..." : paymentMethod === "manual" ? "Buat Pesanan" : `Bayar Rp ${checkoutStep?.totalAmount?.toLocaleString("id-ID")}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
