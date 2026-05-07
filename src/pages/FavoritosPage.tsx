import { Banner } from "@/components/ui/Banner";
import { MusicCard } from "@/components/music/MusicCard";
import { Heart, ListPlus } from "lucide-react";
import { useFavoritos } from "@/hooks/useFavorites";
import { MusicGridSkeleton } from "@/components/ui/Skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/stores/playerStore";
import { toast } from "sonner";

const FavoritosPage = () => {
  const { data: favoritos, isLoading, error, refetch } = useFavoritos();

  console.log("[Favoritos:render]", { count: favoritos?.length, isLoading });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Banner title="Favoritos" subtitle="Suas músicas mais queridas." />
        {!isLoading && !error && (favoritos?.length ?? 0) > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const addToQueue = usePlayerStore.getState().addToQueue;
              favoritos?.forEach(f => addToQueue(f.musicas));
              toast.success(`${favoritos?.length} músicas adicionadas à lista de reprodução`);
            }}
          >
            <ListPlus className="mr-2 h-4 w-4" />
            Adicionar tudo à lista
          </Button>
        )}
      </div>

      {error && <ErrorState message="Erro ao carregar favoritos." onRetry={() => refetch()} />}

      {isLoading && <MusicGridSkeleton count={6} />}

      {!isLoading && !error && (favoritos?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {favoritos!.map((f) => (
            <MusicCard
              key={f.id}
              id={f.musicas.id}
              title={f.musicas.title}
              artist={f.musicas.artist}
              coverUrl={f.musicas.cover_url}
              fileUrl={f.musicas.file_url}
              driveId={f.musicas.drive_id}
              queueContext={favoritos!.map(fav => fav.musicas)}
            />
          ))}
        </div>
      ) : !isLoading && !error ? (
        <EmptyState icon={Heart} title="Nenhum favorito ainda." description="Adicione músicas aos favoritos clicando no ❤️." />
      ) : null}
    </div>
  );
};

export default FavoritosPage;
