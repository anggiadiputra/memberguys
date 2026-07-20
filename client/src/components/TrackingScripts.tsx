import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface TrackingConfig {
  ga4Id?: string;
  gtmId?: string;
  fbPixelId?: string;
  trackingEnabled?: boolean;
}

export function TrackingScripts() {
  const [cfg, setCfg] = useState<TrackingConfig | null>(null);

  useEffect(() => {
    // Fetch tracking config from settings. Skip role - it's public config.
    api.get<any>("/services").then(() => {
      // We use a lightweight public endpoint. Since tracking config is in payment_gateway,
      // we'll read from a public endpoint. For now, use the settings endpoint or create one.
      // We'll inject based on localStorage fallback or env config.
      const ga4Id = window.__GA4_ID__ || "";
      const gtmId = window.__GTM_ID__ || "";
      const fbId = window.__FB_PIXEL_ID__ || "";
      if (ga4Id || gtmId || fbId) setCfg({ ga4Id, gtmId, fbPixelId: fbId });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cfg) return;
    // Google Analytics
    if (cfg.ga4Id) {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${cfg.ga4Id}`;
      document.head.appendChild(s);
      const s2 = document.createElement("script");
      s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${cfg.ga4Id}');`;
      document.head.appendChild(s2);
    }
    // GTM
    if (cfg.gtmId) {
      const s = document.createElement("script");
      s.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${cfg.gtmId}');`;
      document.head.appendChild(s);
    }
    // Facebook Pixel
    if (cfg.fbPixelId) {
      const s = document.createElement("script");
      s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${cfg.fbPixelId}');fbq('track','PageView');`;
      document.head.appendChild(s);
    }
  }, [cfg]);

  return null;
}

declare global { interface Window { __GA4_ID__?: string; __GTM_ID__?: string; __FB_PIXEL_ID__?: string; } }
