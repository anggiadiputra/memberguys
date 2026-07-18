import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string>("");

  const loadData = async (id: string) => {
    try {
      const tr = await api.get<any[]>(`/admin/transactions`, { headers: { "X-Admin-Id": id } });
      setTransactions(tr);
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
          <CardHeader>
            <CardTitle className="text-base">Daftar Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64 w-full" /> :
              transactions.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground">Belum ada transaksi.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Tanggal</th>
                        <th className="pb-2 font-medium">ID Pesanan</th>
                        <th className="pb-2 font-medium">Pelanggan</th>
                        <th className="pb-2 font-medium">Layanan</th>
                        <th className="pb-2 font-medium">Nominal</th>
                        <th className="pb-2 font-medium">Metode</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions.map((tr: any) => (
                        <tr key={tr.id}>
                          <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(tr.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="py-3 font-mono text-xs">{tr.id}</td>
                          <td className="py-3">
                            <p className="font-medium">{tr.user?.name || "No Name"}</p>
                            <p className="text-xs text-muted-foreground">{tr.user?.email}</p>
                          </td>
                          <td className="py-3">
                            <p className="font-medium">{tr.package?.service?.nameId}</p>
                            <p className="text-xs text-muted-foreground">{tr.package?.nameId}</p>
                          </td>
                          <td className="py-3 font-medium whitespace-nowrap">Rp {tr.amount.toLocaleString("id-ID")}</td>
                          <td className="py-3 uppercase text-xs">{tr.paymentMethod}</td>
                          <td className="py-3">
                            <Badge variant={tr.status === "paid" ? "default" : tr.status === "pending" ? "secondary" : "destructive"}>
                              {tr.status}
                            </Badge>
                          </td>
                          <td className="py-3">
                            {tr.status === "pending" && (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="h-8 gap-1"
                                  onClick={() => confirmPayment(tr.id)}>
                                  <Check className="h-3 w-3" /> Konfirmasi
                                </Button>
                                {tr.paymentUrl && (
                                  <a href={tr.paymentUrl} target="_blank" rel="noopener noreferrer" title="Cek Link Pembayaran">
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                      <ExternalLink className="h-4 w-4" />
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
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}