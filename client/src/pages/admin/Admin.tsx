import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CreditCard, Package, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";

export default function AdminPage() {
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40 w-full" /> :
              transactions.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground">Belum ada transaksi.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">ID</th>
                        <th className="pb-2 font-medium">User</th>
                        <th className="pb-2 font-medium">Paket</th>
                        <th className="pb-2 font-medium">Nominal</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions.map((tr: any) => (
                        <tr key={tr.id}>
                          <td className="py-2 font-mono text-xs">{tr.id.slice(0, 12)}…</td>
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
                              <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"
                                onClick={() => confirmPayment(tr.id)}>
                                <Check className="h-3 w-3" /> Konfirmasi
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
