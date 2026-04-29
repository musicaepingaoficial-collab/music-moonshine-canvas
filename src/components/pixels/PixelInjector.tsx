import { useEffect } from "react";
import { usePixelSettings } from "@/hooks/useSiteSettings";

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

export function PixelInjector() {
  const { data: s } = usePixelSettings();

  // Meta Pixel
  useEffect(() => {
    if (s?.meta_enabled && s.meta_pixel_id) {
      const events = s.meta_events || {};
      const trackEvents = Object.entries(events)
        .filter(([k, v]) => v && k !== "page_view")
        .map(([k]) => {
          const eventMap: Record<string, string> = {
            view_content: "ViewContent",
            add_to_cart: "AddToCart",
            initiate_checkout: "InitiateCheckout",
            add_payment_info: "AddPaymentInfo",
            purchase: "Purchase",
            lead: "Lead",
            complete_registration: "CompleteRegistration",
          };
          return eventMap[k];
        })
        .filter(Boolean);

      const pageView = events.page_view !== false ? "fbq('track', 'PageView');" : "";

      injectScript(
        SCRIPT_IDS.meta,
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${s.meta_pixel_id}');
${pageView}`,
        false
      );

      // Stash list of events to track on demand for app code that fires them later
      (window as any).__lovEnabledMetaEvents = trackEvents;
    } else {
      removeById(SCRIPT_IDS.meta);
      removeById(SCRIPT_IDS.metaNoscript);
      delete (window as any).fbq;
      delete (window as any)._fbq;
    }
  }, [s?.meta_enabled, s?.meta_pixel_id, s?.meta_events]);

  // GTM
  useEffect(() => {
    if (s?.gtm_enabled && s.gtm_container_id) {
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
  }, [s?.gtm_enabled, s?.gtm_container_id]);

  // GA4 + Google Ads (compartilham gtag.js)
  useEffect(() => {
    const ga4 = s?.ga4_enabled && s?.ga4_measurement_id ? s.ga4_measurement_id : null;
    const ads =
      s?.google_ads_enabled && s?.google_ads_conversion_id ? s.google_ads_conversion_id : null;

    if (!ga4 && !ads) {
      removeById(SCRIPT_IDS.gtag);
      removeById(SCRIPT_IDS.gtagInit);
      return;
    }

    const primaryId = ga4 || ads!;
    injectExternalScript(
      SCRIPT_IDS.gtag,
      `https://www.googletagmanager.com/gtag/js?id=${primaryId}`
    );

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
  }, [
    s?.ga4_enabled,
    s?.ga4_measurement_id,
    s?.google_ads_enabled,
    s?.google_ads_conversion_id,
  ]);

  return null;
}
