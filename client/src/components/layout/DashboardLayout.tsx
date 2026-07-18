import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, CreditCard, User, LogOut, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import i18n from "@/i18n";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
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
    { href: "/dashboard", icon: LayoutDashboard, label: t("Navigation.home") },
    { href: "/dashboard/packages", icon: Package, label: t("Navigation.packages") },
    { href: "/dashboard/transactions", icon: CreditCard, label: t("Navigation.transactions") },
    { href: "/dashboard/profile", icon: User, label: t("Navigation.profile") },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-white">
        <div className="h-14 flex items-center px-4 border-b">
          <Link to="/dashboard" className="font-bold text-xl text-primary">
            MemberGuys
          </Link>
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
        <div className="p-3 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            {t("Navigation.logout")}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b flex items-center px-4 justify-between">
          <span className="font-semibold md:hidden">MemberGuys</span>
          <div className="ml-auto flex items-center gap-2">
            {/* Language switcher */}
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
                  <AvatarFallback>{(user?.name || user?.email || "U")[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{user?.name || user?.email?.split("@")[0]}</p>
                  <p className="text-muted-foreground text-xs">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
                  {t("Navigation.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout} className="text-destructive">
                  {t("Navigation.logout")}
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
