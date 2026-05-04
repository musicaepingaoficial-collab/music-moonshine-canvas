import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile, Assinatura } from "@/types/database";
// Extend profile type locally if it doesn't have has_discografias yet
interface ExtendedProfile extends Profile {
  has_discografias?: boolean;
}
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
      
      console.log("[useIsAdmin] Checking role for:", userId);
      
      // Try RPC first (primary method)
      const { data, error } = await (supabase.rpc as any)("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      
      if (error) {
        console.error("[useIsAdmin] RPC error, trying fallback select:", error);
        
        // Fallback to direct select if RPC fails (resilience)
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
          
        if (fallbackError) {
          console.error("[useIsAdmin] Fallback select also failed:", fallbackError);
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

export function useAssinatura(userId?: string | null) {
  return useQuery<Assinatura | null>({
    queryKey: ["assinatura", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await (supabase.from("assinaturas" as any) as any)
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data as Assinatura | null;
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
  const hasDiscografiasAccess = Boolean(isAdmin) || isVitalicio || !!profile?.has_discografias;

  return {
    hasAccess: Boolean(isAdmin) || notExpired,
    hasDiscografiasAccess,
    isLoading: subLoading || adminLoading,
    isAdmin: Boolean(isAdmin),
    plan: assinatura?.plan ?? null,
  };
}
