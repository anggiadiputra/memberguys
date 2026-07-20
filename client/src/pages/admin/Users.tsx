import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTable } from "@/hooks/useTable";
import { SearchInput, TablePagination } from "@/components/table/TableComponents";

import { usePageTitle } from "@/hooks/usePageTitle";
export default function AdminUsersPage() {
  usePageTitle("Pengguna");
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data?.user) return;
      api.get<any[]>("/admin/users", { headers: { "X-Admin-Id": data.user.id } })
        .then(setUsers)
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, []);

  const table = useTable({
    data: users,
    pageSize: 15,
    searchKeys: ["name", "email", "role" as any],
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Pengguna Terdaftar</h1>
          {!loading && <p className="text-sm text-muted-foreground">{users.length} pengguna</p>}
        </div>

        <Card className="shadow-sm overflow-hidden">
          {loading ? (
            <CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent>
          ) : users.length === 0 ? (
            <CardContent className="py-16 text-center text-muted-foreground">
              <p>Belum ada pengguna.</p>
            </CardContent>
          ) : (
            <>
              <div className="px-4 py-2 border-b bg-slate-50/50">
                <SearchInput value={table.search} onChange={table.setSearch} placeholder="Cari nama, email, role..." />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <th className="px-4 py-3 cursor-pointer select-none" onClick={() => table.toggleSort("name")}>
                        Profil
                      </th>
                      <th className="px-4 py-3">Kontak</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Tgl Daftar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {table.rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                          Tidak ada hasil untuk <span className="font-mono text-slate-500">&quot;{table.search}&quot;</span>
                        </td>
                      </tr>
                    ) : (
                      table.rows.map((u: any) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/admin/users/${u.id}`)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={u.image} />
                                <AvatarFallback>{(u.name || u.email || "U")[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <p className="font-medium text-slate-800 truncate max-w-[200px]">{u.name || "Tanpa Nama"}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-800">{u.email}</p>
                            {u.whatsapp && <p className="text-xs text-muted-foreground mt-0.5">{u.whatsapp}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-[11px]">
                              {u.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(u.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={table.page}
                totalPages={table.totalPages}
                total={table.total}
                totalFiltered={table.totalFiltered}
                goTo={table.goTo}
                next={table.next}
                prev={table.prev}
              />
            </>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
