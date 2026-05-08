import { Banner } from "@/components/ui/Banner";
import { MusicCard } from "@/components/music/MusicCard";
import { Download, ListPlus } from "lucide-react";
import { useDownloads } from "@/hooks/useFavorites";
import { MusicGridSkeleton } from "@/components/ui/Skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/stores/playerStore";
import { toast } from "sonner";

const DownloadsPage = () => {
  const { data: downloads, isLoading, error, refetch } = useDownloads();

  console.log("[Downloads:render]", { count: downloads?.length, isLoading });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Banner title="Downloads" subtitle="Músicas baixadas para ouvir offline." />
        {!isLoading && !error && (downloads?.length ?? 0) > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:bg-destructive/10 border-destructive/20"
            onClick={() => {
              if (confirm("Deseja realmente limpar toda a lista de reprodução atual?")) {
                usePlayerStore.getState().clearQueue();
                toast.success("Lista de reprodução limpa");
              }
            }}
          >
            Limpar lista
          </Button>
        )}
      </div>

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
              queueContext={downloads!.map((item: any) => item.musicas)}
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
