import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile, Assinatura } from "@/types/database";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
  return useQuery<boolean>({
    queryKey: ["is-admin", userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await (supabase.rpc as any)("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (error) return false;
      return Boolean(data);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
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
  const { data: assinatura, isLoading: subLoading } = useAssinatura(user?.id);
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin(user?.id);

  const notExpired =
    !!assinatura &&
    (!assinatura.expires_at || new Date(assinatura.expires_at) > new Date());

  return {
    hasAccess: Boolean(isAdmin) || notExpired,
    isLoading: subLoading || adminLoading,
    isAdmin: Boolean(isAdmin),
    plan: assinatura?.plan ?? null,
  };
}
