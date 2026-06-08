import { useEffect } from "react";
import { usePixelSettings } from "@/hooks/useSiteSettings";
import { _setCachedPixelSettings, _setCachedUserData } from "@/lib/pixels";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

const SCRIPT_IDS = {
  meta: "lov-pixel-meta",
  metaNoscript: "lov-pixel-meta-noscript",
  gtm: "lov-pixel-gtm",
  gtmNoscript: "lov-pixel-gtm-noscript",
  gtag: "lov-pixel-gtag",
  gtagInit: "lov-pixel-gtag-init",
  tiktok: "lov-pixel-tiktok",
  kwai: "lov-pixel-kwai",
};

function removeById(id: string) {
  document.getElementById(id)?.remove();
}

function injectScript(id: string, content: string, async = true) {
  removeById(id);
  const s = document.createElement("script");
  s.id = id;
  s.async = async;
  s.text = content;
  document.head.appendChild(s);
}

function injectExternalScript(id: string, src: string) {
  removeById(id);
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function injectGtmNoscript(id: string, containerId: string) {
  removeById(id);
  const noscript = document.createElement("noscript");
  noscript.id = id;
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${containerId}`;
  iframe.height = "0";
  iframe.width = "0";
  iframe.style.display = "none";
  iframe.style.visibility = "hidden";
  noscript.appendChild(iframe);
  document.body.prepend(noscript);
}

/**
 * Captures ?fbclid= from the URL and persists the Meta-compatible
 * `_fbc` cookie (`fb.1.{ts}.{fbclid}`) for 90 days, so that CAPI and
 * Pixel can match clicks even with adblockers.
 */
function captureFbclid() {
  try {
    const url = new URL(window.location.href);
    const fbclid = url.searchParams.get("fbclid");
    if (!fbclid) return;
    const existing = document.cookie.split(";").some((c) => c.trim().startsWith("_fbc="));
    if (existing) return;
    const value = `fb.1.${Date.now()}.${fbclid}`;
    const maxAge = 60 * 60 * 24 * 90; // 90 days
    document.cookie = `_fbc=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

interface AdvancedMatching {
  em?: string;
  ph?: string;
  external_id?: string;
  fn?: string;
  ln?: string;
}

async function fetchAdvancedMatching(): Promise<AdvancedMatching> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};
    const am: AdvancedMatching = {};
    if (user.id) am.external_id = user.id;
    if (user.email) am.em = user.email.trim().toLowerCase();

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, whatsapp")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.whatsapp) am.ph = profile.whatsapp.replace(/\D/g, "");
    if (profile?.name) {
      const parts = String(profile.name).trim().split(/\s+/);
      if (parts[0]) am.fn = parts[0].toLowerCase();
      if (parts.length > 1) am.ln = parts.slice(1).join(" ").toLowerCase();
    }
    return am;
  } catch {
    return {};
  }
}

export function PixelInjector() {
  const { data: s } = usePixelSettings();
  const { consent } = useCookieConsent();
  _setCachedPixelSettings(s);

  const marketingOk = consent.status === "pending" || consent.marketing;
  const analyticsOk = consent.status === "pending" || consent.analytics;

  // Capture fbclid on mount, before any pixel loads
  useEffect(() => {
    captureFbclid();
  }, []);

  // Meta Pixel + Advanced Matching
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const am = await fetchAdvancedMatching();
      if (cancelled) return;
      // Cache identity for ALL pixel events (Meta, TikTok, Kwai, CAPI mirror)
      _setCachedUserData({
        external_id: am.external_id,
        email: am.em,
        phone: am.ph,
        first_name: am.fn,
        last_name: am.ln,
      });

      if (s?.meta_enabled && s.meta_pixel_id && marketingOk) {
        const amJson = JSON.stringify(am);
        injectScript(
          SCRIPT_IDS.meta,
          `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${s.meta_pixel_id}', ${amJson});`,
          false
        );
      } else if (!s?.meta_enabled) {
        removeById(SCRIPT_IDS.meta);
        removeById(SCRIPT_IDS.metaNoscript);
        delete (window as any).fbq;
        delete (window as any)._fbq;
      }
    }
    init();

    // Re-init when the auth session changes (login/logout) so Advanced
    // Matching reflects the current user.
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      init();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [s?.meta_enabled, s?.meta_pixel_id, s?.meta_events, marketingOk]);

  // GTM
  useEffect(() => {
    if (s?.gtm_enabled && s.gtm_container_id && (analyticsOk || marketingOk)) {
      injectScript(
        SCRIPT_IDS.gtm,
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${s.gtm_container_id}');`,
        false
      );
      injectGtmNoscript(SCRIPT_IDS.gtmNoscript, s.gtm_container_id);
    } else {
      removeById(SCRIPT_IDS.gtm);
      removeById(SCRIPT_IDS.gtmNoscript);
    }
  }, [s?.gtm_enabled, s?.gtm_container_id, analyticsOk, marketingOk]);

  // GA4 + Google Ads
  useEffect(() => {
    const ga4 = s?.ga4_enabled && s?.ga4_measurement_id && analyticsOk ? s.ga4_measurement_id : null;
    const ads =
      s?.google_ads_enabled && s?.google_ads_conversion_id && marketingOk ? s.google_ads_conversion_id : null;

    if (!ga4 && !ads) {
      removeById(SCRIPT_IDS.gtag);
      removeById(SCRIPT_IDS.gtagInit);
      return;
    }

    const primaryId = ga4 || ads!;
    injectExternalScript(SCRIPT_IDS.gtag, `https://www.googletagmanager.com/gtag/js?id=${primaryId}`);

    const configs: string[] = [];
    if (ga4) configs.push(`gtag('config', '${ga4}');`);
    if (ads) configs.push(`gtag('config', '${ads}');`);

    injectScript(
      SCRIPT_IDS.gtagInit,
      `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${configs.join("\n")}`,
      false
    );
  }, [s?.ga4_enabled, s?.ga4_measurement_id, s?.google_ads_enabled, s?.google_ads_conversion_id, analyticsOk, marketingOk]);

  // TikTok
  useEffect(() => {
    if (s?.tiktok_enabled && s.tiktok_pixel_id && marketingOk) {
      // Skip if already loaded (re-running the SDK throws "Cannot redefine property: instance")
      if ((window as any).ttq && typeof (window as any).ttq.load === "function") {
        try { (window as any).ttq.load(s.tiktok_pixel_id); (window as any).ttq.page(); } catch { /* ignore */ }
        return;
      }
      injectScript(
        SCRIPT_IDS.tiktok,
        `!function (w, d, t) {
  if (w[t] && w[t].load) { try { w[t].load('${s.tiktok_pixel_id}'); w[t].page(); } catch(e){} return; }
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
  ttq.load('${s.tiktok_pixel_id}');
  ttq.page();
}(window, document, 'ttq');`,
        false
      );
    } else {
      removeById(SCRIPT_IDS.tiktok);
      delete (window as any).ttq;
    }
  }, [s?.tiktok_enabled, s?.tiktok_pixel_id, marketingOk]);

  // Kwai
  useEffect(() => {
    if (s?.kwai_enabled && s.kwai_pixel_id && marketingOk) {
      injectScript(
        SCRIPT_IDS.kwai,
        `!function(e,t,n,a){if(!e[a]){var c=e[a]=function(){c.callMethod?c.callMethod.apply(c,arguments):c.queue.push(arguments)};c.queue=[];c.t=+new Date;var s=t.createElement(n);s.async=!0;s.src="https://s1.kwai.net/kos/s101/nlav11187/pixel/events.js?"+ +new Date;var r=t.getElementsByTagName(n)[0];r.parentNode.insertBefore(s,r)}}(window,document,"script","kwaiq");
kwaiq('init', '${s.kwai_pixel_id}');
kwaiq('track', 'EVENT_PAGE_VIEW');`,
        false
      );
    } else {
      removeById(SCRIPT_IDS.kwai);
      delete (window as any).kwaiq;
    }
  }, [s?.kwai_enabled, s?.kwai_pixel_id, marketingOk]);

  return null;
}
