import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data?.user) return;
      api.get<any[]>(`/admin/users`, { headers: { "X-Admin-Id": data.user.id } })
        .then(setUsers)
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Pengguna Terdaftar</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daftar Pengguna</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64 w-full" /> :
              users.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground">Belum ada pengguna.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Profil</th>
                        <th className="pb-2 font-medium">Kontak</th>
                        <th className="pb-2 font-medium">Role</th>
                        <th className="pb-2 font-medium">Tgl Daftar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.map((u: any) => (
                        <tr key={u.id}>
                          <td className="py-3 flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.image} />
                              <AvatarFallback>{(u.name || u.email || "U")[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{u.name || "Tanpa Nama"}</p>
                              <p className="text-xs font-mono text-muted-foreground">{u.id}</p>
                            </div>
                          </td>
                          <td className="py-3">
                            <p>{u.email}</p>
                            {u.emailVerified && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Terverifikasi</span>}
                          </td>
                          <td className="py-3">
                            <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                              {u.role}
                            </Badge>
                          </td>
                          <td className="py-3 text-xs text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}
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