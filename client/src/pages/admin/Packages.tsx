import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminPackagesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Services adalah public endpoint (tidak butuh header admin untuk GET)
    api.get<any[]>(`/services`)
      .then(setServices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Paket & Layanan</h1>
          <Button className="gap-2" disabled>
            <Plus className="h-4 w-4" /> Tambah Layanan
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" />
          </div>
        ) : services.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Belum ada layanan yang ditambahkan ke database. <br />
              (Saat ini Anda harus menambahkan layanan secara manual melalui Drizzle Studio)
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {services.map((svc: any) => (
              <Card key={svc.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{svc.nameId}</CardTitle>
                      <CardDescription>{svc.slug}</CardDescription>
                    </div>
                    <Badge variant={svc.isActive ? "default" : "secondary"}>
                      {svc.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium mb-3">Paket Tersedia ({svc.packages?.length || 0}):</p>
                  <div className="space-y-3">
                    {svc.packages?.map((pkg: any) => (
                      <div key={pkg.id} className="p-3 bg-slate-50 rounded-lg border text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold">{pkg.nameId}</span>
                          <span className="text-primary font-medium">Rp {pkg.price.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Garansi: {pkg.warrantyDays} Hari
                        </div>
                        <ul className="space-y-1">
                          {pkg.featuresId?.map((feat: string, i: number) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                              <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                              {feat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4 gap-2 text-xs h-8" disabled>
                    <Plus className="h-3 w-3" /> Tambah Paket
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}