import { Banner } from "@/components/ui/Banner";
import { MusicCard } from "@/components/music/MusicCard";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMusicas, useCategorias } from "@/hooks/useMusics";
import { useRepertorios } from "@/hooks/useRepertorios";
import { MusicGridSkeleton, CategorySkeleton } from "@/components/ui/Skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AdBanner } from "@/components/ads/AdBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { Library, FolderOpen, Music2, ChevronRight } from "lucide-react";

const BibliotecaPage = () => {
  const { data: categorias, isLoading: loadingCats, error: errorCats, refetch: refetchCats } = useCategorias();
  const { data: repertorios, isLoading: loadingReps } = useRepertorios();

  console.log("[Biblioteca:render]", { cats: categorias?.length, musicas: musicas?.length, reps: repertorios?.length });

  return (
    <div className="space-y-8">
      <Banner title="Biblioteca" subtitle="Explore toda a coleção de músicas." />

      {(errorCats || errorMusicas) && (
        <ErrorState
          message="Erro ao carregar biblioteca."
          onRetry={() => { refetchCats(); refetchMusicas(); }}
        />
      )}

      {/* Repertórios — Netflix style */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Repertórios</h2>
        {loadingReps ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-full rounded-md" />
            ))}
          </div>
        ) : (repertorios?.length ?? 0) > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {repertorios!.map((rep) => (
              <Link
                key={rep.id}
                to={`/repertorio/${rep.id}`}
                className="group relative aspect-[2/3] w-full overflow-hidden rounded-md bg-card transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:z-10"
              >
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
                
                {/* Overlay degrade estilo Netflix */}
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

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Categorias</h2>
        {loadingCats ? (
          <CategorySkeleton />
        ) : (categorias?.length ?? 0) > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categorias!.map((cat) => (
              <Link
                key={cat.id}
                to={`/categoria/${cat.slug}`}
                className="group rounded-xl bg-card p-4 transition-all duration-200 hover:bg-accent hover:scale-[1.02]"
              >
                <p className="font-semibold text-foreground">{cat.name}</p>
                <p className="text-xs text-muted-foreground">{cat.count} músicas</p>
              </Link>
            ))}
          </div>
        ) : !errorCats ? (
          <EmptyState icon={Library} title="Nenhuma categoria disponível." />
        ) : null}
      </section>

      <AdBanner position="inline" />

    </div>
  );
};

export default BibliotecaPage;
