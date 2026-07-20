import "@/i18n";
import { useEffect } from "react";
import { authClient } from "@/lib/auth";
import { Suspense, lazy } from "react";

function SessionSync() {
  const { refetch } = authClient.useSession();

  useEffect(() => {
    if (!refetch) return;

    const sync = () => {
      refetch();
      let v = 0;
      try { v = Number(localStorage.getItem("__ss")) || 0; } catch {}
      localStorage.setItem("__ss", String(v + 1));
    };

    const onFocus = () => sync();
    const onVisible = () => { if (document.visibilityState === "visible") sync(); };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "__ss") sync();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [refetch]);

  return null;
}
import { TrackingScripts } from "@/components/TrackingScripts";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Loader2 } from "lucide-react";

// Lazy loading komponen per-halaman untuk mempercepat Loading Awal (Code Splitting)
const LandingPage = lazy(() => import("@/pages/Landing"));
const LoginPage = lazy(() => import("@/pages/auth/Login"));
const RegisterPage = lazy(() => import("@/pages/auth/Register"));

// Halaman Sales Khusus Layanan
const MalwareLandingPage = lazy(() => import("@/pages/services/Malware"));
const PackageLandingPage = lazy(() => import("@/pages/services/PackageLanding"));

const PaymentSuccessPage = lazy(() => import("@/pages/payment/Success"));
const PaymentCancelPage = lazy(() => import("@/pages/payment/Cancel"));

const AdminSettingsPage = lazy(() => import("@/pages/admin/Settings"));
const AdminTransactionsPage = lazy(() => import("@/pages/admin/Transactions"));
const AdminPackagesPage = lazy(() => import("@/pages/admin/Packages"));
const PelangganPage = lazy(() => import("@/pages/admin/Pelanggan"));
const StaffPage = lazy(() => import("@/pages/admin/Staff"));
const CustomerDetailPage = lazy(() => import("@/pages/admin/CustomerDetail"));
const DashboardPage = lazy(() => import("@/pages/admin/Dashboard"));
const LandingManagePage = lazy(() => import("@/pages/admin/LandingManage"));

// Komponen fallback selama file JS halaman sedang diunduh
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Loader2 className="w-6 h-6 text-primary animate-spin" />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <SessionSync />
      <TrackingScripts />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes with Layout */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Sales Pages */}
            <Route path="/layanan/hapus-malware" element={<MalwareLandingPage />} />
            <Route path="/layanan/:serviceSlug/:packageSlug" element={<PackageLandingPage />} />
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/payment/cancel" element={<PaymentCancelPage />} />
          </Route>

          {/* Protected – admin only */}
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
            <Route path="/admin/users" element={<PelangganPage />} />
            <Route path="/admin/users/:id" element={<CustomerDetailPage />} />
            <Route path="/admin/pelanggan" element={<PelangganPage />} />
            <Route path="/admin/pelanggan/:id" element={<CustomerDetailPage />} />
            <Route path="/admin/packages" element={<AdminPackagesPage />} />
            <Route path="/admin/pengguna" element={<StaffPage />} />
            <Route path="/admin/landing" element={<LandingManagePage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
