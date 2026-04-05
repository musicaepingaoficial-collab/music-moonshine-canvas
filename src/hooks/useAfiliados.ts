import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useUser";
import type { Afiliado } from "@/types/database";
import { toast } from "sonner";

export function useAfiliado() {
  const { user } = useAuth();

  return useQuery<Afiliado | null>({
    queryKey: ["afiliado", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase.from("afiliados" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Afiliado | null;
    },
    enabled: !!user,
  });
}

export function useGenerateAffiliateLink() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliates`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session!.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: "generate-link" }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Falha ao gerar link");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["afiliado"] });
      toast.success("Link de afiliado gerado!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useIndicacoes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["indicacoes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: afiliado } = await (supabase.from("afiliados" as any) as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!afiliado) return [];
      const { data, error } = await (supabase.from("indicacoes" as any) as any)
        .select("*")
        .eq("afiliado_id", afiliado.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}
