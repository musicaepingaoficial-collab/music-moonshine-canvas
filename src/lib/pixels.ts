/**
 * Pixel tracking API.
 *
 * Provides typed wrappers around fbq/gtag that:
 * - Respect the toggles configured in /admin/pixels.
 * - Map a unified payload to the format each platform expects.
 * - Generate a stable `event_id` per call and mirror conversion events to
 *   Meta CAPI automatically, ensuring deduplication.
 */
import { usePixelSettings, type PixelSettings } from "@/hooks/useSiteSettings";
import { isCategoryAllowed } from "@/hooks/useCookieConsent";
import { useCallback } from "react";

// ───────────────────────── Types ─────────────────────────

export type PixelEvent =
  | "page_view"
  | "view_content"
  | "add_to_cart"
  | "initiate_checkout"
  | "add_payment_info"
  | "purchase"
  | "lead"
  | "complete_registration"
  | "begin_checkout"
  | "sign_up";

export interface PixelPayload {
  value?: number;
  currency?: string;
  transaction_id?: string;
  content_ids?: string[];
  content_name?: string;
  content_category?: string;
  content_type?: string;
  num_items?: number;
  email?: string;
  phone?: string;
  /** External user id (Supabase user.id). Used for CAPI external_id matching. */
  external_id?: string;
  /** Advanced matching extras (sent to CAPI, hashed server-side) */
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  date_of_birth?: string;
  [key: string]: unknown;
}

// ───────────────── Event name mappings ─────────────────

const META_EVENT_MAP: Partial<Record<PixelEvent, string>> = {
  page_view: "PageView",
  view_content: "ViewContent",
  add_to_cart: "AddToCart",
  initiate_checkout: "InitiateCheckout",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  purchase: "Purchase",
  lead: "Lead",
  complete_registration: "CompleteRegistration",
  sign_up: "CompleteRegistration",
};

const GA4_EVENT_MAP: Partial<Record<PixelEvent, string>> = {
  page_view: "page_view",
  view_content: "view_item",
  add_to_cart: "add_to_cart",
  initiate_checkout: "begin_checkout",
  begin_checkout: "begin_checkout",
  add_payment_info: "add_payment_info",
  purchase: "purchase",
  lead: "generate_lead",
  complete_registration: "sign_up",
  sign_up: "sign_up",
};

const META_TOGGLE_KEY_MAP: Partial<Record<PixelEvent, string>> = {
  page_view: "page_view",
  view_content: "view_content",
  add_to_cart: "add_to_cart",
  initiate_checkout: "initiate_checkout",
  begin_checkout: "initiate_checkout",
  add_payment_info: "add_payment_info",
  purchase: "purchase",
  lead: "lead",
  complete_registration: "complete_registration",
  sign_up: "complete_registration",
};

const ADS_LABEL_KEY_MAP: Partial<Record<PixelEvent, string>> = {
  page_view: "page_view",
  initiate_checkout: "begin_checkout",
  begin_checkout: "begin_checkout",
  purchase: "purchase",
  complete_registration: "sign_up",
  sign_up: "sign_up",
};

const KWAI_EVENT_MAP: Partial<Record<PixelEvent, string>> = {
  page_view: "EVENT_PAGE_VIEW",
  view_content: "EVENT_CONTENT_VIEW",
  add_to_cart: "EVENT_ADD_TO_CART",
  initiate_checkout: "EVENT_INITIATED_CHECKOUT",
  begin_checkout: "EVENT_INITIATED_CHECKOUT",
  add_payment_info: "EVENT_ADD_PAYMENT_INFO",
  purchase: "EVENT_PURCHASE",
  lead: "EVENT_FORM",
  complete_registration: "EVENT_COMPLETE_REGISTRATION",
  sign_up: "EVENT_COMPLETE_REGISTRATION",
};

/** Events for which we mirror to Meta CAPI server-side by default. */
const CAPI_EVENTS = new Set<PixelEvent>([
  "view_content",
  "add_to_cart",
  "initiate_checkout",
  "begin_checkout",
  "add_payment_info",
  "purchase",
  "lead",
  "complete_registration",
  "sign_up",
]);

// ───────────────── Payload mapping helpers ─────────────────

function buildMetaPayload(p: PixelPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.value != null) out.value = p.value;
  if (p.value != null || p.currency) out.currency = p.currency || "BRL";
  if (p.content_ids?.length) {
    out.content_ids = p.content_ids;
    if (!p.content_type) out.content_type = "product";
    // DPA-compatible `contents`
    out.contents = p.content_ids.map((id) => ({
      id,
      quantity: 1,
      item_price: p.value && p.content_ids!.length ? p.value / p.content_ids!.length : undefined,
    }));
  }
  if (p.content_type) out.content_type = p.content_type;
  if (p.content_name) out.content_name = p.content_name;
  if (p.content_category) out.content_category = p.content_category;
  if (p.num_items != null) out.num_items = p.num_items;

  const reserved = new Set([
    "value", "currency", "transaction_id", "content_ids", "content_name",
    "content_category", "content_type", "num_items", "email", "phone",
    "external_id", "first_name", "last_name", "city", "state", "zip",
    "country", "date_of_birth",
  ]);
  for (const [k, v] of Object.entries(p)) {
    if (!reserved.has(k) && v != null) out[k] = v;
  }
  return out;
}

function buildGa4Payload(p: PixelPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.value != null) out.value = p.value;
  if (p.value != null || p.currency) out.currency = p.currency || "BRL";
  if (p.transaction_id) out.transaction_id = p.transaction_id;
  if (p.content_ids?.length) out.items = p.content_ids.map((id) => ({ item_id: id }));
  if (p.content_name) out.item_name = p.content_name;
  if (p.content_category) out.item_category = p.content_category;
  return out;
}

function buildAdsConversionPayload(
  conversionId: string,
  label: string,
  p: PixelPayload
): Record<string, unknown> {
  const out: Record<string, unknown> = { send_to: `${conversionId}/${label}` };
  if (p.value != null) out.value = p.value;
  if (p.value != null || p.currency) out.currency = p.currency || "BRL";
  if (p.transaction_id) out.transaction_id = p.transaction_id;
  return out;
}

// ───────────────── event_id helpers ─────────────────

function newEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ───────────────── Core dispatch ─────────────────

export interface DispatchOptions {
  settings: PixelSettings | null | undefined;
  debug?: boolean;
  /** Disable automatic CAPI mirror for this call. */
  noCapi?: boolean;
}

export function dispatchEvent(
  event: PixelEvent,
  payload: PixelPayload = {},
  opts: DispatchOptions
): void {
  const { settings, debug, noCapi } = opts;
  if (!settings) return;

  // Auto-merge cached identity (external_id/email/phone/name) so every event
  // carries matching parameters. Explicit payload values win.
  const u = cachedUserData;
  payload = {
    external_id: payload.external_id ?? u.external_id,
    email: payload.email ?? u.email,
    phone: payload.phone ?? u.phone,
    first_name: payload.first_name ?? u.first_name,
    last_name: payload.last_name ?? u.last_name,
    ...payload,
  };

  const marketingOk = isCategoryAllowed("marketing");
  const analyticsOk = isCategoryAllowed("analytics");

  const log = (...args: unknown[]) => {
    if (debug) console.log("[pixels]", ...args);
  };

  // Generate one event_id per call, shared between Pixel and CAPI
  const eventId = (payload.event_id as string) || newEventId();

  // ── Meta Pixel ──
  let metaFired = false;
  if (marketingOk && settings.meta_enabled && typeof window.fbq === "function") {
    const metaName = META_EVENT_MAP[event];
    const toggleKey = META_TOGGLE_KEY_MAP[event];
    const enabled = toggleKey
      ? (settings.meta_events as Record<string, boolean>)?.[toggleKey] !== false
      : true;
    if (metaName && enabled) {
      const metaPayload = buildMetaPayload(payload);
      log("fbq track", metaName, metaPayload, "eventID", eventId);
      window.fbq("track", metaName, metaPayload, { eventID: eventId });
      metaFired = true;
    }
  }

  // ── Meta CAPI (mirror) ──
  if (
    metaFired &&
    !noCapi &&
    CAPI_EVENTS.has(event) &&
    settings.meta_enabled
  ) {
    const metaName = META_EVENT_MAP[event];
    if (metaName) {
      sendCapi({
        event_name: metaName as CapiCallInput["event_name"],
        event_id: eventId,
        user_data: {
          email: payload.email,
          phone: payload.phone,
          external_id: payload.external_id,
          first_name: payload.first_name,
          last_name: payload.last_name,
          city: payload.city,
          state: payload.state,
          zip: payload.zip,
          country: payload.country,
          date_of_birth: payload.date_of_birth,
        },
        custom_data: buildMetaPayload(payload),
      });
    }
  }

  // ── GA4 ──
  if (analyticsOk && settings.ga4_enabled && settings.ga4_measurement_id && typeof window.gtag === "function") {
    const ga4Name = GA4_EVENT_MAP[event];
    if (ga4Name) {
      const ga4Payload = { ...buildGa4Payload(payload), send_to: settings.ga4_measurement_id };
      log("gtag GA4", ga4Name, ga4Payload);
      window.gtag("event", ga4Name, ga4Payload);
    }
  }

  // ── Google Ads ──
  if (marketingOk && settings.google_ads_enabled && settings.google_ads_conversion_id && typeof window.gtag === "function") {
    const labelKey = ADS_LABEL_KEY_MAP[event];
    const label = labelKey ? (settings.google_ads_labels as Record<string, string>)?.[labelKey] : undefined;
    if (label) {
      const adsPayload = buildAdsConversionPayload(settings.google_ads_conversion_id, label, payload);
      log("gtag Ads conversion", adsPayload);
      window.gtag("event", "conversion", adsPayload);
    }
  }

  // ── Kwai ──
  if (marketingOk && settings.kwai_enabled && (window as any).kwaiq) {
    const kwName = KWAI_EVENT_MAP[event];
    if (kwName && settings.kwai_pixel_id) {
      const kwPayload: Record<string, unknown> = {};
      if (payload.value != null) kwPayload.value = payload.value;
      if (payload.value != null || payload.currency) kwPayload.currency = payload.currency || "BRL";
      if (payload.content_ids?.length) {
        kwPayload.content_id = payload.content_ids[0];
        kwPayload.content_ids = payload.content_ids;
        kwPayload.content_type = payload.content_type || "product";
        kwPayload.quantity = payload.num_items ?? payload.content_ids.length;
      }
      if (payload.content_name) kwPayload.content_name = payload.content_name;
      if (payload.content_category) kwPayload.content_category = payload.content_category;
      if (payload.transaction_id) kwPayload.order_id = payload.transaction_id;
      log("kwaiq track", kwName, kwPayload);
      try {
        const kwaiq = (window as any).kwaiq;
        if (typeof kwaiq.track === "function") {
          kwaiq.track(kwName, kwPayload);
        } else if (typeof kwaiq === "function") {
          kwaiq("track", kwName, kwPayload);
        }
      } catch (err) {
        console.warn("[pixels] kwaiq track failed", err);
      }
    }
  }


  // ── GTM ──
  if ((analyticsOk || marketingOk) && settings.gtm_enabled && settings.gtm_container_id) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, event_id: eventId, ...payload });
  }
}

// ───────────────── Stand-alone helper ─────────────────

let cachedSettings: PixelSettings | null | undefined;

export function _setCachedPixelSettings(s: PixelSettings | null | undefined) {
  cachedSettings = s;
}

/**
 * Cached user identity for Advanced Matching / CAPI. Populated by
 * PixelInjector whenever the auth session changes. Auto-merged into every
 * track call so events (especially ViewContent/InitiateCheckout) carry
 * external_id, email, phone and name.
 */
export interface CachedUserData {
  email?: string;
  phone?: string;
  external_id?: string;
  first_name?: string;
  last_name?: string;
}
let cachedUserData: CachedUserData = {};

export function _setCachedUserData(u: CachedUserData) {
  cachedUserData = u || {};
}

export function _getCachedUserData(): CachedUserData {
  return cachedUserData;
}

/**
 * Inject the Kwai base pixel script exactly once and fire the initial PageView.
 * Uses an internal SDK guard as well as a module-level lock to prevent the
 * Kwai SDK from redefining its non-configurable `instance` property.
 */
let kwaiInitPixelId: string | null = null;
let kwaiBaseScriptRequested = false;

export function initKwaiPixel(pixelId: string) {
  if (typeof window === "undefined" || !pixelId) return;

  const kwaiq = (window as any).kwaiq;
  if (kwaiq?.instance || kwaiBaseScriptRequested || document.getElementById("kwai-pixel-base-script")) {
    if (kwaiInitPixelId === pixelId) return;
    kwaiInitPixelId = pixelId;
    try {
      kwaiq?.load?.(pixelId);
      kwaiq?.pageView?.();
    } catch (err) {
      console.warn("[pixels] kwai existing instance pageView failed", err);
    }
    return;
  }

  kwaiBaseScriptRequested = true;
  kwaiInitPixelId = pixelId;

  const s = document.createElement("script");
  s.id = "kwai-pixel-base-script";
  s.type = "text/javascript";
  s.async = true;
  s.text = `!function(e,t){
var n="kwaiq";
if(e[n]&&e[n].instance){return;}
if(t.getElementById("kwai-pixel-sdk-script")){return;}
var s=e[n]=e[n]||[];
s.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
s.factory=function(e){return function(){var t=Array.prototype.slice.call(arguments);t.unshift(e);s.push(t);return s}};
for(var g=0;g<s.methods.length;g++){var j=s.methods[g];s[j]=s.factory(j)}
s.load=function(e){
  if(t.getElementById("kwai-pixel-sdk-script")){return;}
  var r=t.createElement("script");r.id="kwai-pixel-sdk-script";r.type="text/javascript";r.async=!0;r.src="https://r.kwaicdn.com/js/kwaiq.js?v=2.2.4";
  var i=t.getElementsByTagName("script")[0];i.parentNode.insertBefore(r,i)
};
s.pageView=function(){s.track("pageView")};
s.load("${pixelId}");
}(window,document);`;
  document.head.appendChild(s);

  try {
    (window as any).kwaiq?.pageView?.();
  } catch (err) {
    console.warn("[pixels] kwai init failed", err);
  }
}

/** Fire a Kwai PageView on SPA route changes without re-injecting the script. */
export function trackKwaiPageView() {
  if (typeof window === "undefined") return;
  try {
    const kwaiq = (window as any).kwaiq;
    if (typeof kwaiq?.pageView === "function") kwaiq.pageView();
    else if (typeof kwaiq?.page === "function") kwaiq.page();
  } catch {
    /* ignore */
  }
}

function isDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).has("kwai_debug")) return true;
    if (new URLSearchParams(window.location.search).has("pixel_debug")) return true;
    if (localStorage.getItem("pixel_debug") === "1") return true;
    if (localStorage.getItem("kwai_debug") === "1") return true;
  } catch { /* ignore */ }
  return false;
}

export function trackEvent(event: PixelEvent, payload: PixelPayload = {}, debug = false) {
  try {
    dispatchEvent(event, payload, { settings: cachedSettings, debug: debug || isDebugEnabled() });
  } catch (err) {
    console.warn("[pixels] trackEvent failed", err);
  }
}


// ───────────────── React hook ─────────────────

export function usePixels() {
  const { data: settings } = usePixelSettings();
  _setCachedPixelSettings(settings);

  const track = useCallback(
    (event: PixelEvent, payload: PixelPayload = {}, debug = false) => {
      dispatchEvent(event, payload, { settings, debug });
    },
    [settings]
  );

  return { track, settings };
}

// ───────────────── CAPI helpers ─────────────────

export function getFbCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === "undefined") return {};
  const out: { fbp?: string; fbc?: string } = {};
  for (const part of document.cookie.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === "_fbp") out.fbp = decodeURIComponent(v.join("="));
    else if (k === "_fbc") out.fbc = decodeURIComponent(v.join("="));
  }
  return out;
}

export interface CapiCallInput {
  event_name:
    | "PageView"
    | "ViewContent"
    | "AddToCart"
    | "InitiateCheckout"
    | "AddPaymentInfo"
    | "Purchase"
    | "Lead"
    | "CompleteRegistration";
  event_id?: string;
  user_data?: {
    email?: string;
    phone?: string;
    external_id?: string;
    first_name?: string;
    last_name?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    date_of_birth?: string;
  };
  custom_data?: Record<string, unknown>;
}

/** Fire-and-forget call to the meta-capi edge function. */
export function sendCapi(input: CapiCallInput): void {
  if (!isCategoryAllowed("marketing")) return;
  try {
    const { fbp, fbc } = getFbCookies();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-capi`;
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        ...input,
        event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
        user_data: {
          ...(input.user_data || {}),
          fbp,
          fbc,
          client_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
