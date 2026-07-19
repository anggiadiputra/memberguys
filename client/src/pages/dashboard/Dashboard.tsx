import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Package, CreditCard, ShieldCheck, ArrowRight } from "lucide-react";
import { differenceInDays } from "date-fns";

export default function DashboardPage() {
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data?.user) return;
      setUser(data.user);
      const uid = data.user.id;

      // Cek pesanan tertunda (untuk kasus login via Google OAuth)
      const pendingPkg = sessionStorage.getItem("pending_order_pkg");
      if (pendingPkg) {
        api.post<any>("/transactions", { userId: uid, packageId: pendingPkg })
          .then((res) => {
            sessionStorage.removeItem("pending_order_pkg");
            sessionStorage.removeItem("pending_order_url");
            if (res.paymentUrl) window.location.href = res.paymentUrl;
          })
          .catch(() => {});
      }

      // Sync user data to local DB seamlessly
      api.post("/users/sync", data.user).catch(() => {});

      Promise.all([
        api.get<any[]>(`/subscriptions?userId=${uid}`),
        api.get<any[]>(`/transactions?userId=${uid}`),
      ]).then(([s, tr]) => {
        setSubs(s);
        setTransactions(tr.slice(0, 5));
      }).finally(() => setLoading(false));
    });
  }, []);

  const activeSubs = subs.filter((s) => s.status === "active");

  const statusColor = (status: string) =>
    status === "paid" ? "default" : status === "pending" ? "secondary" : "destructive";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {user ? (
            t("Dashboard.greeting", { 
              name: user.name || user.email?.split("@")[0] || "Member" 
            })
          ) : (
            <Skeleton className="h-8 w-64" />
          )}
        </h1>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("Dashboard.activePackages")}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold">{activeSubs.length}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("Dashboard.thisMonthTrans")}</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-7 w-20" /> : (
                <p className="text-2xl font-bold">
                  Rp {transactions
                    .filter((tr) => tr.status === "paid")
                    .reduce((sum: number, tr: any) => sum + tr.amount, 0)
                    .toLocaleString("id-ID")}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("Dashboard.warrantyLeft")}</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-7 w-16" /> : (
                <p className="text-2xl font-bold">
                  {activeSubs.length > 0
                    ? `${Math.max(0, differenceInDays(new Date(activeSubs[0].warrantyEndsAt), new Date()))} hari`
                    : "-"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active Packages */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t("Dashboard.myPackages")}</CardTitle>
              <Link to="/dashboard/packages">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  {t("Dashboard.viewAll")} <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? <Skeleton className="h-20 w-full" /> :
                activeSubs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Belum ada paket aktif.{" "}
                    <Link to="/" className="text-primary hover:underline">Lihat layanan →</Link>
                  </div>
                ) : activeSubs.map((sub: any) => {
                  const daysLeft = Math.max(0, differenceInDays(new Date(sub.warrantyEndsAt), new Date()));
                  const daysTotal = sub.package?.warrantyDays ?? 30;
                  const pct = Math.round((daysLeft / daysTotal) * 100);
                  return (
                    <div key={sub.id} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          {sub.package?.service?.nameId} — {sub.package?.nameId}
                        </span>
                        <span className="text-muted-foreground">{daysLeft} hari</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t("Dashboard.recentTransactions")}</CardTitle>
              <Link to="/dashboard/transactions">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  {t("Dashboard.viewAll")} <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? <Skeleton className="h-32 w-full" /> :
                transactions.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Belum ada transaksi.</p>
                ) : transactions.map((tr: any) => (
                  <div key={tr.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="text-sm">
                      <p className="font-medium">{tr.package?.nameId ?? tr.packageId}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tr.createdAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Rp {tr.amount.toLocaleString("id-ID")}</p>
                      <Badge variant={statusColor(tr.status)} className="text-xs">{tr.status}</Badge>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
