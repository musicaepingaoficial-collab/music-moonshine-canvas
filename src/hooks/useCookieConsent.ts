import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "cookie_consent_v2";
export const CONSENT_VERSION = "1.0";

export type ConsentCategory = "essential" | "analytics" | "marketing";
export type ConsentStatus = "pending" | "accepted" | "rejected" | "custom";

export interface ConsentState {
  status: ConsentStatus;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  version: string;
  updatedAt?: string;
}

const DEFAULT_STATE: ConsentState = {
  status: "pending",
  essential: true,
  analytics: false,
  marketing: false,
  version: CONSENT_VERSION,
};

function read(): ConsentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as ConsentState;
    return { ...DEFAULT_STATE, ...parsed, essential: true };
  } catch {
    return DEFAULT_STATE;
  }
}

function write(state: ConsentState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: state }));
}

async function logConsent(state: ConsentState) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const rows = (["cookies_essential", "cookies_analytics", "cookies_marketing"] as const).map((type) => ({
      user_id: user?.id ?? null,
      consent_type: type,
      granted:
        type === "cookies_essential" ? true :
        type === "cookies_analytics" ? state.analytics :
        state.marketing,
      version: state.version,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    }));
    await supabase.from("consent_logs").insert(rows);
  } catch (e) {
    console.warn("[consent] log error", e);
  }
}

export function isCategoryAllowed(category: ConsentCategory): boolean {
  const s = read();
  if (category === "essential") return true;
  // Opt-out: during pending state, allow everything (cookies stay active until rejected)
  if (s.status === "pending") return true;
  return !!s[category];
}

export function getConsent(): ConsentState {
  return read();
}

export function acceptAll() {
  const state: ConsentState = {
    status: "accepted",
    essential: true,
    analytics: true,
    marketing: true,
    version: CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
  };
  write(state);
  logConsent(state);
}

export function rejectAll() {
  const state: ConsentState = {
    status: "rejected",
    essential: true,
    analytics: false,
    marketing: false,
    version: CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
  };
  write(state);
  logConsent(state);
}

export function setConsent(opts: { analytics: boolean; marketing: boolean }) {
  const all = opts.analytics && opts.marketing;
  const none = !opts.analytics && !opts.marketing;
  const state: ConsentState = {
    status: all ? "accepted" : none ? "rejected" : "custom",
    essential: true,
    analytics: opts.analytics,
    marketing: opts.marketing,
    version: CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
  };
  write(state);
  logConsent(state);
}

export function openPreferences() {
  window.dispatchEvent(new CustomEvent("cookie-preferences-open"));
}

export function useCookieConsent() {
  const [consent, setState] = useState<ConsentState>(() => read());

  useEffect(() => {
    const handler = () => setState(read());
    window.addEventListener("cookie-consent-changed", handler);
    return () => window.removeEventListener("cookie-consent-changed", handler);
  }, []);

  return {
    consent,
    acceptAll: useCallback(acceptAll, []),
    rejectAll: useCallback(rejectAll, []),
    setConsent: useCallback(setConsent, []),
    openPreferences: useCallback(openPreferences, []),
    isCategoryAllowed,
  };
}
