import { Banner } from "@/components/ui/Banner";
import { MusicCard } from "@/components/music/MusicCard";
import { Download } from "lucide-react";
import { useDownloads } from "@/hooks/useFavorites";
import { MusicGridSkeleton } from "@/components/ui/Skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const DownloadsPage = () => {
  const { data: downloads, isLoading, error, refetch } = useDownloads();

  console.log("[Downloads:render]", { count: downloads?.length, isLoading });

  return (
    <div className="space-y-8">
      <Banner title="Downloads" subtitle="Músicas baixadas para ouvir offline." />

      {error && <ErrorState message="Erro ao carregar downloads." onRetry={() => refetch()} />}

      {isLoading && <MusicGridSkeleton count={6} />}

      {!isLoading && !error && (downloads?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {downloads!.map((d: any) => (
            <MusicCard
              key={d.id}
              id={d.musicas.id}
              title={d.musicas.title}
              artist={d.musicas.artist}
              coverUrl={d.musicas.cover_url}
              fileUrl={d.musicas.file_url}
              driveId={d.musicas.drive_id}
            />
          ))}
        </div>
      ) : !isLoading && !error ? (
        <EmptyState icon={Download} title="Nenhum download disponível." description="Baixe músicas para ouvir offline." />
      ) : null}
    </div>
  );
};

export default DownloadsPage;
