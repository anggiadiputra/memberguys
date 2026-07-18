import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";

export default function PaymentCancelPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id") || searchParams.get("payment_id");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md text-center shadow-lg border-red-100">
        <CardHeader className="pb-4">
          <div className="mx-auto bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-700">Pembayaran Dibatalkan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Proses pembayaran telah dibatalkan atau tidak diselesaikan. Jangan khawatir, Anda tidak dikenakan biaya apapun.
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
          <Link to={`/dashboard/transactions`} className="w-full">
            <Button className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Transaksi
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
