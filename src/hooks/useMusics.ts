import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MusicaWithCategoria, Categoria } from "@/types/database";

// Natural sort: "2 - Música" antes de "10 - Música".
// Algumas importações antigas salvaram o número da faixa em `artist`, então a ordem
// precisa considerar `title` primeiro e, se não houver número nele, `artist`.
const naturalCollator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });
const getLeadingTrackNumber = (track: MusicaWithCategoria) => {
  const fromTitle = track.title?.match(/^\s*(\d{1,4})(?:[\s.\-_–—)]|$)/)?.[1];
  if (fromTitle) return Number(fromTitle);

  const fromArtist = track.artist?.match(/^\s*(\d{1,4})(?:[\s.\-_–—)]|$)/)?.[1];
  return fromArtist ? Number(fromArtist) : null;
};

const sortTracksNatural = (list: MusicaWithCategoria[]): MusicaWithCategoria[] =>
  [...list].sort((a, b) => {
    const sa = (a.subfolder ?? "").toString();
    const sb = (b.subfolder ?? "").toString();
    const bySub = naturalCollator.compare(sa, sb);
    if (bySub !== 0) return bySub;

    const numberA = getLeadingTrackNumber(a);
    const numberB = getLeadingTrackNumber(b);
    if (numberA !== null && numberB !== null && numberA !== numberB) return numberA - numberB;
    if (numberA !== null && numberB === null) return -1;
    if (numberA === null && numberB !== null) return 1;

    return naturalCollator.compare(a.title ?? "", b.title ?? "");
  });


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
      
      return sortTracksNatural(allData);
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
      const allData: MusicaWithCategoria[] = [];
      let offset = 0;
      const limit = 1000;

      while (true) {
        const { data, error } = await (supabase.from("musicas" as any) as any)
          .select("*, categorias(*)")
          .eq("categoria_id", cat.id)
          .order("subfolder", { ascending: true, nullsFirst: false })
          .order("title", { ascending: true })
          .range(offset, offset + limit - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allData.push(...(data as MusicaWithCategoria[]));
        if (data.length < limit) break;
        offset += limit;
      }

      return sortTracksNatural(allData);

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
