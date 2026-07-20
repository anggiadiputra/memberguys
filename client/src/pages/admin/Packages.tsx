import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Cloud, Pencil, Trash2, Database, SearchX } from "lucide-react";
import { useTable } from "@/hooks/useTable";
import { SearchInput, TablePagination } from "@/components/table/TableComponents";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function AdminPackagesPage() {
  usePageTitle("Paket & Layanan");
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string>("");

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data?.user) return;
      setAdminId(data.user.id);
      loadData(data.user.id);
    });
  }, []);

  const loadData = (id?: string) => {
    const aid = id || adminId;
    api.get<any[]>("/admin/services", { headers: { "X-Admin-Id": aid } })
      .then(setServices)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Flatten services + packages into rows
  const rows = services.flatMap((svc: any) =>
    (svc.packages || []).map((pkg: any) => ({ ...pkg, _service: svc }))
  );

  const table = useTable({
    data: rows,
    pageSize: 15,
    searchKeys: [
      (r: any) => r._service?.nameId || "",
      (r: any) => r._service?.slug || "",
      (r: any) => r.nameId || "",
      (r: any) => r.slug || "",
    ],
  });

  const confirmDelete = async (id: string, type: "service" | "package") => {
    if (!confirm(`Hapus ${type === "service" ? "layanan" : "paket"} ini?`)) return;
    try {
      await api.del(`/admin/${type}s/${id}`, { headers: { "X-Admin-Id": adminId } });
      toast.success(`${type === "service" ? "Layanan" : "Paket"} berhasil dihapus`);
      loadData();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Paket & Layanan</h1>
            <p className="text-sm text-muted-foreground mt-1">Kelola layanan dan paket yang tersedia.</p>
          </div>
          <Button className="gap-2" onClick={() => {
            window.location.href = "/admin/packages/edit";
          }}>
            <Plus className="h-4 w-4" /> Tambah Layanan
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2"><Skeleton className="h-10 w-full rounded-lg" /><Skeleton className="h-40 w-full rounded-lg" /></div>
        ) : services.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground flex flex-col items-center gap-4">
            <SearchX className="w-12 h-12 text-slate-300" />
            <p>Belum ada layanan.</p>
            <Button onClick={async () => {
              try { setLoading(true); const r = await api.get<any>("/seed"); toast.success(r.message); loadData(); }
              catch (e: any) { toast.error("Gagal: " + e.message); setLoading(false); }
            }} variant="outline" className="gap-2"><Database className="w-4 h-4" /> Masukkan Data Demo</Button>
          </CardContent></Card>
        ) : (
          <Card className="shadow-sm overflow-hidden">
            <div className="px-4 py-2 border-b bg-slate-50/50">
              <SearchInput value={table.search} onChange={table.setSearch} placeholder="Cari layanan, paket..." />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <th className="px-4 py-3">Layanan</th>
                    <th className="px-4 py-3">Paket</th>
                    <th className="px-4 py-3 text-right">Harga</th>
                    <th className="px-4 py-3 text-right">Garansi</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table.rows.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Tidak ada hasil.</td></tr>
                  ) : (
                    table.rows.map((pkg: any) => (
                      <tr key={pkg.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Cloud className="w-4 h-4 text-primary shrink-0" />
                            <div>
                              <p className="font-medium text-slate-800">{pkg._service?.nameId}</p>
                              <p className="text-xs text-muted-foreground font-mono">{pkg._service?.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{pkg.nameId}</p>
                          <p className="text-xs text-muted-foreground">{pkg.slug}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                          Rp {pkg.price.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
                          {pkg.warrantyDays} hari
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={pkg.isActive ? "default" : "secondary"} className="text-[10px] px-2">
                            {pkg.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                              onClick={() => alert("Edit " + pkg.nameId)} title="Edit Paket">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500"
                              onClick={() => confirmDelete(pkg.id, "package")} title="Hapus Paket">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={table.page} totalPages={table.totalPages}
              total={table.total} totalFiltered={table.totalFiltered}
              goTo={table.goTo} next={table.next} prev={table.prev}
            />
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
