/**
 * Pixel tracking API.
 *
 * Provides typed wrappers around fbq/gtag that:
 * - Respect the toggles configured in /admin/pixels (only fires if the corresponding
 *   integration is enabled and the event is enabled in meta_events).
 * - Map a unified payload to the format each platform expects.
 * - Are safe to call before the pixel scripts have loaded (calls are queued by fbq/gtag).
 *
 * Usage:
 *   import { trackEvent } from "@/lib/pixels";
 *   trackEvent("purchase", { value: 49.9, currency: "BRL", transaction_id: "abc123" });
 *
 * Or use the React hook:
 *   const { track } = usePixels();
 *   track("add_to_cart", { value: 19.9, currency: "BRL", content_ids: ["sku-1"] });
 */
import { usePixelSettings, type PixelSettings } from "@/hooks/useSiteSettings";
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
  /** Monetary value (purchase, add_to_cart, etc.) */
  value?: number;
  /** ISO currency code (default BRL) */
  currency?: string;
  /** External transaction id (purchase) */
  transaction_id?: string;
  /** Product/Content identifiers */
  content_ids?: string[];
  /** Single content name (view_content) */
  content_name?: string;
  /** Content category */
  content_category?: string;
  /** Content type, e.g. "product" */
  content_type?: string;
  /** Number of items */
  num_items?: number;
  /** User email (will be passed to advanced matching when available) */
  email?: string;
  /** User phone */
  phone?: string;
  /** Free-form extra params merged into the event */
  [key: string]: unknown;
}

// ───────────────── Event name mappings ─────────────────

/** Meta/Facebook standard event names */
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

/** GA4 recommended event names */
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

/** Maps a unified event name to the key inside meta_events JSONB */
const META_TOGGLE_KEY_MAP: Partial<Record<PixelEvent, keyof PixelSettings["meta_events"] | string>> = {
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

/** Maps a unified event name to the key inside google_ads_labels JSONB */
const ADS_LABEL_KEY_MAP: Partial<Record<PixelEvent, string>> = {
  page_view: "page_view",
  initiate_checkout: "begin_checkout",
  begin_checkout: "begin_checkout",
  purchase: "purchase",
  complete_registration: "sign_up",
  sign_up: "sign_up",
};

/** TikTok standard event names */
const TIKTOK_EVENT_MAP: Partial<Record<PixelEvent, string>> = {
  page_view: "Pageview",
  view_content: "ViewContent",
  add_to_cart: "AddToCart",
  initiate_checkout: "InitiateCheckout",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  purchase: "PlaceAnOrder",
  lead: "SubmitForm",
  complete_registration: "CompleteRegistration",
  sign_up: "CompleteRegistration",
};

/** Kwai standard event names */
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

// ───────────────── Payload mapping helpers ─────────────────

function buildMetaPayload(event: PixelEvent, p: PixelPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.value != null) out.value = p.value;
  if (p.value != null || p.currency) out.currency = p.currency || "BRL";
  if (p.content_ids?.length) {
    out.content_ids = p.content_ids;
    if (!p.content_type) out.content_type = "product";
  }
  if (p.content_type) out.content_type = p.content_type;
  if (p.content_name) out.content_name = p.content_name;
  if (p.content_category) out.content_category = p.content_category;
  if (p.num_items != null) out.num_items = p.num_items;

  // Pass through any other custom params (excluding the ones we mapped)
  const reserved = new Set([
    "value",
    "currency",
    "transaction_id",
    "content_ids",
    "content_name",
    "content_category",
    "content_type",
    "num_items",
    "email",
    "phone",
  ]);
  for (const [k, v] of Object.entries(p)) {
    if (!reserved.has(k) && v != null) out[k] = v;
  }

  // event_id helps deduplicate with CAPI server-side events
  if (p.transaction_id && event === "purchase") {
    out.event_id = p.transaction_id;
  }
  return out;
}

function buildGa4Payload(event: PixelEvent, p: PixelPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.value != null) out.value = p.value;
  if (p.value != null || p.currency) out.currency = p.currency || "BRL";
  if (p.transaction_id) out.transaction_id = p.transaction_id;
  if (p.content_ids?.length) {
    out.items = p.content_ids.map((id) => ({ item_id: id }));
  }
  if (p.content_name) out.item_name = p.content_name;
  if (p.content_category) out.item_category = p.content_category;
  return out;
}

function buildAdsConversionPayload(
  conversionId: string,
  label: string,
  p: PixelPayload
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    send_to: `${conversionId}/${label}`,
  };
  if (p.value != null) out.value = p.value;
  if (p.value != null || p.currency) out.currency = p.currency || "BRL";
  if (p.transaction_id) out.transaction_id = p.transaction_id;
  return out;
}

// ───────────────── Core dispatch ─────────────────

export interface DispatchOptions {
  /** Settings snapshot. If omitted, no event fires (use the hook to access live settings). */
  settings: PixelSettings | null | undefined;
  /** Optional debug logging */
  debug?: boolean;
}

export function dispatchEvent(
  event: PixelEvent,
  payload: PixelPayload = {},
  opts: DispatchOptions
): void {
  const { settings, debug } = opts;
  if (!settings) return;

  const log = (...args: unknown[]) => {
    if (debug) console.log("[pixels]", ...args);
  };

  // ── Meta Pixel ──
  if (settings.meta_enabled && typeof window.fbq === "function") {
    const metaName = META_EVENT_MAP[event];
    const toggleKey = META_TOGGLE_KEY_MAP[event];
    const enabled = toggleKey ? settings.meta_events?.[toggleKey as keyof PixelSettings["meta_events"]] !== false : true;
    if (metaName && enabled) {
      const metaPayload = buildMetaPayload(event, payload);
      const eventId = (metaPayload.event_id as string | undefined) ?? undefined;
      log("fbq track", metaName, metaPayload);
      if (eventId) {
        window.fbq("track", metaName, metaPayload, { eventID: eventId });
      } else {
        window.fbq("track", metaName, metaPayload);
      }
    }
  }

  // ── GA4 ──
  if (settings.ga4_enabled && settings.ga4_measurement_id && typeof window.gtag === "function") {
    const ga4Name = GA4_EVENT_MAP[event];
    if (ga4Name) {
      const ga4Payload = {
        ...buildGa4Payload(event, payload),
        send_to: settings.ga4_measurement_id,
      };
      log("gtag GA4", ga4Name, ga4Payload);
      window.gtag("event", ga4Name, ga4Payload);
    }
  }

  // ── Google Ads conversion ──
  if (
    settings.google_ads_enabled &&
    settings.google_ads_conversion_id &&
    typeof window.gtag === "function"
  ) {
    const labelKey = ADS_LABEL_KEY_MAP[event];
    const label = labelKey ? settings.google_ads_labels?.[labelKey as keyof PixelSettings["google_ads_labels"]] : undefined;
    if (label) {
      const adsPayload = buildAdsConversionPayload(
        settings.google_ads_conversion_id,
        label as string,
        payload
      );
      log("gtag Ads conversion", adsPayload);
      window.gtag("event", "conversion", adsPayload);
    }
  }

  // ── GTM dataLayer ──
  if (settings.gtm_enabled && settings.gtm_container_id) {
    window.dataLayer = window.dataLayer || [];
    const dlEvent = { event, ...payload };
    log("dataLayer push", dlEvent);
    window.dataLayer.push(dlEvent);
  }
}

// ───────────────── Stand-alone helper ─────────────────

let cachedSettings: PixelSettings | null | undefined;

/** Internal: receives a fresh settings snapshot from the hook each render. */
export function _setCachedPixelSettings(s: PixelSettings | null | undefined) {
  cachedSettings = s;
}

/**
 * Fire-and-forget tracker. Uses the latest settings snapshot cached by the
 * `usePixels` hook (must be mounted somewhere, e.g. via PixelInjector).
 */
export function trackEvent(event: PixelEvent, payload: PixelPayload = {}, debug = false) {
  dispatchEvent(event, payload, { settings: cachedSettings, debug });
}

// ───────────────── React hook ─────────────────

export function usePixels() {
  const { data: settings } = usePixelSettings();
  // Keep the standalone tracker in sync with the latest settings.
  _setCachedPixelSettings(settings);

  const track = useCallback(
    (event: PixelEvent, payload: PixelPayload = {}, debug = false) => {
      dispatchEvent(event, payload, { settings, debug });
    },
    [settings]
  );

  return { track, settings };
}
