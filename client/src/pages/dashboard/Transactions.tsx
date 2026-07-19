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
          <DialogContent className="sm:max-w-[420px] print:max-w-none print:m-0 print:shadow-none print:border-none p-0 overflow-hidden rounded-md border-slate-200">
            {/* Header Invoice */}
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 print:bg-white print:border-b-2 print:border-slate-800 print:px-0">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">INVOICE</h2>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedInvoice?.id}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px] tracking-wider font-bold rounded-sm print:border-black print:text-black">
                    LUNAS
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-5 space-y-6 print:px-0">
              {/* Info Pelanggan & Tanggal */}
              <div className="flex justify-between text-sm">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Dibayar Oleh</p>
                  <p className="font-medium text-slate-800 leading-tight">{user?.name || "Pelanggan"}</p>
                  <p className="text-slate-500 text-xs">{user?.email}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Tanggal</p>
                  <p className="font-medium text-slate-800 text-sm">
                    {selectedInvoice?.paidAt 
                      ? new Date(selectedInvoice.paidAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })
                      : new Date().toLocaleDateString("id-ID")}
                  </p>
                </div>
              </div>

              {/* Tabel Rincian */}
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Layanan</th>
                      <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 text-[13px]">{selectedInvoice?.package?.service?.nameId}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{selectedInvoice?.package?.nameId}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 text-[13px] align-top">
                        Rp {selectedInvoice?.amount?.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50/80 border-t border-slate-200">
                    <tr>
                      <td className="px-4 py-3 text-right font-medium text-xs text-slate-600">Total Pembayaran</td>
                      <td className="px-4 py-3 text-right font-bold text-base text-slate-900">
                        Rp {selectedInvoice?.amount?.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div className="text-center pt-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Metode: {selectedInvoice?.paymentMethod} &bull; Ref: {selectedInvoice?.externalRefId || "-"}</p>
                <p className="text-[10px] text-slate-400 mt-1">Terima kasih atas kepercayaan Anda.</p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end print:hidden">
              <Button onClick={handlePrint} size="sm" variant="outline" className="gap-2 text-xs h-8 rounded-md bg-white">
                <Printer className="w-3.5 h-3.5" /> Cetak PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
      </div>
    </DashboardLayout>
  );
}
