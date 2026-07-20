import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Package } from "lucide-react";

import { usePageTitle } from "@/hooks/usePageTitle";
export default function PaymentSuccessPage() {
  usePageTitle("Pembayaran Berhasil");
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id") || searchParams.get("payment_id") || searchParams.get("transactionId") || searchParams.get("transaction_id");
  
  const [status, setStatus] = useState<"loading" | "success" | "pending">("loading");

  useEffect(() => {
    // Meskipun webhook sudah memproses data, kita beri jeda sedikit atau
    // langsung tampilkan halaman sukses sebagai konfirmasi visual untuk pelanggan.
    // Di aplikasi nyata, Anda bisa memanggil API untuk mengecek ulang status jika perlu.
    const timer = setTimeout(() => setStatus("success"), 1500);
    return () => clearTimeout(timer);
  }, [orderId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md text-center shadow-lg border-green-100">
        <CardHeader className="pb-4">
          <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            {status === "loading" ? (
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            )}
          </div>
          <CardTitle className="text-2xl text-green-700">Pembayaran Berhasil!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Terima kasih! Pembayaran Anda telah kami terima dan paket layanan Anda kini sedang aktif.
          </p>
          {orderId && (
            <div className="bg-slate-100 p-3 rounded-md text-sm">
              <span className="text-muted-foreground">ID Pesanan:</span>
              <br />
              <span className="font-mono font-medium">{orderId}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Link to="/dashboard/packages" className="w-full">
            <Button className="w-full gap-2">
              <Package className="w-4 h-4" />
              Lihat Paket Saya
            </Button>
          </Link>
          <Link to="/dashboard" className="w-full">
            <Button variant="ghost" className="w-full">
              Kembali ke Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
