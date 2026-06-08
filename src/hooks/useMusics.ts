import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MusicaWithCategoria, Categoria } from "@/types/database";

export function useMusicas() {
  return useQuery<MusicaWithCategoria[]>({
    queryKey: ["musicas"],
    queryFn: async () => {
      const allData: MusicaWithCategoria[] = [];
      let offset = 0;
      const limit = 1000;
      
      while (true) {
        const { data, error } = await (supabase.from("musicas" as any) as any)
          .select("*, categorias(*)")
          .order("title", { ascending: true })
          .range(offset, offset + limit - 1);

          
        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allData.push(...(data as MusicaWithCategoria[]));
        if (data.length < limit) break;
        offset += limit;
      }
      
      return allData;
    },
  });
}

export function useMusicasByCategoria(slug: string | undefined) {
  return useQuery<MusicaWithCategoria[]>({
    queryKey: ["musicas", "categoria", slug],
    queryFn: async () => {
      if (!slug) return [];
      const { data: cat } = await (supabase.from("categorias" as any) as any)
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!cat) return [];
      const { data, error } = await (supabase.from("musicas" as any) as any)
        .select("*, categorias(*)")
        .eq("categoria_id", cat.id)
        .order("subfolder", { ascending: true, nullsFirst: false })
        .order("title", { ascending: true });

      if (error) throw error;
      return (data ?? []) as MusicaWithCategoria[];
    },
    enabled: !!slug,
  });
}

export function useCategorias() {
  return useQuery<(Categoria & { count: number })[]>({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data: cats, error } = await (supabase.from("categorias" as any) as any)
        .select("*")
        .order("name");
      if (error) throw error;
      const catsWithCount = await Promise.all(
        (cats ?? []).map(async (cat: any) => {
          const { count } = await (supabase.from("musicas" as any) as any)
            .select("*", { count: "exact", head: true })
            .eq("categoria_id", cat.id);
          return { ...cat, count: count ?? 0 } as Categoria & { count: number };
        })
      );
      return catsWithCount;
    },
  });
}
