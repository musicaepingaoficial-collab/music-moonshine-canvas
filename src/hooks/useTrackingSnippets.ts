import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrackingSnippet {
  id: string;
  name: string;
  code: string;
  placement: "head" | "body_start";
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const TABLE = "tracking_snippets";

export function useTrackingSnippets() {
  return useQuery<TrackingSnippet[]>({
    queryKey: ["tracking-snippets", "all"],
    queryFn: async () => {
      const { data, error } = await (supabase.from(TABLE as any) as any)
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrackingSnippet[];
    },
    staleTime: 30_000,
  });
}

export function usePublicTrackingSnippets() {
  return useQuery<TrackingSnippet[]>({
    queryKey: ["tracking-snippets", "public"],
    queryFn: async () => {
      const { data, error } = await (supabase.from(TABLE as any) as any)
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrackingSnippet[];
    },
    staleTime: 5 * 60_000,
  });
}

type SnippetInput = Pick<TrackingSnippet, "name" | "code" | "placement" | "enabled" | "sort_order">;

export function useCreateSnippet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<SnippetInput>) => {
      const { error } = await (supabase.from(TABLE as any) as any).insert(values);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracking-snippets"] }),
  });
}

export function useUpdateSnippet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; values: Partial<SnippetInput> }) => {
      const { error } = await (supabase.from(TABLE as any) as any)
        .update(input.values)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracking-snippets"] }),
  });
}

export function useDeleteSnippet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(TABLE as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracking-snippets"] }),
  });
}
