import { Outlet, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import i18n from "@/i18n";

export function PublicLayout() {
  const { t } = useTranslation();
  const location = useLocation();

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar Public */}
      <header className="px-4 lg:px-6 h-14 flex items-center border-b bg-white sticky top-0 z-10">
        <Link to="/">
          <span className="font-bold text-xl text-primary">MemberGuys</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 hidden sm:flex"
            onClick={() => i18n.changeLanguage(i18n.language === "id" ? "en" : "id")}
          >
            <Globe className="h-4 w-4" />
            {i18n.language.toUpperCase()}
          </Button>

          {/* Sembunyikan tombol auth jika user sudah berada di halaman login/register */}
          {!isAuthPage && (
            <>
              <Link to="/login">
                <Button variant="ghost">{t("Index.login")}</Button>
              </Link>
              <Link to="/register">
                <Button>{t("Index.register")}</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Footer Public */}
      {!isAuthPage && (
        <footer className="border-t py-6 bg-white text-center text-sm text-muted-foreground shrink-0">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 MemberGuys. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <button onClick={() => i18n.changeLanguage("en")} className="hover:underline">English</button>
              <button onClick={() => i18n.changeLanguage("id")} className="hover:underline">Indonesia</button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
