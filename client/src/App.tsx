import "@/i18n";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PublicLayout } from "@/components/layout/PublicLayout";
import LandingPage from "@/pages/Landing";
import LoginPage from "@/pages/auth/Login";
import RegisterPage from "@/pages/auth/Register";
import DashboardPage from "@/pages/dashboard/Dashboard";
import PackagesPage from "@/pages/dashboard/Packages";
import TransactionsPage from "@/pages/dashboard/Transactions";
import PaymentSuccessPage from "@/pages/payment/Success";
import PaymentCancelPage from "@/pages/payment/Cancel";
import AdminPage from "@/pages/admin/Admin";
import AdminSettingsPage from "@/pages/admin/Settings";
import AdminTransactionsPage from "@/pages/admin/Transactions";
import AdminUsersPage from "@/pages/admin/Users";
import AdminPackagesPage from "@/pages/admin/Packages";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        {/* Public Routes with Layout */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected – member */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/packages" element={<PackagesPage />} />
          <Route path="/dashboard/transactions" element={<TransactionsPage />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/cancel" element={<PaymentCancelPage />} />
        </Route>

        {/* Protected – admin only */}
        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/packages" element={<AdminPackagesPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
