import { useState, useEffect, useMemo } from "react";
import { Banner } from "@/components/ui/Banner";
import { MusicCard } from "@/components/music/MusicCard";
import { MusicListRow } from "@/components/music/MusicListRow";
import { Link } from "react-router-dom";
import { useCategorias } from "@/hooks/useMusics";
import { useRepertorios } from "@/hooks/useRepertorios";
import { MusicGridSkeleton } from "@/components/ui/Skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AdBanner } from "@/components/ads/AdBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderOpen, Search, X, Star, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RepertorioBadge } from "@/components/repertorios/RepertorioBadge";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerStore } from "@/stores/playerStore";
import type { Musica } from "@/types/database";

const BibliotecaPage = () => {
  const { data: categorias, isLoading: loadingCats, error: errorCats, refetch: refetchCats } = useCategorias();
  const { data: repertorios, isLoading: loadingReps } = useRepertorios();
  const play = usePlayerStore((s) => s.play);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [results, setResults] = useState<Musica[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Query
  useEffect(() => {
    if (debouncedTerm.length < 2) {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    setSearchError(null);
    const safe = debouncedTerm.replace(/[%,]/g, " ");
    (supabase.from("musicas" as any) as any)
      .select("*")
      .or(`title.ilike.%${safe}%,artist.ilike.%${safe}%`)
      .order("title", { ascending: true })
      .limit(60)
      .then(({ data, error }: any) => {
        if (cancelled) return;
        if (error) {
          console.error("[Biblioteca:search]", error);
          setSearchError(error.message || "Erro na busca");
          setResults([]);
        } else {
          setResults((data || []) as Musica[]);
        }
        setIsSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedTerm]);

  const isSearchMode = debouncedTerm.length >= 2;

  const handlePlayAll = () => {
    if (results.length === 0) return;
    play(results[0], results);
  };

  return (
    <div className="space-y-8">
      <Banner title="Biblioteca" subtitle="Explore toda a coleção de músicas." />

      {/* Barra de busca */}
      <div className="mx-auto w-full max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar músicas, artistas..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-11 rounded-full border-border/60 bg-secondary pl-10 pr-10 text-sm"
            autoFocus
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {errorCats && !isSearchMode && (
        <ErrorState
          message="Erro ao carregar biblioteca."
          onRetry={() => { refetchCats(); }}
        />
      )}

      {/* Modo busca */}
      {isSearchMode ? (
        <section>
          {isSearching ? (
            <MusicGridSkeleton count={12} />
          ) : searchError ? (
            <ErrorState message={searchError} onRetry={() => setDebouncedTerm((t) => t)} />
          ) : results.length === 0 ? (
            <EmptyState
              icon={Search}
              title={`Nenhuma música encontrada para "${debouncedTerm}"`}
              description="Tente buscar por outro termo, artista ou palavra-chave."
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-lg font-semibold text-foreground">
                  {results.length} resultado{results.length === 1 ? "" : "s"} para "{debouncedTerm}"
                </h2>
                <Button onClick={handlePlayAll} size="sm" className="gap-2 rounded-full">
                  <Play className="h-4 w-4 fill-current" />
                  Tocar tudo
                </Button>
              </div>
              <div className="divide-y divide-border/40 rounded-lg border border-border/40 bg-card/30">
                {results.map((m, idx) => (
                  <MusicListRow
                    key={m.id}
                    musica={m}
                    queueContext={results}
                    index={idx + 1}
                  />
                ))}
              </div>

            </>
          )}
        </section>
      ) : (
        <>
          {/* Repertórios em Destaque */}
          {repertorios?.some(r => r.featured) && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                <h2 className="text-lg font-bold text-foreground">Destaques</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {repertorios.filter(r => r.featured).map((rep) => (
                  <Link
                    key={rep.id}
                    to={`/repertorio/${rep.id}`}
                    className="group relative aspect-[2/3] w-full overflow-hidden rounded-md bg-card transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl hover:z-10 ring-2 ring-amber-500/20"
                  >
                    <RepertorioBadge text={rep.badge_text} bgColor={rep.badge_bg_color} textColor={rep.badge_text_color} />
                    {rep.cover_url ? (
                      <img
                        src={rep.cover_url}
                        alt={rep.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                        <FolderOpen className="h-12 w-12 opacity-20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
                      <p className="text-sm font-bold text-white line-clamp-2 leading-tight drop-shadow-md">
                        {rep.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-medium text-green-400 drop-shadow-sm">
                          {rep.musica_count} músicas
                        </span>
                        <Badge variant="secondary" className="bg-amber-500/90 text-white text-[8px] h-4 px-1 border-0">
                          DESTAQUE
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Repertórios — Netflix style */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Todos os Repertórios</h2>
            {loadingReps ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[2/3] w-full rounded-md" />
                ))}
              </div>
            ) : (repertorios?.length ?? 0) > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {repertorios!.filter(r => !r.featured).map((rep) => (
                  <Link
                    key={rep.id}
                    to={`/repertorio/${rep.id}`}
                    className="group relative aspect-[2/3] w-full overflow-hidden rounded-md bg-card transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:z-10"
                  >
                    <RepertorioBadge text={rep.badge_text} bgColor={rep.badge_bg_color} textColor={rep.badge_text_color} />
                    {rep.cover_url ? (
                      <img
                        src={rep.cover_url}
                        alt={rep.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                        <FolderOpen className="h-12 w-12 opacity-20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
                      <p className="text-sm font-bold text-white line-clamp-2 leading-tight drop-shadow-md">
                        {rep.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-medium text-green-400 drop-shadow-sm">
                          {rep.musica_count} músicas
                        </span>
                        <span className="text-[10px] border border-white/30 px-1 rounded text-white/70">
                          HD
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon={FolderOpen} title="Nenhum repertório disponível." />
            )}
          </section>

          <AdBanner position="inline" />
        </>
      )}
    </div>
  );
};

export default BibliotecaPage;
