import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Mail, Phone, Package, Clock, ShieldCheck, ExternalLink, Calendar, Receipt } from "lucide-react";

export default function ProfilePage() {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = authClient.useSession()?.data?.user;

  useEffect(() => {
    if (!user?.id) return;
    api.get<any>(`/users/me?userId=${user.id}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const userInfo = data?.user;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <p className="text-center py-20 text-muted-foreground">Silakan login untuk melihat profil.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Profil Saya</h1>

        {/* Info Profil */}
        <Card className="shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-primary/5 to-transparent px-6 py-5 border-b">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">{userInfo?.name || "Pelanggan"}</h2>
                <p className="text-sm text-muted-foreground">{userInfo?.email}</p>
              </div>
            </div>
          </div>
          <CardContent className="px-6 py-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{userInfo?.email}</span>
            </div>
            {userInfo?.whatsapp && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{userInfo.whatsapp}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Terdaftar sejak {new Date(userInfo?.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
          </CardContent>
        </Card>

        {/* Paket Aktif */}
        <div>
          <h2 className="text-lg font-bold tracking-tight mb-3">Paket Aktif</h2>
          {data?.subscriptions?.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-10 text-center text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Belum ada paket aktif.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {data?.subscriptions?.map((sub: any) => {
                const daysLeft = Math.max(0, Math.ceil((new Date(sub.warrantyEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                return (
                  <Card key={sub.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <ShieldCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">
                              {sub.package?.service?.nameId} — {sub.package?.nameId}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Garansi: {daysLeft} hari lagi
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Berakhir: {new Date(sub.warrantyEndsAt).toLocaleDateString("id-ID")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-[10px] shrink-0">
                          {sub.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Riwayat Transaksi */}
        <div>
          <h2 className="text-lg font-bold tracking-tight mb-3">Riwayat Transaksi</h2>
          {data?.transactions?.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-10 text-center text-muted-foreground">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Belum ada transaksi.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {data?.transactions?.slice(0, 10).map((tr: any) => (
                <Card key={tr.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 truncate">
                          {tr.package?.service?.nameId} — {tr.package?.nameId}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{tr.id}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(tr.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-slate-800">Rp {tr.amount.toLocaleString("id-ID")}</p>
                        <Badge variant={tr.status === "paid" ? "default" : tr.status === "pending" ? "secondary" : "destructive"} className="mt-1 text-[10px]">
                          {tr.status === "paid" ? "Lunas" : tr.status === "pending" ? "Pending" : "Gagal"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
