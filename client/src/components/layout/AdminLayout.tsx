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
  LayoutDashboard, Users, CreditCard, Package,
  Settings, LogOut, Globe, LayoutGrid,
} from "lucide-react";
import { useEffect, useState } from "react";
import i18n from "@/i18n";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    authClient.getSession().then(({ data }) => setUser(data?.user));
  }, []);

  const onLogout = async () => {
    await authClient.signOut();
    navigate("/login");
  };

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Overview" },
    { href: "/admin/transactions", icon: CreditCard, label: "Transaksi" },
    { href: "/admin/users", icon: Users, label: "Pengguna" },
    { href: "/admin/packages", icon: Package, label: "Paket & Layanan" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar — sama style dengan DashboardLayout */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-white">
        <div className="h-14 flex items-center px-4 border-b gap-2">
          <Link to="/admin" className="font-bold text-xl text-primary">
            MemberGuys
          </Link>
          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
            Admin
          </span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                location.pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t space-y-1">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-slate-100 transition-colors"
          >
            <LayoutGrid className="h-4 w-4" />
            Member Area
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            {t("Navigation.logout")}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b flex items-center px-4 justify-between">
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
              <DropdownMenuTrigger>
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
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
