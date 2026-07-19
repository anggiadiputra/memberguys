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
import { CheckCircle2, ShieldAlert, AlertTriangle, FileText } from "lucide-react";
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
      const res = await api.post<any>("/transactions", { 
        userId: user?.id, 
        packageId: selectedPkg.id 
      });
      
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        toast.error("Gagal mendapatkan link pembayaran");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pesanan");
    } finally {
      setProcessing(false);
    }
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
                  <ShieldAlert className="h-6 w-6 text-primary" />
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
                            <li key={i} className="flex gap-2 items-start">
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
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

      {/* Modal Dialog Checkout Sederhana */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Konfirmasi Pesanan
            </DialogTitle>
            <DialogDescription>
              Silakan periksa detail pesanan dan masukkan URL target.
            </DialogDescription>
          </DialogHeader>

          {selectedPkg && (
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

              <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-relaxed">
                  Setelah menekan tombol di bawah, Anda akan dialihkan secara otomatis ke halaman pembayaran <strong>QRIS SumoPod</strong> yang terenkripsi.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 h-11" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 h-11 font-bold" 
                  disabled={processing || !websiteUrl}
                >
                  {processing ? "Memproses..." : "Lanjutkan Pembayaran"}
               </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}