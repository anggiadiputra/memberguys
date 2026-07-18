import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function TransactionsPage() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data?.user) return;
      api.get<any[]>(`/transactions?userId=${data.user.id}`)
        .then(setTransactions)
        .finally(() => setLoading(false));
    });
  }, []);

  const statusColor = (status: string): "default" | "secondary" | "destructive" =>
    status === "paid" ? "default" : status === "pending" ? "secondary" : "destructive";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("Navigation.transactions")}</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Semua Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">Belum ada transaksi.</p>
            ) : (
              <div className="divide-y">
                {transactions.map((tr: any) => (
                  <div key={tr.id} className="flex items-center justify-between py-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {tr.package?.service?.nameId} — {tr.package?.nameId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tr.id} · {new Date(tr.createdAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold">Rp {tr.amount.toLocaleString("id-ID")}</p>
                        <Badge variant={statusColor(tr.status)} className="text-xs">{tr.status}</Badge>
                      </div>
                      {tr.status === "pending" && tr.paymentUrl && (
                        <a href={tr.paymentUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="gap-1">
                            Bayar <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
