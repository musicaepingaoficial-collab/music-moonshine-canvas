import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/hooks/useUser";

const DEMO_FLAG_KEY = "demo_active";
const DEMO_PLAYS_KEY = "demo_plays_used";
const DEMO_LAST_TRACK_KEY = "demo_last_track";
const DEMO_LIMIT = 5;

interface GateState {
  open: boolean;
  reason: "plays" | "download" | "private" | null;
}

interface DemoModeContextValue {
  isDemo: boolean;
  playsUsed: number;
  playsLimit: number;
  playsLeft: number;
  activateDemo: () => void;
  deactivateDemo: () => void;
  /** Tries to count a play. Returns true if allowed, false if limit reached. */
  tryConsumePlay: (trackId: string) => boolean;
  /** Open the signup gate dialog */
  openGate: (reason: GateState["reason"]) => void;
  closeGate: () => void;
  gate: GateState;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [demoFlag, setDemoFlag] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DEMO_FLAG_KEY) === "1";
  });
  const [playsUsed, setPlaysUsed] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem(DEMO_PLAYS_KEY) || "0", 10) || 0;
  });
  const [gate, setGate] = useState<GateState>({ open: false, reason: null });

  // Auto-activate from URL ?demo=1
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      localStorage.setItem(DEMO_FLAG_KEY, "1");
      setDemoFlag(true);
    }
  }, []);

  // Once a real user logs in, demo mode ends
  useEffect(() => {
    if (user && demoFlag) {
      localStorage.removeItem(DEMO_FLAG_KEY);
      localStorage.removeItem(DEMO_PLAYS_KEY);
      localStorage.removeItem(DEMO_LAST_TRACK_KEY);
      setDemoFlag(false);
      setPlaysUsed(0);
    }
  }, [user, demoFlag]);

  // Listen for events from non-React modules (player store)
  useEffect(() => {
    const onGate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setGate({ open: true, reason: (detail?.reason as GateState["reason"]) || "plays" });
    };
    const onPlaysChanged = () => {
      const v = parseInt(localStorage.getItem(DEMO_PLAYS_KEY) || "0", 10) || 0;
      setPlaysUsed(v);
    };
    window.addEventListener("demo:gate", onGate);
    window.addEventListener("demo:plays-changed", onPlaysChanged);
    return () => {
      window.removeEventListener("demo:gate", onGate);
      window.removeEventListener("demo:plays-changed", onPlaysChanged);
    };
  }, []);

  const isDemo = !loading && !user && demoFlag;

  const activateDemo = useCallback(() => {
    localStorage.setItem(DEMO_FLAG_KEY, "1");
    setDemoFlag(true);
  }, []);

  const deactivateDemo = useCallback(() => {
    localStorage.removeItem(DEMO_FLAG_KEY);
    localStorage.removeItem(DEMO_PLAYS_KEY);
    localStorage.removeItem(DEMO_LAST_TRACK_KEY);
    setDemoFlag(false);
    setPlaysUsed(0);
  }, []);

  const openGate = useCallback((reason: GateState["reason"]) => {
    setGate({ open: true, reason });
  }, []);

  const closeGate = useCallback(() => {
    setGate({ open: false, reason: null });
  }, []);

  const tryConsumePlay = useCallback(
    (trackId: string) => {
      if (!isDemo) return true;
      const last = localStorage.getItem(DEMO_LAST_TRACK_KEY);
      // Same track replay doesn't count
      if (last === trackId) return true;
      const current = parseInt(localStorage.getItem(DEMO_PLAYS_KEY) || "0", 10) || 0;
      if (current >= DEMO_LIMIT) {
        setGate({ open: true, reason: "plays" });
        return false;
      }
      const next = current + 1;
      localStorage.setItem(DEMO_PLAYS_KEY, String(next));
      localStorage.setItem(DEMO_LAST_TRACK_KEY, trackId);
      setPlaysUsed(next);
      return true;
    },
    [isDemo]
  );

  const value: DemoModeContextValue = {
    isDemo,
    playsUsed,
    playsLimit: DEMO_LIMIT,
    playsLeft: Math.max(0, DEMO_LIMIT - playsUsed),
    activateDemo,
    deactivateDemo,
    tryConsumePlay,
    openGate,
    closeGate,
    gate,
  };

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) {
    // Safe default if used outside provider (shouldn't happen)
    return {
      isDemo: false,
      playsUsed: 0,
      playsLimit: DEMO_LIMIT,
      playsLeft: DEMO_LIMIT,
      activateDemo: () => {},
      deactivateDemo: () => {},
      tryConsumePlay: () => true,
      openGate: () => {},
      closeGate: () => {},
      gate: { open: false, reason: null } as GateState,
    } satisfies DemoModeContextValue;
  }
  return ctx;
}

// Imperative accessors for non-React modules (player store, services)
export const demoBridge = {
  isDemo(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DEMO_FLAG_KEY) === "1";
  },
  playsUsed(): number {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem(DEMO_PLAYS_KEY) || "0", 10) || 0;
  },
  lastTrack(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(DEMO_LAST_TRACK_KEY);
  },
  limit: DEMO_LIMIT,
};
