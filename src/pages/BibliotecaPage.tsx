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
  const { data: musicas, isLoading: loadingMusicas, error: errorMusicas, refetch: refetchMusicas } = useMusicas();
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
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-36 shrink-0 rounded-xl" />
            ))}
          </div>
        ) : (repertorios?.length ?? 0) > 0 ? (
          <div className="relative -mx-2">
            <div className="flex gap-4 overflow-x-auto px-2 pb-4 scrollbar-hide snap-x snap-mandatory">
              {repertorios!.map((rep) => {
                const sizeGB = rep.total_size ? (rep.total_size / (1024 * 1024 * 1024)).toFixed(2) : "0.00";
                return (
                  <Link
                    key={rep.id}
                    to={`/repertorio/${rep.id}`}
                    className="group relative shrink-0 snap-start w-36 sm:w-44 rounded-xl overflow-hidden bg-card transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/10"
                  >
                    {/* Cover */}
                    <div className="aspect-square w-full bg-muted relative overflow-hidden">
                      {rep.cover_url ? (
                        <img
                          src={rep.cover_url}
                          alt={rep.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <FolderOpen className="h-10 w-10 text-primary/40" />
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      {/* Info on bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="font-bold text-white text-sm leading-tight truncate">{rep.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-white/70 flex items-center gap-1">
                            <Music2 className="h-3 w-3" />
                            {rep.musica_count}
                          </span>
                          <span className="text-[11px] text-white/70">{sizeGB} GB</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
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

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Todas as músicas</h2>
        {loadingMusicas ? (
          <MusicGridSkeleton count={8} />
        ) : (musicas?.length ?? 0) > 0 ? (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          >
            {musicas!.map((t) => (
              <motion.div
                key={t.id}
                variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
              >
                <MusicCard id={t.id} title={t.title} artist={t.artist} coverUrl={t.cover_url} fileUrl={t.file_url} driveId={t.drive_id} />
              </motion.div>
            ))}
          </motion.div>
        ) : !errorMusicas ? (
          <EmptyState icon={Library} title="Nenhuma música disponível ainda." />
        ) : null}
      </section>
    </div>
  );
};

export default BibliotecaPage;
