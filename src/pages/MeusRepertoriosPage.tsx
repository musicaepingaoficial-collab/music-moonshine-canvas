import { Link } from "react-router-dom";
import { Banner } from "@/components/ui/Banner";
import { useRepertorios } from "@/hooks/useRepertorios";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { FolderOpen, Star } from "lucide-react";
import type { RepertorioWithCount } from "@/hooks/useRepertorios";
import { Badge } from "@/components/ui/badge";
import { RepertorioBadge } from "@/components/repertorios/RepertorioBadge";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i >= 3 ? 2 : 0)} ${units[i]}`;
}

const MeusRepertoriosPage = () => {
  const { data: repertorios, isLoading } = useRepertorios();

  return (
    <div className="space-y-8">
      <Banner title="Meus Repertórios" subtitle="Explore coleções de músicas organizadas." />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-md" />
          ))}
        </div>
      ) : (repertorios?.length ?? 0) > 0 ? (
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

          {/* Todos os Repertórios */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {repertorios?.some(r => r.featured) ? "Outros Repertórios" : "Todos os Repertórios"}
            </h2>
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
                  
                  {/* Overlay degrade estilo Netflix */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-100 pointer-events-none" />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
                    <p className="text-sm font-bold text-white line-clamp-2 leading-tight drop-shadow-md">
                      {rep.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-green-400 drop-shadow-sm">
                          {rep.musica_count} músicas
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : (
        <EmptyState icon={FolderOpen} title="Nenhum repertório criado ainda." />
      )}
    </div>
  );
};

export default MeusRepertoriosPage;
