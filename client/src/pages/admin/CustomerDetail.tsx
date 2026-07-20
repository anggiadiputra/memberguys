import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Mail, Phone, Package, ShieldCheck, Clock, Calendar, Receipt, ExternalLink, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { usePageTitle } from "@/hooks/usePageTitle";
export default function CustomerDetailPage() {
  usePageTitle("Detail Pelanggan");
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = authClient.useSession()?.data?.user;
  const adminId = (user as any)?.id;

  useEffect(() => {
    if (!id || !adminId) return;
    api.get<any>(`/admin/users/${id}`, { headers: { "X-Admin-Id": adminId } })
      .then(setData)
      .catch((e: any) => toast.error("Gagal memuat detail: " + e.message))
      .finally(() => setLoading(false));
  }, [id, adminId]);

  const u = data?.user;

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full rounded-xl" /><Skeleton className="h-60 w-full rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/users" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Detail Pelanggan</h1>
        </div>

        {/* Info Pelanggan */}
        <Card className="shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-primary/5 to-transparent px-6 py-5 border-b">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">{u?.name || "Tanpa Nama"}</h2>
                <p className="text-xs font-mono text-muted-foreground">{u?.id}</p>
              </div>
            </div>
          </div>
          <CardContent className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-muted-foreground shrink-0" /><span>{u?.email || "-"}</span></div>
            <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-muted-foreground shrink-0" /><span>{u?.whatsapp || "-"}</span></div>
            <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-muted-foreground shrink-0" /><span>Terdaftar {new Date(u?.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</span></div>
            <div className="flex items-center gap-3"><ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" /><Badge variant={u?.role === "admin" ? "default" : "secondary"} className="text-[10px]">{u?.role}</Badge></div>
          </CardContent>
        </Card>

        {/* Subscription Aktif */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Subscription / Garansi Aktif</CardTitle></CardHeader>
          <CardContent>
            {data?.subscriptions?.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">Belum ada subscription.</p>
            ) : (
              <div className="space-y-2">
                {data?.subscriptions?.map((sub: any) => {
                  const daysLeft = Math.max(0, Math.ceil((new Date(sub.warrantyEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                  return (
                    <div key={sub.id} className="flex items-start justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-slate-800">{sub.package?.service?.nameId} — {sub.package?.nameId}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {daysLeft} hari</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(sub.warrantyEndsAt).toLocaleDateString("id-ID")}</span>
                          <span className="font-mono">ID: {sub.id?.slice(0, 8)}...</span>
                        </div>
                      </div>
                      <Badge variant="default" className="text-[10px]">{sub.status}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Riwayat Transaksi */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Riwayat Transaksi ({data?.transactions?.length || 0})</CardTitle></CardHeader>
          <CardContent>
            {data?.transactions?.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">Belum ada transaksi.</p>
            ) : (
              <div className="space-y-2">
                {data?.transactions?.map((tr: any) => (
                  <div key={tr.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 truncate">{tr.package?.service?.nameId} — {tr.package?.nameId}</p>
                      <p className="text-xs text-muted-foreground font-mono">{tr.id}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tr.createdAt).toLocaleString("id-ID")}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-semibold">Rp {tr.amount.toLocaleString("id-ID")}</p>
                      <Badge variant={tr.status === "paid" ? "default" : tr.status === "pending" ? "secondary" : "destructive"} className="mt-1 text-[10px]">{tr.status}</Badge>
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
