import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ExternalLink, ReceiptText, Printer, SearchX } from "lucide-react";
import { toast } from "sonner";
import { useTable } from "@/hooks/useTable";
import { SearchInput, TablePagination } from "@/components/table/TableComponents";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePageTitle } from "@/hooks/usePageTitle";
export default function AdminTransactionsPage() {
  usePageTitle("Transaksi");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string>("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const loadData = async (id: string) => {
    try {
      setTransactions(await api.get<any[]>("/admin/transactions", { headers: { "X-Admin-Id": id } }));
    } catch (e: any) {
      toast.error("Gagal memuat transaksi: " + e.message);
    }
  };

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data?.user) return;
      setAdminId(data.user.id);
      loadData(data.user.id).finally(() => setLoading(false));
    });
  }, []);

  const confirmPayment = async (trxId: string) => {
    try {
      await api.patch(`/transactions/${trxId}/confirm`);
      toast.success("Pembayaran dikonfirmasi!");
      if (adminId) loadData(adminId);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const table = useTable({
    data: transactions,
    pageSize: 15,
    searchKeys: [
      (tr: any) => tr.user?.name || "",
      (tr: any) => tr.user?.email || "",
      (tr: any) => tr.package?.service?.nameId || "",
      (tr: any) => tr.package?.nameId || "",
      (tr: any) => tr.id || "",
      (tr: any) => tr.status || "",
    ],
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Transaksi</h1>

        <Card>
          {loading ? (
            <CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent>
          ) : transactions.length === 0 ? (
            <CardContent className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
              <SearchX className="w-10 h-10 text-slate-300" />
              <p>Belum ada transaksi.</p>
            </CardContent>
          ) : (
            <div>
              <div className="px-3 py-2 border-b bg-slate-50/50">
                <SearchInput value={table.search} onChange={table.setSearch} placeholder="Cari nama, email, layanan, ID..." />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50/80 text-left text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      <th className="px-3 py-3 whitespace-nowrap">Tanggal</th>
                      <th className="px-3 py-3 whitespace-nowrap">Pelanggan</th>
                      <th className="px-3 py-3 whitespace-nowrap">Layanan</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">Biaya Jasa</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">Fee Payment</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap">Total Tagihan</th>
                      <th className="px-3 py-3 text-center whitespace-nowrap">Status</th>
                      <th className="px-3 py-3 text-right whitespace-nowrap w-36">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {table.rows.map((tr: any) => (
                      <tr key={tr.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap align-top">
                          <p>{new Date(tr.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}</p>
                          <p className="text-[11px]">{new Date(tr.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-1 max-w-[160px] truncate" title={tr.id}>{tr.id}</p>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <p className="font-medium text-slate-800">{tr.user?.name || <span className="text-muted-foreground italic">No Name</span>}</p>
                          <p className="text-xs text-muted-foreground">{tr.user?.email}</p>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <p className="text-slate-800">{tr.package?.service?.nameId}</p>
                          <p className="text-xs text-muted-foreground">{tr.package?.nameId}</p>
                        </td>
                        <td className="px-3 py-3 text-right align-top whitespace-nowrap">
                          <p className="font-semibold text-slate-800">Rp {tr.amount.toLocaleString("id-ID")}</p>
                        </td>
                        <td className="px-3 py-3 text-right align-top whitespace-nowrap">
                          {tr.fee != null && tr.fee > 0 ? (
                            <span className="text-red-500 font-medium">Rp {tr.fee.toLocaleString("id-ID")}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right align-top whitespace-nowrap">
                          <p className="font-semibold text-slate-800">
                            Rp {(tr.amount + (tr.fee || 0)).toLocaleString("id-ID")}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-center align-top">
                          <Badge variant={tr.status === "paid" ? "default" : tr.status === "pending" ? "secondary" : "destructive"} className="text-[10px]">
                            {tr.status === "paid" ? "Lunas" : tr.status === "pending" ? "Pending" : "Gagal"}
                          </Badge>
                          {tr.paymentMethod && (
                            <p className="text-[10px] text-muted-foreground uppercase mt-1">{tr.paymentMethod}</p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          {tr.status === "pending" && (
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" className="h-8 text-xs gap-1 whitespace-nowrap"
                                onClick={() => confirmPayment(tr.id)}>
                                <Check className="w-3 h-3" /> Konfirmasi
                              </Button>
                              {tr.paymentUrl && (
                                <a href={tr.paymentUrl} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          )}
                          {tr.status === "paid" && (
                            <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => { setSelectedInvoice(tr); setInvoiceOpen(true); }}
                              title="Lihat Invoice"
                            >
                              <ReceiptText className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={async () => {
                                try {
                                  await api.post("/admin/activate-subscription", { transactionId: tr.id }, {
                                    headers: { "X-Admin-Id": adminId },
                                  });
                                  toast.success("Garansi berhasil diaktifkan!");
                                  if (adminId) loadData(adminId);
                                } catch (e: any) {
                                  toast.error(e.message || "Gagal mengaktifkan garansi");
                                }
                              }}
                            >
                              Aktifkan Garansi
                            </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {table.totalFiltered === 0 && table.search && (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Tidak ada hasil untuk "{table.search}"
                </div>
              )}
              <TablePagination
                page={table.page}
                totalPages={table.totalPages}
                total={table.total}
                totalFiltered={table.totalFiltered}
                goTo={table.goTo}
                next={table.next}
                prev={table.prev}
              />
            </div>
          )}
        </Card>
      </div>

      {/* Invoice Modal */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden rounded-xl border-slate-200 shadow-xl">
          <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-5 border-b">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">Invoice</DialogTitle>
                <p className="text-xs text-muted-foreground font-mono mt-1">{selectedInvoice?.id}</p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px] font-semibold">Lunas</Badge>
            </div>
          </div>
          <div className="px-6 py-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-[10px] text-muted-foreground uppercase font-semibold">Dari</p><p className="font-bold text-slate-800 mt-1">MemberGuys</p><p className="text-xs text-slate-500">hello@ekstensi.id</p></div>
              <div className="text-right"><p className="text-[10px] text-muted-foreground uppercase font-semibold">Tanggal</p><p className="font-semibold text-slate-800 mt-1">{new Date(selectedInvoice?.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</p></div>
              <div className="col-span-2"><p className="text-[10px] text-muted-foreground uppercase font-semibold">Kepada</p><p className="font-semibold text-slate-800 mt-1">{selectedInvoice?.user?.name || "Pelanggan"}</p><p className="text-xs text-slate-500">{selectedInvoice?.user?.email}</p></div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 border-b"><th className="text-left px-4 py-2.5 text-[10px] uppercase text-muted-foreground font-semibold">Layanan</th><th className="text-right px-4 py-2.5 text-[10px] uppercase text-muted-foreground font-semibold w-28">Jumlah</th></tr></thead>
                <tbody><tr className="border-b"><td className="px-4 py-3"><p className="font-semibold text-slate-800">{selectedInvoice?.package?.service?.nameId} — {selectedInvoice?.package?.nameId}</p></td><td className="px-4 py-3 text-right font-semibold">Rp {selectedInvoice?.amount?.toLocaleString("id-ID")}</td></tr></tbody>
                <tfoot>
                  {selectedInvoice?.fee > 0 && <tr className="border-b"><td className="px-4 py-2 text-right text-xs text-red-500">Biaya Transaksi</td><td className="px-4 py-2 text-right text-xs text-red-500">Rp {selectedInvoice?.fee?.toLocaleString("id-ID")}</td></tr>}
                  <tr className="bg-slate-50/50"><td className="px-4 py-3 text-right text-xs text-slate-600 uppercase font-semibold">Total</td><td className="px-4 py-3 text-right font-bold text-base text-slate-900">Rp {((selectedInvoice?.amount || 0) + (selectedInvoice?.fee || 0)).toLocaleString("id-ID")}</td></tr>
                </tfoot>
              </table>
            </div>
            <p className="text-center text-[10px] text-slate-400">Metode: {selectedInvoice?.paymentMethod === "manual" ? "Transfer Manual" : "QRIS (SumoPod)"} &middot; Ref: {selectedInvoice?.externalRefId || "-"}</p>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t flex justify-end print:hidden">
            <Button onClick={() => window.print()} size="sm" variant="outline" className="gap-2 text-xs rounded-lg bg-white shadow-sm">
              <Printer className="w-3.5 h-3.5" /> Cetak
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
