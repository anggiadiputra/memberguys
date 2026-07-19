import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { authClient } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  // Dengan BetterAuthReactAdapter, authClient sekarang memiliki hooks React
  // yang reaktif terhadap perubahan state auth antar komponen.
  const { data: session, isPending, refetch } = authClient.useSession();

  // Cross-tab sync: re-check session saat tab mendapat fokus.
  // Tanpa ini, user login di tab A → tab B tetap lihat halaman login
  // karena session hook hanya fetch sekali saat komponen mount.
  useEffect(() => {
    const onFocus = () => refetch?.();
    // visibilitychange menangkap kasus tab/iOS Safari switch
    const onVisible = () => { if (document.visibilityState === "visible") refetch?.(); };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refetch]);

  if (isPending) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (adminOnly && (session.user as any)?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
