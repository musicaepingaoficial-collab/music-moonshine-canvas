import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useAssinatura } from "@/hooks/useUser";
import { supabase } from "@/integrations/supabase/client";

const DEMO_LIMIT = 5;

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
  const navigate = useNavigate();
  const [gate, setGate] = useState<GateState>({ open: false, reason: null });

  // "trial" = usuário real cadastrado pelo fluxo /login?intent=trial, ainda sem assinatura
  const isTrialUser =
    (user as any)?.user_metadata?.trial_user === true ||
    (user as any)?.app_metadata?.trial_user === true;

  const isDemoUser =
    !!(user as any)?.is_anonymous ||
    (user as any)?.app_metadata?.demo_user === true ||
    (user as any)?.user_metadata?.demo_user === true ||
    (isTrialUser && !isLoadingAssinatura && !assinatura);

  const isDemo = !loading && isDemoUser;

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

  // Trial agora exige cadastro com senha — ativar redireciona para a página de cadastro.
  const activateDemo = useCallback(async () => {
    navigate("/login?intent=trial");
  }, [navigate]);

  const deactivateDemo = useCallback(async () => {
    // Mantém compat: só desloga se for de fato uma sessão anônima.
    if ((user as any)?.is_anonymous) {
      await supabase.auth.signOut();
    }
  }, [user]);

  const openGate = useCallback((reason: GateState["reason"]) => {
    setGate({ open: true, reason });
  }, []);
  const closeGate = useCallback(() => setGate({ open: false, reason: null }), []);

  const value: DemoModeContextValue = {
    isDemo,
    isActivatingDemo: false,
    demoActivationError: null,
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
