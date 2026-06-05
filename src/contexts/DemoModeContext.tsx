import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useUser";
import { supabase } from "@/integrations/supabase/client";

const DEMO_LIMIT = 5;
const PENDING_FLAG = "demo_pending"; // session marker while signInAnonymously is in flight

interface GateState {
  open: boolean;
  reason: "plays" | "download" | "private" | null;
}

interface DemoModeContextValue {
  isDemo: boolean;
  playsUsed: number;
  playsLimit: number;
  playsLeft: number;
  activateDemo: () => Promise<void>;
  deactivateDemo: () => Promise<void>;
  openGate: (reason: GateState["reason"]) => void;
  closeGate: () => void;
  gate: GateState;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [gate, setGate] = useState<GateState>({ open: false, reason: null });
  const [activating, setActivating] = useState(false);

  const isAnonymous = !!(user as any)?.is_anonymous;
  const isDemo = !loading && isAnonymous;

  // Auto-activate from URL ?demo=1 (creates an anonymous Supabase user)
  useEffect(() => {
    if (loading || user || activating) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const wantsDemo =
      params.get("demo") === "1" ||
      sessionStorage.getItem(PENDING_FLAG) === "1";
    if (!wantsDemo) return;

    setActivating(true);
    sessionStorage.setItem(PENDING_FLAG, "1");
    supabase.auth.signInAnonymously().then(({ error }) => {
      if (error) {
        console.error("[Demo] signInAnonymously falhou:", error.message);
        sessionStorage.removeItem(PENDING_FLAG);
      }
      setActivating(false);
    });
  }, [loading, user, activating]);

  // Clear pending flag once we have an anon user
  useEffect(() => {
    if (isAnonymous) sessionStorage.removeItem(PENDING_FLAG);
  }, [isAnonymous]);

  // Server-side counter via demo_play_log (RLS: user reads own row only)
  const { data: logRow } = useQuery({
    queryKey: ["demo-play-log", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (supabase.from("demo_play_log" as any) as any)
        .select("plays_used, last_track_id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data as { plays_used: number; last_track_id: string | null } | null;
    },
    enabled: isDemo && !!user?.id,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });

  const playsUsed = logRow?.plays_used ?? 0;

  // Refetch counter whenever the player consumed a new play
  useEffect(() => {
    const onConsumed = () => {
      queryClient.invalidateQueries({ queryKey: ["demo-play-log", user?.id] });
    };
    const onGate = (e: Event) => {
      const reason = ((e as CustomEvent).detail?.reason as GateState["reason"]) || "plays";
      setGate({ open: true, reason });
      queryClient.invalidateQueries({ queryKey: ["demo-play-log", user?.id] });
    };
    window.addEventListener("demo:play-consumed", onConsumed);
    window.addEventListener("demo:gate", onGate);
    return () => {
      window.removeEventListener("demo:play-consumed", onConsumed);
      window.removeEventListener("demo:gate", onGate);
    };
  }, [queryClient, user?.id]);

  const activateDemo = useCallback(async () => {
    if (user) return;
    sessionStorage.setItem(PENDING_FLAG, "1");
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      sessionStorage.removeItem(PENDING_FLAG);
      console.error("[Demo] activate falhou:", error.message);
    }
  }, [user]);

  const deactivateDemo = useCallback(async () => {
    sessionStorage.removeItem(PENDING_FLAG);
    if (isAnonymous) {
      await supabase.auth.signOut();
    }
  }, [isAnonymous]);

  const openGate = useCallback((reason: GateState["reason"]) => {
    setGate({ open: true, reason });
  }, []);
  const closeGate = useCallback(() => setGate({ open: false, reason: null }), []);

  const value: DemoModeContextValue = {
    isDemo,
    playsUsed,
    playsLimit: DEMO_LIMIT,
    playsLeft: Math.max(0, DEMO_LIMIT - playsUsed),
    activateDemo,
    deactivateDemo,
    openGate,
    closeGate,
    gate,
  };

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) {
    return {
      isDemo: false,
      playsUsed: 0,
      playsLimit: DEMO_LIMIT,
      playsLeft: DEMO_LIMIT,
      activateDemo: async () => {},
      deactivateDemo: async () => {},
      openGate: () => {},
      closeGate: () => {},
      gate: { open: false, reason: null } as GateState,
    } satisfies DemoModeContextValue;
  }
  return ctx;
}
