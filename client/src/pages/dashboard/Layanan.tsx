import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Circle, CircleDot, Cloud, ShieldAlert, AlertTriangle, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function LayananPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Checkout states
  const [selectedPkg, setSelectedPkg] = useState<any>(null); // Menyimpan object package utuh
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Checkout 2-step state
  const [checkoutData, setCheckoutData] = useState<{
    transactionId: string;
    amount: number;
    fee: number | null;
    totalAmount: number;
    paymentUrl: string;
    externalRefId: string | null;
    manualPaymentEnabled?: boolean;
    whatsappNumber?: string;
    bankAccounts?: { bankName: string; accountNumber: string; accountHolder: string }[];
  } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "manual">("qris");

  useEffect(() => {
    authClient.getSession().then(({ data }) => setUser(data?.user));
    api.get<any[]>("/services")
      .then((data) => {
        // Hanya ambil service yang aktif dan urutkan paketnya berdasarkan harga
        const activeServices = data.filter(s => s.isActive);
        activeServices.forEach(s => {
          if (s.packages) s.packages.sort((a: any, b: any) => a.price - b.price);
        });
        setServices(activeServices);
      })
      .catch(() => toast.error("Gagal memuat daftar layanan"))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectPackage = (pkg: any) => {
    setSelectedPkg(pkg);
    setIsModalOpen(true);
  };

  // Step 1: Panggil /checkout → dapat fee & paymentUrl (tanpa insert DB)
  const onCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) { toast.error("Pilih paket terlebih dahulu"); return; }
    if (!websiteUrl) { toast.error("Masukkan URL website Anda"); return; }
    if (!websiteUrl.startsWith("http")) {
      toast.error("URL harus dimulai dengan http:// atau https://");
      return;
    }

    setProcessing(true);
    try {
      const checkout = await api.post<any>("/transactions/checkout", {
        packageId: selectedPkg.id,
        method: paymentMethod,
        name: user?.name || "",
        email: user?.email || "",
        whatsapp: user?.whatsapp || "",
      });

      setCheckoutData({
        transactionId: checkout.transactionId,
        amount: checkout.amount,
        fee: checkout.fee,
        totalAmount: checkout.totalAmount,
        paymentUrl: checkout.paymentUrl,
        externalRefId: checkout.externalRefId,
        manualPaymentEnabled: checkout.manualPaymentEnabled,
        whatsappNumber: checkout.whatsappNumber,
        bankAccounts: checkout.bankAccounts || [],
      });
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pesanan");
    } finally {
      setProcessing(false);
    }
  };

  // Step 2: Insert transaksi & redirect
  const confirmPayment = async () => {
    if (!checkoutData) return;
    setConfirming(true);
    try {
      await api.post<any>("/transactions", {
        packageId: selectedPkg?.id,
        method: paymentMethod,
        name: user?.name || "",
        email: user?.email || "",
        whatsapp: user?.whatsapp || "",
        paymentUrl: checkoutData.paymentUrl,
        externalRefId: checkoutData.externalRefId,
        fee: checkoutData.fee,
      });

      window.location.href = checkoutData.paymentUrl;
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses pembayaran");
      setConfirming(false);
    }
  };

  // Reset modal state saat ditutup
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCheckoutData(null);
    setConfirming(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Layanan</h1>
          <p className="text-muted-foreground mt-1">Pilih layanan yang Anda butuhkan untuk mengembangkan bisnis Anda.</p>
        </div>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : services.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Belum ada layanan yang tersedia saat ini.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-12">
            {services.map((svc: any) => (
              <div key={svc.id} className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                  {svc.icon === "Cloud" ? <Cloud className="h-6 w-6 text-primary" /> : <ShieldAlert className="h-6 w-6 text-primary" />}
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{svc.nameId}</h2>
                    <p className="text-sm text-slate-500">{svc.descriptionId}</p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  {svc.packages?.map((pkg: any) => (
                    <Card 
                      key={pkg.id} 
                      className="flex flex-col hover:border-primary/50 border-slate-200 shadow-sm transition-all"
                    >
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg">{pkg.nameId}</CardTitle>
                        <div className="mt-2 text-2xl font-bold text-primary">
                          Rp {pkg.price.toLocaleString("id-ID")}
                        </div>
                        <CardDescription className="text-xs font-medium">
                          Garansi: {pkg.warrantyDays} Hari
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <ul className="space-y-2 text-sm text-slate-600">
                          {pkg.featuresId?.map((feat: string, i: number) => (
                            <li key={`in-${i}`} className="flex gap-2 items-start">
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                              <span className="leading-snug">{feat}</span>
                            </li>
                          ))}
                          {pkg.excludedFeaturesId?.map((feat: string, i: number) => (
                            <li key={`ex-${i}`} className="flex gap-2 items-start text-slate-400">
                              <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                              <span className="leading-snug">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <div className="p-6 pt-0 mt-auto">
                        <Button 
                          onClick={() => handleSelectPackage(pkg)} 
                          className="w-full" 
                          variant="outline"
                        >
                          Pilih Paket Ini
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Dialog Checkout 2-step */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) handleCloseModal(); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {checkoutData ? "Konfirmasi Pembayaran" : "Konfirmasi Pesanan"}
            </DialogTitle>
            <DialogDescription>
              {checkoutData
                ? "Periksa rincian biaya sebelum membayar."
                : "Silakan periksa detail pesanan dan masukkan URL target."}
            </DialogDescription>
          </DialogHeader>

          {selectedPkg && !checkoutData && (
            <form onSubmit={onCheckout} className="space-y-6 mt-2">
              {/* Ringkasan Paket Terpilih */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold text-slate-800">{selectedPkg.nameId}</p>
                  <p className="font-bold text-primary whitespace-nowrap">
                    Rp {selectedPkg.price.toLocaleString("id-ID")}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Garansi perlindungan: {selectedPkg.warrantyDays} Hari</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="websiteUrl" className="text-sm font-semibold">URL Website Target <span className="text-red-500">*</span></Label>
                <Input
                  id="websiteUrl"
                  placeholder="Contoh: https://www.websiteanda.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              {/* Pilih Metode Pembayaran */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Metode Pembayaran</Label>
                <div className="flex flex-col gap-2">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                      paymentMethod === "qris" ? "border-blue-500 bg-blue-50/30" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="qris"
                      checked={paymentMethod === "qris"}
                      onChange={() => setPaymentMethod("qris")}
                      className="sr-only"
                    />
                    {paymentMethod === "qris" ? (
                      <CircleDot className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">QRIS (Otomatis)</p>
                      <p className="text-xs text-muted-foreground">Bayar via SumoPod — diproses otomatis</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                      paymentMethod === "manual" ? "border-green-500 bg-green-50/30" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="manual"
                      checked={paymentMethod === "manual"}
                      onChange={() => setPaymentMethod("manual")}
                      className="sr-only"
                    />
                    {paymentMethod === "manual" ? (
                      <CircleDot className="w-4 h-4 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">Transfer Manual (WhatsApp)</p>
                      <p className="text-xs text-muted-foreground">Konfirmasi admin — tanpa biaya tambahan</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-relaxed">
                  {paymentMethod === "qris"
                    ? "Setelah menekan tombol di bawah, kami akan menghitung biaya transaksi dan menampilkan rincian lengkapnya."
                    : "Anda akan dihubungi via WhatsApp untuk petunjuk pembayaran manual setelah pesanan diproses."}
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-11" onClick={handleCloseModal}>
                  Batal
                </Button>
                <Button type="submit" className="flex-1 h-11 font-bold" disabled={processing || !websiteUrl}>
                  {processing ? "Menghitung Biaya..." : "Lanjutkan Pembayaran"}
                </Button>
              </div>
            </form>
          )}

          {selectedPkg && checkoutData && (
            <div className="space-y-4 mt-2">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Paket</span>
                  <span className="font-medium">{selectedPkg.nameId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span>Rp {checkoutData.amount.toLocaleString("id-ID")}</span>
                </div>
                {checkoutData.fee != null && checkoutData.fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Biaya Transaksi (SumoPod)</span>
                    <span className="text-red-500">Rp {checkoutData.fee.toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">
                    Rp {checkoutData.totalAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Bank accounts — hanya untuk manual payment */}
              {paymentMethod === "manual" && checkoutData.bankAccounts?.length > 0 && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-blue-900">Transfer ke rekening berikut:</p>
                  {checkoutData.bankAccounts.map((acc: any, i: number) => (
                    <div key={i} className="bg-white rounded-lg p-3 border border-blue-100 text-sm space-y-1">
                      <p className="font-bold text-blue-900">{acc.bankName}</p>
                      <p className="text-lg font-mono font-bold text-slate-800">{acc.accountNumber}</p>
                      <p className="text-xs text-muted-foreground">a.n. {acc.accountHolder}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-relaxed">
                  {paymentMethod === "qris"
                    ? "Anda akan diarahkan ke halaman pembayaran QRIS SumoPod yang terenkripsi."
                    : "Pesanan akan dikonfirmasi admin setelah Anda melakukan transfer."}
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-11" onClick={handleCloseModal} disabled={confirming}>
                  Batal
                </Button>
                <Button type="button" className="flex-1 h-11 font-bold" disabled={confirming} onClick={confirmPayment}>
                  {confirming ? "Memproses..." : paymentMethod === "manual" ? "Buat Pesanan" : `Bayar Rp ${checkoutData.totalAmount.toLocaleString("id-ID")}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}