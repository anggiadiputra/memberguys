import { useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, CreditCard, Package,
  Settings, LogOut, Globe, Menu, X,
  Users, UserCog, UserCheck, Globe2,
} from "lucide-react";
import i18n from "@/i18n";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session } = authClient.useSession();
  const user = session?.user as any;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const onLogout = async () => {
    await authClient.signOut();
    navigate("/login");
  };

  const userRole = user?.role;
  const navItems = [
    { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["admin"] },
    { href: "/admin/pelanggan", icon: Users, label: "Pelanggan", roles: ["admin", "support"] },
    { href: "/admin/transactions", icon: CreditCard, label: "Transaksi", roles: ["admin", "finance"] },
    { href: "/admin/packages", icon: Package, label: "Paket & Layanan", roles: ["admin", "support"] },
    { href: "/admin/landing", icon: Globe2, label: "Landing Page", roles: ["admin"] },
    { href: "/admin/settings", icon: Settings, label: "Settings", roles: ["admin"] },
    { href: "/admin/pengguna", icon: UserCog, label: "Pengguna (Staff)", roles: ["admin"] },
  ].filter((item) => !item.roles || item.roles.includes(userRole));

  const sidebar = (
    <>
      {/* Brand */}
      <div className="h-14 flex items-center px-4 border-b gap-2 shrink-0">
        <Link to="/admin" className="font-bold text-xl text-primary" onClick={closeSidebar}>
          MemberGuys
        </Link>
        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
          Admin
        </span>
      </div>
      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={closeSidebar}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              location.pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>
      {/* Footer */}
      <div className="p-3 border-t shrink-0 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => { onLogout(); closeSidebar(); }}
        >
          <LogOut className="h-4 w-4" />
          {t("Navigation.logout")}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — Desktop: sticky | Mobile: fixed overlay */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:flex-col md:border-r md:bg-white self-start">
        {sidebar}
      </aside>

      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r bg-white transition-transform duration-200 md:hidden`}
      >
        {sidebar}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b flex items-center px-4 shrink-0">
          {/* Hamburger — visible only on mobile */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden mr-2"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="font-semibold md:hidden">MemberGuys Admin</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => i18n.changeLanguage(i18n.language === "id" ? "en" : "id")}
            >
              <Globe className="h-4 w-4" />
              {i18n.language.toUpperCase()}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" />
                }
              >
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage src={user?.image} />
                  <AvatarFallback>{(user?.name || user?.email || "A")[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{user?.name || user?.email?.split("@")[0]}</p>
                  <p className="text-muted-foreground text-xs">{user?.email}</p>
                  <p className="text-xs text-primary font-medium mt-0.5">Admin</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> {t("Navigation.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
