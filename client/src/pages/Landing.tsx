import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ShieldAlert, Server, ArrowRightLeft, PenTool } from "lucide-react";

const SERVICES = [
  {
    key: "vps",
    icon: Server,
    packages: ["Starter", "Business", "Enterprise"],
    price: "Mulai Rp 250.000",
  },
  {
    key: "malware",
    icon: ShieldAlert,
    packages: ["Scan", "Shield", "Fortress"],
    price: "Mulai Rp 150.000",
  },
  {
    key: "migration",
    icon: ArrowRightLeft,
    packages: ["Basic", "Pro", "Bulk"],
    price: "Mulai Rp 300.000",
  },
  {
    key: "maintenance",
    icon: PenTool,
    packages: ["Light", "Standard", "Premium"],
    price: "Mulai Rp 500.000/bln",
  },
];

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="py-20 md:py-32 bg-slate-50 text-center flex-1">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            {t("Index.title")}
          </h1>
          <p className="text-xl text-muted-foreground">{t("Index.description")}</p>
          <div className="flex justify-center gap-4">
            <Link to="/register"><Button size="lg">{t("Index.register")}</Button></Link>
            <Link to="/login"><Button size="lg" variant="outline">{t("Index.login")}</Button></Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((svc) => (
              <Card key={svc.key} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader>
                  <svc.icon className="w-10 h-10 text-primary mb-3" />
                  <CardTitle className="text-lg">{t(`Services.${svc.key}`)}</CardTitle>
                  <CardDescription>{svc.price}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  {svc.packages.map((pkg) => (
                    <div key={pkg} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      {pkg}
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Link to="/register" className="w-full">
                    <Button className="w-full">{t("Services.order")}</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
