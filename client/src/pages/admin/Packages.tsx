import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  Database,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  MoreVertical,
  PackagePlus,
  DatabaseBackup,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ServiceFormDialog } from "@/components/admin/ServiceFormDialog";
import { PackageFormDialog } from "@/components/admin/PackageFormDialog";

export default function AdminPackagesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string>("");

  // Dialog state
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);

  const [pkgDialogOpen, setPkgDialogOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<any | null>(null);
  const [pkgServiceId, setPkgServiceId] = useState<string>("");

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data?.user) return;
      setAdminId(data.user.id);
      loadData(data.user.id);
    });
  }, []);

  const loadData = (id?: string) => {
    const aid = id || adminId;
    api
      .get<any[]>("/admin/services", { headers: { "X-Admin-Id": aid } })
      .then(setServices)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // ─── Service CRUD ────────────────────────────────────────

  const openCreateService = () => {
    setEditingService(null);
    setServiceDialogOpen(true);
  };

  const openEditService = (svc: any) => {
    setEditingService(svc);
    setServiceDialogOpen(true);
  };

  const deleteService = async (id: string) => {
    try {
      await api.del(`/admin/services/${id}`, { headers: { "X-Admin-Id": adminId } });
      toast.success("Layanan berhasil dihapus");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus layanan");
    }
  };

  // ─── Package CRUD ────────────────────────────────────────

  const openCreatePkg = (serviceId: string) => {
    setEditingPkg(null);
    setPkgServiceId(serviceId);
    setPkgDialogOpen(true);
  };

  const openEditPkg = (pkg: any, serviceId: string) => {
    setEditingPkg(pkg);
    setPkgServiceId(serviceId);
    setPkgDialogOpen(true);
  };

  const deletePkg = async (id: string) => {
    try {
      await api.del(`/admin/packages/${id}`, { headers: { "X-Admin-Id": adminId } });
      toast.success("Paket berhasil dihapus");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus paket");
    }
  };

  // ─── Seed ───────────────────────────────────────────────

  const handleSeed = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>("/seed");
      toast.success(res.message);
      loadData();
    } catch (e: any) {
      toast.error("Gagal seed: " + e.message);
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Paket & Layanan</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola layanan dan paket yang tersedia untuk customer.
            </p>
          </div>
          <Button className="gap-2" onClick={openCreateService}>
            <Plus className="h-4 w-4" /> Tambah Layanan
          </Button>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : services.length === 0 ? (
          /* Empty state */
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground flex flex-col items-center gap-4">
              <DatabaseBackup className="w-12 h-12 text-slate-300" />
              <p>Belum ada layanan yang ditambahkan.</p>
              <Button onClick={handleSeed} variant="outline" className="gap-2">
                <Database className="w-4 h-4" /> Masukkan Data Demo
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Service cards */
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {services.map((svc: any) => (
              <Card key={svc.id} className={!svc.isActive ? "opacity-70" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{svc.nameId}</CardTitle>
                      <CardDescription className="truncate">{svc.slug}</CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <Badge variant={svc.isActive ? "default" : "secondary"}>
                        {svc.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                      {/* Service action dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" className="h-7 w-7" />
                          }
                        >
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditService(svc)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit Layanan
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Hapus Layanan
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Layanan</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Semua paket dalam layanan <strong>&ldquo;{svc.nameId}&rdquo;</strong> juga akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => deleteService(svc.id)}
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Package count */}
                  <p className="text-sm font-medium mb-3">
                    Paket ({svc.packages?.length || 0})
                  </p>

                  {/* Package list */}
                  <div className="space-y-3">
                    {svc.packages?.map((pkg: any) => (
                      <div
                        key={pkg.id}
                        className={`p-3 rounded-lg border text-sm ${
                          pkg.isActive
                            ? "bg-slate-50 border-slate-200"
                            : "bg-slate-100/60 border-slate-200 opacity-60"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold">{pkg.nameId}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-primary font-medium">
                              Rp {pkg.price.toLocaleString("id-ID")}
                            </span>
                            {/* Package action dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button variant="ghost" size="icon-sm" className="h-6 w-6" />
                                }
                              >
                                <MoreVertical className="h-3 w-3" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditPkg(pkg, svc.id)}
                                >
                                  <Pencil className="h-4 w-4 mr-2" /> Edit Paket
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" /> Hapus Paket
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Hapus Paket</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Paket <strong>&ldquo;{pkg.nameId}&rdquo;</strong> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-600 hover:bg-red-700"
                                        onClick={() => deletePkg(pkg.id)}
                                      >
                                        Hapus
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Garansi: {pkg.warrantyDays} Hari
                        </div>

                        {/* Features ✓ / ✗ */}
                        <ul className="space-y-1">
                          {pkg.featuresId?.map((feat: string, i: number) => (
                            <li
                              key={`in-${i}`}
                              className="flex items-start gap-1.5 text-xs text-slate-600"
                            >
                              <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                          {pkg.excludedFeaturesId?.map((feat: string, i: number) => (
                            <li
                              key={`ex-${i}`}
                              className="flex items-start gap-1.5 text-xs text-slate-400"
                            >
                              <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Add package button */}
                  <Button
                    variant="outline"
                    className="w-full mt-4 gap-2 text-xs h-8"
                    onClick={() => openCreatePkg(svc.id)}
                  >
                    <PackagePlus className="h-3 w-3" /> Tambah Paket
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog: Create/Edit Service */}
      <ServiceFormDialog
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
        service={editingService}
        adminId={adminId}
        onSaved={() => loadData()}
      />

      {/* Dialog: Create/Edit Package */}
      <PackageFormDialog
        open={pkgDialogOpen}
        onOpenChange={setPkgDialogOpen}
        pkg={editingPkg}
        serviceId={pkgServiceId}
        adminId={adminId}
        onSaved={() => loadData()}
      />
    </AdminLayout>
  );
}
