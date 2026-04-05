import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useUser";

export interface Notificacao {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export function useNotificacoes() {
  const { user } = useAuth();

  return useQuery<Notificacao[]>({
    queryKey: ["notificacoes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase.from("notificacoes" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as Notificacao[]) ?? [];
    },
    enabled: !!user,
  });
}

export function useUnreadCount() {
  const { data: notificacoes } = useNotificacoes();
  return notificacoes?.filter((n) => !n.read).length ?? 0;
}

export function useMarkAllRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      await (supabase.from("notificacoes" as any) as any)
        .update({ read: true })
        .eq("read", false)
        .or(`user_id.eq.${user.id},user_id.is.null`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    },
  });
}
