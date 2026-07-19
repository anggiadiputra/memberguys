import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExternalLink, ReceiptText, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function TransactionsPage() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  const user = authClient.useSession()?.data?.user;

  useEffect(() => {
    if (!user?.id) return;
    api.get<any[]>(`/transactions?userId=${user.id}`)
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const statusColor = (status: string): "default" | "secondary" | "destructive" =>
    status === "paid" ? "default" : status === "pending" ? "secondary" : "destructive";

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("Navigation.transactions")}</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Semua Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">Belum ada transaksi.</p>
            ) : (
              <div className="divide-y">
                {transactions.map((tr: any) => (
                  <div key={tr.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-800">
                        {tr.package?.service?.nameId} — {tr.package?.nameId}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {tr.id} · {new Date(tr.createdAt).toLocaleString("id-ID")}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-left sm:text-right w-full sm:w-auto mb-2 sm:mb-0">
                        <p className="text-sm font-bold text-slate-900 mb-1">Rp {tr.amount.toLocaleString("id-ID")}</p>
                        <Badge variant={statusColor(tr.status)} className="text-xs">{tr.status}</Badge>
                      </div>

                      {/* Jika masih pending, tombol Bayar */}
                      {tr.status === "pending" && tr.paymentUrl && (
                        <a href={tr.paymentUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700">
                            Bayar Sekarang <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      )}

                      {/* Jika sudah Lunas, tombol Invoice */}
                      {tr.status === "paid" && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-1.5"
                          onClick={() => {
                            setSelectedInvoice(tr);
                            setInvoiceOpen(true);
                          }}
                        >
                          <ReceiptText className="h-3.5 w-3.5" /> Lihat Invoice
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal Invoice Digital */}
        <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
          <DialogContent className="max-w-md print:max-w-none print:m-0 print:shadow-none print:border-none p-0 overflow-hidden">
            <div className="bg-slate-900 p-6 text-white print:bg-white print:text-black print:p-0 print:mb-6">
              <h2 className="text-2xl font-black tracking-tight">INVOICE</h2>
              <p className="text-slate-400 text-sm print:text-slate-500 font-mono mt-1">{selectedInvoice?.id}</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Diterbitkan Untuk:</p>
                  <p className="font-bold">{user?.name || "Pelanggan"}</p>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground mb-1">Tanggal Bayar:</p>
                  <p className="font-semibold">
                    {selectedInvoice?.paidAt 
                      ? new Date(selectedInvoice.paidAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })
                      : new Date().toLocaleDateString("id-ID")}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-semibold">Deskripsi Layanan</th>
                      <th className="text-right p-3 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3">
                        <p className="font-bold text-slate-800">{selectedInvoice?.package?.service?.nameId}</p>
                        <p className="text-muted-foreground mt-0.5">{selectedInvoice?.package?.nameId}</p>
                      </td>
                      <td className="p-3 text-right font-medium">
                        Rp {selectedInvoice?.amount?.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
                <span className="font-bold text-slate-700">Total Dibayar</span>
                <span className="font-black text-xl text-primary">
                  Rp {selectedInvoice?.amount?.toLocaleString("id-ID")}
                </span>
              </div>
              
              <div className="text-center">
                <Badge variant="default" className="bg-green-500 hover:bg-green-500/90 print:border-black print:text-black">LUNAS (PAID)</Badge>
                <p className="text-xs text-muted-foreground mt-2 font-mono">Ref: {selectedInvoice?.externalRefId || "Manual"}</p>
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-end print:hidden">
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" /> Cetak / Simpan PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
      </div>
    </DashboardLayout>
  );
}
