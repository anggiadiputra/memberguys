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
import { useTable, SortIcon } from "@/hooks/useTable";
import { SearchInput, TablePagination } from "@/components/table/TableComponents";
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

  // Table hooks
  const table = useTable({
    data: transactions,
    pageSize: 10,
    searchKeys: [
      (tr: any) => tr.package?.service?.nameId || "",
      (tr: any) => tr.package?.nameId || "",
      (tr: any) => tr.status || "",
      (tr: any) => String(tr.amount),
    ],
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{t("Navigation.transactions")}</h1>
          {transactions.length > 0 && (
            <p className="text-sm text-muted-foreground">{transactions.length} transaksi</p>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 p-4 bg-white rounded-xl border">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <Card className="shadow-sm border-dashed">
            <CardContent className="py-20 text-center text-muted-foreground flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <ReceiptText className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <p className="font-medium text-slate-700">Belum ada transaksi</p>
                <p className="text-sm mt-1">Setiap pesanan yang Anda buat akan muncul di sini.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-slate-50/50 flex items-center gap-3">
              <div className="flex-1 max-w-xs">
                <SearchInput
                  value={table.search}
                  onChange={table.setSearch}
                  placeholder="Cari layanan, status..."
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <th className="px-5 py-3.5 w-10"></th>
                    <th className="px-5 py-3.5 cursor-pointer select-none" onClick={() => table.toggleSort("amount")}>
                      Layanan <SortIcon active={table.sortKey === "amount"} dir={table.sortDir} />
                    </th>
                    <th className="px-5 py-3.5">Tanggal</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Total</th>
                    <th className="px-5 py-3.5 text-right w-24">Fee</th>
                    <th className="px-5 py-3.5 text-right w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                        Tidak ada hasil untuk <span className="font-mono text-slate-500">&quot;{table.search}&quot;</span>
                      </td>
                    </tr>
                  ) : (
                  table.rows.map((tr: any) => {
                    const s = STATUS_MAP[tr.status] || STATUS_MAP.pending;
                    const Icon = s.icon;
                    const total = tr.amount + (tr.fee || 0);
                    const isPaid = tr.status === "paid";
                    const isPending = tr.status === "pending";
                    return (
                      <tr key={tr.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Indikator warna */}
                        <td className="px-5 py-4">
                          <div className={`w-2 h-2 rounded-full ${isPaid ? "bg-green-500" : isPending ? "bg-amber-400" : "bg-red-400"}`} />
                        </td>
                        {/* Layanan */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isPaid ? "bg-green-100" : isPending ? "bg-amber-100" : "bg-red-100"}`}>
                              <Icon className={`w-4.5 h-4.5 ${isPaid ? "text-green-600" : isPending ? "text-amber-600" : "text-red-600"}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate max-w-[200px]">
                                {tr.package?.service?.nameId}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {tr.package?.nameId}
                              </p>
                            </div>
                          </div>
                        </td>
                        {/* Tanggal */}
                        <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(tr.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        {/* Status */}
                        <td className="px-5 py-4">
                          <Badge variant={s.variant} className="gap-1.5 text-[11px] px-2.5 py-1 whitespace-nowrap font-medium">
                            <Icon className="w-3.5 h-3.5" /> {s.label}
                          </Badge>
                        </td>
                        {/* Total */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <p className="font-bold text-slate-900">Rp {total.toLocaleString("id-ID")}</p>
                        </td>
                        {/* Fee */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          {tr.fee != null && tr.fee > 0 ? (
                            <span className="text-xs text-red-500 font-medium">Rp {tr.fee.toLocaleString("id-ID")}</span>
                          ) : tr.fee === 0 ? (
                            <span className="text-xs text-green-600">Gratis</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        {/* Aksi */}
                        <td className="px-5 py-4 text-right">
                          {isPending && tr.paymentUrl && (
                            <a href={tr.paymentUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" className="h-8 text-xs gap-1.5 px-3">
                                Bayar <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            </a>
                          )}
                          {isPending && !tr.paymentUrl && (
                            <Button size="sm" variant="outline" disabled className="h-8 text-xs gap-1.5 px-3 cursor-not-allowed opacity-60">
                              <CircleAlert className="w-3.5 h-3.5" /> Verifikasi
                            </Button>
                          )}
                          {isPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1.5 px-3"
                              onClick={() => { setSelected(tr); setInvoiceOpen(true); }}
                            >
                              <ReceiptText className="w-3.5 h-3.5" /> Invoice
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={table.page}
              totalPages={table.totalPages}
              total={table.total}
              totalFiltered={table.totalFiltered}
              goTo={table.goTo}
              next={table.next}
              prev={table.prev}
            />
          </Card>
        )}

        {/* Invoice Modal */}
        <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
          <DialogContent className="sm:max-w-[460px] print:max-w-none print:m-0 print:shadow-none print:border-none p-0 overflow-hidden rounded-xl border-slate-200 shadow-xl">
            <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-5 border-b border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900">{t("Invoice.title")}</DialogTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{selected?.id}</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px] font-semibold tracking-wider px-2.5 py-1">
                  {t("Invoice.statusPaid")}
                </Badge>
              </div>
            </div>

            <div className="px-6 py-6 space-y-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest">{t("Invoice.from")}</p>
                  <p className="font-bold text-slate-800 mt-1">MemberGuys</p>
                  <p className="text-slate-500 text-xs">hello@ekstensi.id</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest">{t("Invoice.date")}</p>
                  <p className="font-semibold text-slate-800 mt-1">
                    {(selected?.paidAt ? new Date(selected.paidAt) : new Date()).toLocaleDateString(
                      i18n.language === "en" ? "en-US" : "id-ID",
                      { day: "2-digit", month: "long", year: "numeric" }
                    )}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest">{t("Invoice.to")}</p>
                  <p className="font-semibold text-slate-800 mt-1">{user?.name || "Pelanggan"}</p>
                  <p className="text-slate-500 text-xs">{user?.email}</p>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{t("Invoice.service")}</th>
                      <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold w-28">{t("Invoice.amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800 text-[13px]">
                          {i18n.language === "en" ? selected?.package?.service?.nameEn : selected?.package?.service?.nameId}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {i18n.language === "en" ? selected?.package?.nameEn : selected?.package?.nameId}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-800 text-[13px] align-top">
                        Rp {(selected?.amount || 0).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    {selected?.fee != null && selected.fee > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="px-4 py-2.5 text-right text-xs text-red-500 font-medium">Biaya Transaksi</td>
                        <td className="px-4 py-2.5 text-right text-xs text-red-500">
                          Rp {selected.fee.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-50/50">
                      <td className="px-4 py-3.5 text-right text-xs text-slate-600 uppercase font-semibold tracking-wider">{t("Invoice.total")}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-base text-slate-900">
                        Rp {((selected?.amount || 0) + (selected?.fee || 0)).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="text-center space-y-1">
                <p className="text-[10px] text-muted-foreground">
                  {t("Invoice.method")}: <span className="font-medium text-slate-700">{selected?.paymentMethod === "manual" ? "Transfer Manual" : "QRIS (SumoPod)"}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  {t("Invoice.ref")}: <span className="font-mono text-slate-700">{selected?.externalRefId || "-"}</span>
                </p>
                <p className="text-[10px] text-slate-400">{t("Invoice.thankYou")}</p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2 print:hidden">
              <Button onClick={handlePrint} size="sm" variant="outline" className="gap-2 text-xs rounded-lg bg-white shadow-sm">
                <Printer className="w-3.5 h-3.5" /> {t("Invoice.print")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
