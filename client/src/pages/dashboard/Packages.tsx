import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays } from "date-fns";
import { ShieldCheck } from "lucide-react";

import { usePageTitle } from "@/hooks/usePageTitle";
export default function PackagesPage() {
  usePageTitle("Paket Saya");
  const { t } = useTranslation();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data?.user) return;
      api.get<any[]>(`/subscriptions?userId=${data.user.id}`)
        .then(setSubs)
        .finally(() => setLoading(false));
    });
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("Navigation.packages")}</h1>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40" /><Skeleton className="h-40" />
          </div>
        ) : subs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Belum ada paket aktif. Silahkan order layanan terlebih dahulu.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {subs.map((sub: any) => {
              const daysLeft = Math.max(0, differenceInDays(new Date(sub.warrantyEndsAt), new Date()));
              const daysTotal = sub.package?.warrantyDays ?? 30;
              const pct = Math.round((daysLeft / daysTotal) * 100);
              return (
                <Card key={sub.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {sub.package?.service?.nameId}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-0.5">{sub.package?.nameId}</p>
                      </div>
                      <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                        {sub.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      {t("Services.warrantyDays", { days: daysLeft })}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Garansi</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Berakhir: {new Date(sub.warrantyEndsAt).toLocaleDateString("id-ID")}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
