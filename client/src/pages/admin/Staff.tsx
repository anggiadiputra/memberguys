import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Plus, UserPlus } from "lucide-react";

import { usePageTitle } from "@/hooks/usePageTitle";
export default function StaffPage() {
  usePageTitle("Staff");
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = authClient.useSession();
  const userId = (session?.user as any)?.id;

  const loadData = async () => {
    if (!userId) return;
    try {
      const data = await api.get<any[]>("/admin/staff", { headers: { "X-Admin-Id": userId } });
      setStaff(data);
    } catch (e: any) {
      toast.error("Gagal memuat data staff: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [userId]);

  const roleColors: Record<string, "default" | "secondary" | "destructive"> = {
    admin: "default",
    finance: "secondary",
    support: "destructive",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Pengguna (Staff)</h1>
          {!loading && <p className="text-sm text-muted-foreground">{staff.length} staff</p>}
        </div>

        <Card className="shadow-sm overflow-hidden">
          {loading ? (
            <CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent>
          ) : staff.length === 0 ? (
            <CardContent className="py-16 text-center text-muted-foreground">
              <p>Belum ada staff.</p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Kontak</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Tgl Ditambahkan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={u.image} />
                            <AvatarFallback>{(u.name || u.email || "S")[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <p className="font-medium text-slate-800">{u.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-800">{u.email}</p>
                        {u.whatsapp && <p className="text-xs text-muted-foreground mt-0.5">{u.whatsapp}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={roleColors[u.role] || "secondary"} className="text-[11px] uppercase">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
