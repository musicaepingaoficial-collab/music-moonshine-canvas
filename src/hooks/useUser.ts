import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile, Assinatura } from "@/types/database";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      
      // Invalidate queries on key auth events to ensure fresh permissions
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        queryClient.invalidateQueries({ queryKey: ["is-admin"] });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["assinatura"] });
      }
      
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return { user, loading };
}

export function useProfile(userId?: string | null) {
  return useQuery<Profile | null>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await (supabase.from("profiles" as any) as any)
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!userId,
  });
}

export function useIsAdmin(userId?: string | null) {
  return useQuery({
    queryKey: ["is-admin", userId],
    queryFn: async () => {
      if (!userId) return false;

      // Try RPC first (primary method)
      const { data, error } = await (supabase.rpc as any)("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (error) {
        // Fallback to direct select if RPC fails (resilience)
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();

        if (fallbackError) {
          throw fallbackError; // React Query will retry
        }

        return !!fallbackData;
      }

      return Boolean(data);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    retry: 2,
    retryDelay: (attempt) => Math.min(attempt > 1 ? 2000 : 1000, 3000),
  });
}

const PLAN_PRIORITY: Record<string, number> = {
  vitalicio: 4,
  anual: 3,
  trimestral: 2,
  mensal: 1,
};

export function useAssinatura(userId?: string | null) {
  return useQuery<Assinatura | null>({
    queryKey: ["assinatura", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await (supabase.from("assinaturas" as any) as any)
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active");
      if (error) throw error;
      const rows = ((data ?? []) as Assinatura[]).filter(
        (a) => !a.expires_at || new Date(a.expires_at) > new Date()
      );
      if (rows.length === 0) return null;
      rows.sort((a, b) => {
        const pa = PLAN_PRIORITY[a.plan as string] ?? 0;
        const pb = PLAN_PRIORITY[b.plan as string] ?? 0;
        if (pa !== pb) return pb - pa;
        const ea = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
        const eb = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
        return eb - ea;
      });
      return rows[0];
    },
    enabled: !!userId,
  });
}


/**
 * Returns true when the user has an active, non-expired subscription
 * OR is an admin. Use this as the gate for download actions.
 */
export function useHasActiveSubscription() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: assinatura, isLoading: subLoading } = useAssinatura(user?.id);
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin(user?.id);

  const notExpired =
    !!assinatura &&
    (!assinatura.expires_at || new Date(assinatura.expires_at) > new Date());

  const isVitalicio = assinatura?.plan === "vitalicio";
  const isAnual = assinatura?.plan === "anual";
  
  // Only vitalicio or anual plans include discografias by default
  const planIncludesDiscografias = (isVitalicio || isAnual) && notExpired;
  
  // Access is granted if they are admin, OR their plan includes it, OR they have the manual override flag
  const hasDiscografiasAccess = Boolean(isAdmin) || planIncludesDiscografias || !!profile?.has_discografias;

  return {
    hasAccess: Boolean(isAdmin) || notExpired,
    hasDiscografiasAccess,
    isLoading: subLoading || adminLoading,
    isAdmin: Boolean(isAdmin),
    plan: assinatura?.plan ?? null,
    user,
  };
}
