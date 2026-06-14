import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MILESTONES = [7, 5, 3, 1] as const;
export type Milestone = (typeof MILESTONES)[number];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dismissKey(milestone: Milestone) {
  return `renewal_reminder_dismissed_${milestone}_${todayKey()}`;
}

export function useRenewalReminder() {
  const [dismissedTick, setDismissedTick] = useState(0);

  const { data: assinatura } = useQuery({
    queryKey: ["assinatura", "renewal"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("assinaturas")
        .select("plan, status, expires_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  let milestone: Milestone | null = null;
  let daysLeft: number | null = null;

  if (assinatura?.expires_at && assinatura.plan !== "vitalicio") {
    const ms = new Date(assinatura.expires_at).getTime() - Date.now();
    if (ms > 0) {
      const d = Math.ceil(ms / 86400000);
      daysLeft = d;
      const match = MILESTONES.find((m) => m === d);
      if (match) milestone = match;
    }
  }

  const dismissed = milestone
    ? typeof window !== "undefined" && !!localStorage.getItem(dismissKey(milestone))
    : false;

  const dismiss = useCallback(() => {
    if (milestone) {
      localStorage.setItem(dismissKey(milestone), "1");
      setDismissedTick((t) => t + 1);
    }
  }, [milestone]);

  // re-evaluate on focus (day change)
  useEffect(() => {
    const onFocus = () => setDismissedTick((t) => t + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return {
    show: !!milestone && !dismissed,
    milestone,
    daysLeft,
    dismiss,
    _tick: dismissedTick,
  };
}
