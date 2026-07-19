import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ExternalLink, SearchX } from "lucide-react";
import { toast } from "sonner";

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string>("");

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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/80 text-left text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    <th className="px-3 py-3 whitespace-nowrap">Tanggal</th>
                    <th className="px-3 py-3 whitespace-nowrap">Pelanggan</th>
                    <th className="px-3 py-3 whitespace-nowrap">Layanan</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">Tagihan</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Status</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tr: any) => (
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
                        {tr.fee != null && tr.fee > 0 && (
                          <p className="text-[11px] text-red-500">+ fee Rp {tr.fee.toLocaleString("id-ID")}</p>
                        )}
                        {tr.fee != null && (
                          <p className="text-xs text-muted-foreground mt-0.5">= Rp {(tr.amount + tr.fee).toLocaleString("id-ID")}</p>
                        )}
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
