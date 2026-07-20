import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CreditCard, Package, AlertCircle, Check, SearchX } from "lucide-react";
import { toast } from "sonner";
import { useTable } from "@/hooks/useTable";
import { SearchInput } from "@/components/table/TableComponents";

import { usePageTitle } from "@/hooks/usePageTitle";
export default function AdminPage() {
  usePageTitle("Ringkasan");
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = authClient.useSession();
  const user = session?.user as any;

  const loadData = async (adminId: string) => {
    // Ubah pemanggilan menjadi sequential (berurutan) agar tidak terjadi 
    // ConnectTimeoutError pada driver serverless HTTP Neon saat memuat middleware secara paralel
    const s = await api.get<any>(`/admin/stats`, { headers: { "X-Admin-Id": adminId } });
    const tr = await api.get<any[]>(`/admin/transactions`, { headers: { "X-Admin-Id": adminId } });
    
    setStats(s);
    setTransactions(tr);
  };

  useEffect(() => {
    if (user?.id) {
      loadData(user.id).catch(e => {
        toast.error(e.message || "Gagal memuat data admin");
      }).finally(() => setLoading(false));
    }
  }, [user?.id]);

  const confirmPayment = async (trxId: string) => {
    try {
      await api.patch(`/transactions/${trxId}/confirm`);
      toast.success("Pembayaran dikonfirmasi, paket aktif!");
      if (user) loadData(user.id);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const table = useTable({
    data: transactions,
    pageSize: 50,
    searchKeys: [
      (tr: any) => tr.id || "",
      (tr: any) => tr.user?.name || "",
      (tr: any) => tr.user?.email || "",
      (tr: any) => tr.package?.nameId || "",
      (tr: any) => tr.package?.service?.nameId || "",
      (tr: any) => tr.status || "",
    ],
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Pengguna", value: stats?.totalUsers, icon: Users },
            { label: "Total Transaksi", value: stats?.totalTransactions, icon: CreditCard },
            { label: "Paket Aktif", value: stats?.activeSubscriptions, icon: Package },
            { label: "Menunggu Konfirmasi", value: stats?.pendingTransactions, icon: AlertCircle },
          ].map((item) => (
            <Card key={item.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-7 w-12" /> :
                  <p className="text-2xl font-bold">{item.value ?? 0}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Transactions Table */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
              {!loading && <p className="text-xs text-muted-foreground">{transactions.length} transaksi</p>}
            </div>
          </CardHeader>
          <div className="px-4 py-2">
            <SearchInput value={table.search} onChange={table.setSearch} placeholder="Cari ID, nama, paket..." />
          </div>
          <CardContent className="p-0">
            {loading ? <div className="p-6"><Skeleton className="h-40 w-full" /></div> :
              table.rows.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <SearchX className="w-8 h-8 text-slate-300" />
                  <p className="text-sm">{transactions.length === 0 ? "Belum ada transaksi." : <span>Tidak ada hasil untuk <span className="font-mono">&quot;{table.search}&quot;</span></span>}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground font-semibold bg-slate-50/50">
                        <th className="px-4 py-2.5 font-medium">ID</th>
                        <th className="px-4 py-2.5 font-medium">User</th>
                        <th className="px-4 py-2.5 font-medium">Paket</th>
                        <th className="px-4 py-2.5 font-medium text-right">Nominal</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5 font-medium text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {table.rows.map((tr: any) => (
                        <tr key={tr.id}>
                          <td className="py-2 font-mono text-xs max-w-[200px] truncate" title={tr.id}>{tr.id}</td>
                          <td className="py-2">{tr.user?.name ?? tr.userId}</td>
                          <td className="py-2">{tr.package?.nameId ?? "-"}</td>
                          <td className="py-2">Rp {tr.amount.toLocaleString("id-ID")}</td>
                          <td className="py-2">
                            <Badge variant={tr.status === "paid" ? "default" : tr.status === "pending" ? "secondary" : "destructive"}>
                              {tr.status}
                            </Badge>
                          </td>
                          <td className="py-2">
                            {tr.status === "pending" && (
                              <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => confirmPayment(tr.id)}>
                                <Check className="h-3 w-3" /> Konfirmasi
                              </Button>
                            )}
                            {tr.status === "paid" && (
                              <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={async () => {
                                try {
                                  await api.post("/admin/activate-subscription", { transactionId: tr.id }, { headers: { "X-Admin-Id": user.id } });
                                  toast.success("Garansi berhasil diaktifkan!");
                                  if (user) loadData(user.id);
                                } catch (e: any) { toast.error(e.message || "Gagal mengaktifkan garansi"); }
                              }}>
                                Aktifkan Garansi
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
