import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExternalLink, ReceiptText, Printer, CircleAlert, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import i18n from "@/i18n";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: any }> = {
  paid:    { label: "Lunas",   variant: "default",    icon: CheckCircle2 },
  pending: { label: "Menunggu", variant: "secondary",  icon: Clock },
  failed:  { label: "Gagal",   variant: "destructive", icon: XCircle },
};

export default function TransactionsPage() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const user = authClient.useSession()?.data?.user;

  useEffect(() => {
    if (!user?.id) return;
    api.get<any[]>(`/transactions?userId=${user.id}`)
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handlePrint = () => window.print();

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("Navigation.transactions")}</h1>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : transactions.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
              <ReceiptText className="w-10 h-10 text-slate-300" />
              <p>Belum ada transaksi.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/80 text-left text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    <th className="px-4 py-3">Layanan</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((tr: any) => {
                    const s = STATUS_MAP[tr.status] || STATUS_MAP.pending;
                    const Icon = s.icon;
                    return (
                      <tr key={tr.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 truncate max-w-[220px]">
                            {tr.package?.service?.nameId}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {tr.package?.nameId}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {new Date(tr.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={s.variant} className="gap-1 text-[11px] px-2 py-0.5 whitespace-nowrap">
                              <Icon className="w-3 h-3" /> {s.label}
                            </Badge>
                            {tr.paymentMethod && tr.paymentMethod !== "qris" && (
                              <span className="text-[10px] text-muted-foreground uppercase">Manual</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                          Rp {tr.amount.toLocaleString("id-ID")}
                          {tr.fee != null && tr.fee > 0 && (
                            <span className="block text-[10px] text-red-400 font-normal">+fee {tr.fee.toLocaleString("id-ID")}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tr.status === "pending" && tr.paymentUrl && (
                            <a href={tr.paymentUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" className="h-8 text-xs gap-1">
                                Bayar <ExternalLink className="w-3 h-3" />
                              </Button>
                            </a>
                          )}
                          {tr.status === "pending" && !tr.paymentUrl && (
                            <Button size="sm" variant="outline" disabled className="h-8 text-xs gap-1 cursor-not-allowed">
                              <CircleAlert className="w-3 h-3" /> Verifikasi
                            </Button>
                          )}
                          {tr.status === "paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={() => { setSelected(tr); setInvoiceOpen(true); }}
                            >
                              <ReceiptText className="w-3 h-3" /> Invoice
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Invoice Modal */}
        <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
          <DialogContent className="sm:max-w-[460px] print:max-w-none print:m-0 print:shadow-none print:border-none p-0 overflow-hidden rounded-xl border-slate-200">
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900">{t("Invoice.title")}</DialogTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{selected?.id}</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px] font-bold">
                  {t("Invoice.statusPaid")}
                </Badge>
              </div>
            </div>

            <div className="px-6 py-5 space-y-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">{t("Invoice.from")}</p>
                  <p className="font-bold text-slate-800 mt-0.5">MemberGuys</p>
                  <p className="text-slate-500 text-xs">hello@ekstensi.id</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">{t("Invoice.date")}</p>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {(selected?.paidAt ? new Date(selected.paidAt) : new Date()).toLocaleDateString(
                      i18n.language === "en" ? "en-US" : "id-ID",
                      { day: "2-digit", month: "short", year: "numeric" }
                    )}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">{t("Invoice.to")}</p>
                  <p className="font-medium text-slate-800 mt-0.5">{user?.name || "Pelanggan"}</p>
                  <p className="text-slate-500 text-xs">{user?.email}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b">
                      <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{t("Invoice.service")}</th>
                      <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium w-28">{t("Invoice.amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 text-[13px]">
                          {i18n.language === "en" ? selected?.package?.service?.nameEn : selected?.package?.service?.nameId}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {i18n.language === "en" ? selected?.package?.nameEn : selected?.package?.nameId}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 text-[13px] align-top">
                        Rp {(selected?.amount || 0).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    {selected?.fee != null && selected.fee > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="px-4 py-2 text-right text-xs text-red-500 font-medium">Biaya Transaksi</td>
                        <td className="px-4 py-2 text-right text-xs text-red-500">
                          Rp {selected.fee.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-4 py-3 text-right text-xs text-slate-600 uppercase font-semibold tracking-wider">{t("Invoice.total")}</td>
                      <td className="px-4 py-3 text-right font-bold text-base text-slate-900">
                        Rp {((selected?.amount || 0) + (selected?.fee || 0)).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {t("Invoice.method")}: {selected?.paymentMethod === "manual" ? "Transfer Manual" : "QRIS"}
                  &ensp;·&ensp;
                  {t("Invoice.ref")}: {selected?.externalRefId || "-"}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">{t("Invoice.thankYou")}</p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end print:hidden">
              <Button onClick={handlePrint} size="sm" variant="outline" className="gap-2 text-xs rounded-lg bg-white">
                <Printer className="w-3.5 h-3.5" /> {t("Invoice.print")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
