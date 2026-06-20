import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useAssinatura } from "@/hooks/useUser";
import { supabase } from "@/integrations/supabase/client";

const DEMO_LIMIT = 5;
const PENDING_FLAG = "demo_pending"; // session marker while demo sign-in is in flight

interface GateState {
  open: boolean;
  reason: "plays" | "download" | "private" | null;
}

interface DemoModeContextValue {
  isDemo: boolean;
  isActivatingDemo: boolean;
  demoActivationError: string | null;
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
  const { data: assinatura, isLoading: isLoadingAssinatura } = useAssinatura(user?.id);
  const queryClient = useQueryClient();
  const location = useLocation();
  const [gate, setGate] = useState<GateState>({ open: false, reason: null });
  const [activating, setActivating] = useState(false);
  const [demoActivationError, setDemoActivationError] = useState<string | null>(null);

  const isDemoUser =
    !!(user as any)?.is_anonymous ||
    (user as any)?.app_metadata?.demo_user === true ||
    (user as any)?.user_metadata?.demo_user === true;

  const isDemo = !loading && isDemoUser;
  const wantsDemo =
    typeof window !== "undefined" &&
    (new URLSearchParams(location.search).get("demo") === "1" ||
      sessionStorage.getItem(PENDING_FLAG) === "1");

  // Auto-activate from URL ?demo=1 (creates an anonymous Supabase user)
  // Re-runs on route changes so the LandingPage → /dashboard?demo=1 navigation triggers it.
  useEffect(() => {
    if (!wantsDemo) {
      setDemoActivationError(null);
      return;
    }
    if (loading || user || activating || demoActivationError) return;

    void startDemoSession();
  }, [loading, user, activating, wantsDemo, demoActivationError]);

  // Clear pending flag once we have an anon user
  useEffect(() => {
    if (isDemoUser) sessionStorage.removeItem(PENDING_FLAG);
  }, [isDemoUser]);

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

  const startDemoSession = useCallback(async () => {
    if (user) return;
    setDemoActivationError(null);
    setActivating(true);
    sessionStorage.setItem(PENDING_FLAG, "1");

    try {
      const anonResult = await supabase.auth.signInAnonymously();
      if (!anonResult.error) return;

      console.warn("[Demo] login anônimo indisponível, usando fallback:", anonResult.error.message);
      const { data, error } = await supabase.functions.invoke("demo-signin", { body: {} });
      if (error || !data?.access_token || !data?.refresh_token) {
        throw new Error(error?.message || data?.error || anonResult.error.message || "Falha ao iniciar demonstração");
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) throw sessionError;
    } catch (error: any) {
      console.error("[Demo] activate falhou:", error?.message || error);
      setDemoActivationError(error?.message || "Falha ao iniciar demonstração");
    } finally {
      sessionStorage.removeItem(PENDING_FLAG);
      setActivating(false);
    }
  }, [user]);

  const activateDemo = useCallback(async () => {
    await startDemoSession();
  }, [startDemoSession]);

  const deactivateDemo = useCallback(async () => {
    sessionStorage.removeItem(PENDING_FLAG);
    if (isDemoUser) {
      await supabase.auth.signOut();
    }
  }, [isDemoUser]);

  const openGate = useCallback((reason: GateState["reason"]) => {
    setGate({ open: true, reason });
  }, []);
  const closeGate = useCallback(() => setGate({ open: false, reason: null }), []);

  const value: DemoModeContextValue = {
    isDemo,
    isActivatingDemo: activating || (!loading && !user && wantsDemo && !demoActivationError),
    demoActivationError,
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
      isActivatingDemo: false,
      demoActivationError: null,
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
