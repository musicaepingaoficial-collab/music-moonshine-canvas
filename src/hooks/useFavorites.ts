import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useUser";
import type { Favorito } from "@/types/database";
import { toast } from "sonner";

export function useFavoritos() {
  const { user } = useAuth();

  return useQuery<Favorito[]>({
    queryKey: ["favoritos", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase.from("favoritos" as any) as any)
        .select("*, musicas(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Favorito[];
    },
    enabled: !!user,
  });
}

export function useToggleFavorito() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (musicaId: string) => {
      if (!user) throw new Error("Não autenticado");

      const { data: existing } = await (supabase.from("favoritos" as any) as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("musica_id", musicaId)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase.from("favoritos" as any) as any).delete().eq("id", existing.id);
        if (error) throw error;
        return { action: "removed" as const };
      } else {
        const { error } = await (supabase.from("favoritos" as any) as any).insert({ user_id: user.id, musica_id: musicaId });
        if (error) throw error;
        return { action: "added" as const };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["favoritos"] });
      toast.success(result.action === "added" ? "Adicionado aos favoritos" : "Removido dos favoritos");
    },
    onError: () => {
      toast.error("Erro ao atualizar favoritos");
    },
  });
}

export function useAddDownload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (musicaId: string) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await (supabase.from("downloads" as any) as any).insert({ user_id: user.id, musica_id: musicaId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      toast.success("Download registrado");
    },
  });
}

export function useDownloads() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["downloads", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase.from("downloads" as any) as any)
        .select("*, musicas(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}
