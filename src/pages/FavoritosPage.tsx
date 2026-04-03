import { Banner } from "@/components/ui/Banner";
import { MusicCard } from "@/components/music/MusicCard";
import { Heart } from "lucide-react";
import { useFavoritos } from "@/hooks/useFavorites";
import { MusicGridSkeleton } from "@/components/ui/Skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const FavoritosPage = () => {
  const { data: favoritos, isLoading, error, refetch } = useFavoritos();

  console.log("[Favoritos:render]", { count: favoritos?.length, isLoading });

  return (
    <div className="space-y-8">
      <Banner title="Favoritos" subtitle="Suas músicas mais queridas." />

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
