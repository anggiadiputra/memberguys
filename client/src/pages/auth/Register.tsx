import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

import { usePageTitle } from "@/hooks/usePageTitle";
export default function RegisterPage() {
  usePageTitle("Daftar");
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Jika user sudah login (misal dari tab lain), redirect ke dashboard
  const { data: session } = authClient.useSession();
  useEffect(() => {
    if (session?.user) {
      navigate("/admin", { replace: true });
    }
  }, [session, navigate]);

  // Fungsi untuk melanjutkan pesanan tertunda (jika ada) setelah register/login
  const processPendingOrder = async (userId: string) => {
    const pendingPkg = sessionStorage.getItem("pending_order_pkg");
    if (pendingPkg) {
      try {
        toast.info("Memproses pesanan Anda...");
        const res = await api.post<any>("/transactions", { 
          userId: userId, 
          packageId: pendingPkg 
        });
        
        // Bersihkan session storage
        sessionStorage.removeItem("pending_order_pkg");
        sessionStorage.removeItem("pending_order_url");

        if (res.paymentUrl) {
          window.location.href = res.paymentUrl;
          return true; // Berhasil redirect
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal melanjutkan pesanan");
      }
    }
    return false;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await authClient.signUp.email({ name, email, password });
      if (error) { toast.error(error.message ?? "Gagal mendaftar"); return; }
      toast.success("Akun berhasil dibuat!");
      
      // Ambil session untuk mendapatkan user ID
      const session = await authClient.getSession();
      
      // Cek apakah ada pesanan yang tertunda, jika ada dan berhasil diproses, hentikan fungsi ini
      if (session?.data?.user?.id) {
        const redirected = await processPendingOrder(session.data.user.id);
        if (redirected) return;
      }
      
      navigate("/admin");
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("Auth.registerTitle")}</CardTitle>
          <CardDescription>Buat akun baru untuk mulai berlangganan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input id="name" placeholder="John Doe"
                value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("Auth.email")}</Label>
              <Input id="email" type="email" placeholder="nama@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("Auth.password")}</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"}
                  value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} className="pr-10" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Loading..." : t("Auth.submitRegister")}
            </Button>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">{t("Auth.continueWith")}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full" disabled={loading}
            onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })}>
            Google
          </Button>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          {t("Auth.hasAccount")}{" "}
          <Link to="/login" className="ml-1 text-primary hover:underline">{t("Auth.loginTitle")}</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
