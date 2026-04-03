import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Musica } from "@/types/database";

export interface Repertorio {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  user_id: string | null;
  created_at: string;
}

export interface RepertorioWithCount extends Repertorio {
  musica_count: number;
  total_size: number;
}

export async function uploadRepertorioCover(file: File, repertorioId: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${repertorioId}.${ext}`;

  const { error } = await supabase.storage
    .from("repertorio-covers")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;

  const { data } = supabase.storage.from("repertorio-covers").getPublicUrl(path);
  // Add cache-buster to force reload after update
  return `${data.publicUrl}?t=${Date.now()}`;
}

export function useRepertorios() {
  return useQuery<RepertorioWithCount[]>({
    queryKey: ["repertorios"],
    queryFn: async () => {
      console.log("[Repertorios:fetch]");
      const { data, error } = await supabase
        .from("repertorios")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const withCounts = await Promise.all(
        (data ?? []).map(async (r: Repertorio) => {
          const { data: rmData } = await supabase
            .from("repertorio_musicas")
            .select("musica_id, musicas(file_size)")
            .eq("repertorio_id", r.id);
          const count = rmData?.length ?? 0;
          const totalSize = (rmData ?? []).reduce((sum: number, rm: any) => {
            return sum + (rm.musicas?.file_size || 0);
          }, 0);
          return { ...r, musica_count: count, total_size: totalSize } as RepertorioWithCount;
        })
      );
      return withCounts;
    },
  });
}

export function useRepertorioMusicas(repertorioId: string | undefined) {
  return useQuery<Musica[]>({
    queryKey: ["repertorio-musicas", repertorioId],
    queryFn: async () => {
      if (!repertorioId) return [];
      console.log("[RepertorioMusicas:fetch]", repertorioId);
      const { data, error } = await supabase
        .from("repertorio_musicas")
        .select("musica_id, musicas(*)")
        .eq("repertorio_id", repertorioId);
      if (error) throw error;
      return (data ?? []).map((rm: any) => rm.musicas as Musica);
    },
    enabled: !!repertorioId,
  });
}

export function useCreateRepertorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; coverFile?: File }) => {
      console.log("[Repertorio:create]", input.name);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("repertorios")
        .insert({ name: input.name, description: input.description ?? null, user_id: user.id })
        .select()
        .single();
      if (error) throw error;

      if (input.coverFile) {
        const coverUrl = await uploadRepertorioCover(input.coverFile, data.id);
        await supabase.from("repertorios").update({ cover_url: coverUrl }).eq("id", data.id);
        return { ...data, cover_url: coverUrl };
      }

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["repertorios"] }),
  });
}

export function useUpdateRepertorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ repertorioId, name, description, coverFile }: { repertorioId: string; name?: string; description?: string; coverFile?: File }) => {
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;

      if (coverFile) {
        const coverUrl = await uploadRepertorioCover(coverFile, repertorioId);
        updates.cover_url = coverUrl;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("repertorios").update(updates).eq("id", repertorioId);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["repertorios"] });
      qc.invalidateQueries({ queryKey: ["repertorio", vars.repertorioId] });
    },
  });
}

export function useUpdateRepertorioCover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ repertorioId, coverFile }: { repertorioId: string; coverFile: File }) => {
      const coverUrl = await uploadRepertorioCover(coverFile, repertorioId);
      const { error } = await supabase
        .from("repertorios")
        .update({ cover_url: coverUrl })
        .eq("id", repertorioId);
      if (error) throw error;
      return coverUrl;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["repertorios"] });
      qc.invalidateQueries({ queryKey: ["repertorio", vars.repertorioId] });
    },
  });
}

export function useDeleteRepertorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      console.log("[Repertorio:delete]", id);
      const { error } = await supabase.from("repertorios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["repertorios"] }),
  });
}

export function useAddMusicasToRepertorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ repertorioId, musicaIds }: { repertorioId: string; musicaIds: string[] }) => {
      console.log("[Repertorio:addMusicas]", { repertorioId, count: musicaIds.length });
      const rows = musicaIds.map((musica_id) => ({ repertorio_id: repertorioId, musica_id }));
      const { error } = await supabase.from("repertorio_musicas").upsert(rows, { onConflict: "repertorio_id,musica_id" });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["repertorio-musicas", vars.repertorioId] });
      qc.invalidateQueries({ queryKey: ["repertorios"] });
    },
  });
}

export function useRemoveMusicaFromRepertorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ repertorioId, musicaId }: { repertorioId: string; musicaId: string }) => {
      console.log("[Repertorio:removeMusica]", { repertorioId, musicaId });
      const { error } = await supabase
        .from("repertorio_musicas")
        .delete()
        .eq("repertorio_id", repertorioId)
        .eq("musica_id", musicaId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["repertorio-musicas", vars.repertorioId] });
      qc.invalidateQueries({ queryKey: ["repertorios"] });
    },
  });
}

export function useRemoveMusicasFromRepertorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ repertorioId, musicaIds }: { repertorioId: string; musicaIds: string[] }) => {
      console.log("[Repertorio:removeMusicas]", { repertorioId, count: musicaIds.length });
      const { error } = await supabase
        .from("repertorio_musicas")
        .delete()
        .eq("repertorio_id", repertorioId)
        .in("musica_id", musicaIds);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["repertorio-musicas", vars.repertorioId] });
      qc.invalidateQueries({ queryKey: ["repertorios"] });
    },
  });
}
