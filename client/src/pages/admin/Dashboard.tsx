import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CreditCard, Package, AlertCircle, Check, SearchX, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const [stats, setStats] = useState<any>(null);
  const [recentTrx, setRecentTrx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = authClient.useSession();
  const user = session?.user as any;

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      api.get<any>("/admin/stats", { headers: { "X-Admin-Id": user.id } }),
      api.get<any[]>("/admin/transactions", { headers: { "X-Admin-Id": user.id } }),
    ]).then(([s, tr]) => {
      setStats(s);
      setRecentTrx(tr.slice(0, 8));
    }).catch((e) => toast.error("Gagal memuat data: " + e.message))
    .finally(() => setLoading(false));
  }, [user?.id]);

  const confirmPayment = async (trxId: string) => {
    try {
      await api.patch(`/transactions/${trxId}/confirm`);
      toast.success("Pembayaran dikonfirmasi!");
      if (user?.id) {
        const tr = await api.get<any[]>("/admin/transactions", { headers: { "X-Admin-Id": user.id } });
        setRecentTrx(tr.slice(0, 8));
      }
    } catch (e: any) { toast.error(e.message); }
  };

  const statCards = [
    { label: "Total Pengguna", value: stats?.totalUsers, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Total Transaksi", value: stats?.totalTransactions, icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
    { label: "Paket Aktif", value: stats?.activeSubscriptions, icon: Package, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Menunggu Konfirmasi", value: stats?.pendingTransactions, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-100" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((item) => (
            <Card key={item.label} className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{item.label}</p>
                    {loading ? <Skeleton className="h-8 w-16 mt-1" /> :
                      <p className="text-3xl font-bold text-slate-900 mt-1">{item.value ?? 0}</p>
                    }
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Transactions */}
        <Card className="shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-slate-800">Transaksi Terbaru</h2>
          </div>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : recentTrx.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <SearchX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">Belum ada transaksi.</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentTrx.map((tr: any) => (
                  <div key={tr.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {tr.package?.service?.nameId} — {tr.package?.nameId}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{tr.id}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold">Rp {tr.amount.toLocaleString("id-ID")}</p>
                        <p className="text-[10px] text-muted-foreground">{tr.user?.name || "Guest"}</p>
                      </div>
                      <Badge variant={tr.status === "paid" ? "default" : tr.status === "pending" ? "secondary" : "destructive"} className="text-[10px] px-2 py-0.5">
                        {tr.status === "paid" ? "Lunas" : tr.status === "pending" ? "Pending" : "Gagal"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
