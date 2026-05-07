import { useState, useMemo } from "react";
import { Banner } from "@/components/ui/Banner";
import { MusicCard } from "@/components/music/MusicCard";
import { motion } from "framer-motion";
import { useMusicas } from "@/hooks/useMusics";
import { MusicGridSkeleton } from "@/components/ui/Skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/input";
import { Search, Music, X, ListPlus } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/stores/playerStore";
import { toast } from "sonner";

const TodasMusicasPage = () => {
  const { data: musicas, isLoading, error, refetch } = useMusicas();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMusicas = useMemo(() => {
    if (!musicas) return [];
    if (!searchTerm.trim()) return musicas;
    
    const term = searchTerm.toLowerCase();
    return musicas.filter(
      (m) =>
        m.title.toLowerCase().includes(term) ||
        m.artist.toLowerCase().includes(term)
    );
  }, [musicas, searchTerm]);

  const { paginatedItems, PaginationComponent } = usePagination(filteredMusicas, 24);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Banner 
          title="Todas as Músicas" 
          subtitle={`${musicas?.length ?? 0} músicas disponíveis na coleção.`} 
        />
        {!isLoading && !error && filteredMusicas.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const addToQueue = usePlayerStore.getState().addToQueue;
              filteredMusicas.forEach(m => addToQueue(m));
              toast.success(`${filteredMusicas.length} músicas adicionadas à lista de reprodução`);
            }}
          >
            <ListPlus className="mr-2 h-4 w-4" />
            Adicionar tudo à lista
          </Button>
        )}
      </div>

      <div className="relative max-w-md mx-auto sm:mx-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar nesta página..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <ErrorState
          message="Erro ao carregar músicas."
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <MusicGridSkeleton count={12} />
      ) : paginatedItems.length > 0 ? (
        <>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.02 } } }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          >
            {paginatedItems.map((t) => (
              <motion.div
                key={t.id}
                variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
              >
                <MusicCard 
                  id={t.id} 
                  title={t.title} 
                  artist={t.artist} 
                  coverUrl={t.cover_url} 
                  fileUrl={t.file_url} 
                  driveId={t.drive_id} 
                  queueContext={filteredMusicas}
                />
              </motion.div>
            ))}
          </motion.div>
          <PaginationComponent />
        </>
      ) : (
        <EmptyState 
          icon={Music} 
          title={searchTerm ? "Nenhuma música encontrada." : "Nenhuma música disponível ainda."} 
          description={searchTerm ? "Tente buscar por outro termo." : "Novas músicas serão adicionadas em breve."}
        />
      )}
    </div>
  );
};

export default TodasMusicasPage;