import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/button";
import { MusicGridSkeleton } from "@/components/ui/Skeletons";
import { ErrorState } from "@/components/ui/ErrorState";
import { Play, Download, Heart, ArrowLeft, Loader2, ListPlus } from "lucide-react";
import { usePlayerStore } from "@/stores/playerStore";
import { useToggleFavorito, useFavoritos } from "@/hooks/useFavorites";
import { useHasActiveSubscription } from "@/hooks/useUser";
import { downloadSingle } from "@/services/zipService";
import { toast } from "sonner";
import { AddToRepertorioDialog } from "@/components/music/AddToRepertorioDialog";
import type { Musica } from "@/types/database";

const MusicaPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const play = usePlayerStore((s) => s.play);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const toggleFav = useToggleFavorito();
  const { data: favoritos } = useFavoritos();
  const { hasAccess, isLoading: accessLoading } = useHasActiveSubscription();
  const [downloading, setDownloading] = useState(false);

  const { data: musica, isLoading, error, refetch } = useQuery<Musica>({
    queryKey: ["musica", id],
    queryFn: async () => {
      if (!id) throw new Error("ID não informado");
      const { data, error } = await (supabase.from("musicas" as any) as any)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Musica;
    },
    enabled: !!id,
  });

  const isFavorite = favoritos?.some((f) => f.musicas.id === id);
  const isActive = currentTrack?.id === id && isPlaying;

  const handlePlay = () => {
    if (musica) play(musica);
  };

  const handleDownload = async () => {
    if (accessLoading) return;
    if (!hasAccess) {
      toast.error("Assine um plano para baixar músicas.");
      navigate("/planos");
      return;
    }
    setDownloading(true);
    try {
      await downloadSingle(id!);
      toast.success("Download iniciado");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao baixar música");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) return <div className="p-6"><MusicGridSkeleton count={1} /></div>;
  if (error || !musica) return <ErrorState message="Música não encontrada." onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 md:p-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        {/* Capa */}
        <div className="relative aspect-square w-full max-w-[300px] shrink-0 overflow-hidden rounded-2xl bg-secondary shadow-2xl md:max-w-[350px]">
          {musica.cover_url ? (
            <img
              src={musica.cover_url}
              alt={musica.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Play className="h-20 w-20 opacity-20" />
            </div>
          )}
          {isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="flex gap-1.5">
                <div className="h-8 w-1.5 animate-music-bar-1 bg-primary rounded-full" />
                <div className="h-8 w-1.5 animate-music-bar-2 bg-primary rounded-full" />
                <div className="h-8 w-1.5 animate-music-bar-3 bg-primary rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-6 text-center md:text-left">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">{musica.title}</h1>
            <p className="mt-2 text-lg text-muted-foreground md:text-xl">{musica.artist}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 md:justify-start">
            <Button
              size="lg"
              className="gap-2 rounded-full px-8 h-12 text-base font-semibold transition-all hover:scale-105 active:scale-95"
              onClick={handlePlay}
            >
              <Play className="h-5 w-5 fill-current" />
              {isActive ? "Tocando agora" : "Ouvir agora"}
            </Button>

            <Button
              size="lg"
              variant="secondary"
              className="gap-2 rounded-full px-8 h-12 text-base font-semibold transition-all hover:scale-105 active:scale-95"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              Baixar música
            </Button>
          </div>

          <div className="flex justify-center gap-4 border-t border-border pt-6 md:justify-start">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 ${isFavorite ? "text-primary hover:text-primary" : "text-muted-foreground"}`}
              onClick={() => toggleFav.mutate(musica.id)}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
              {isFavorite ? "Favoritado" : "Favoritar"}
            </Button>

            <div className="flex items-center gap-2">
              <AddToRepertorioDialog musicaId={musica.id} title={musica.title} />
              <span className="text-sm text-muted-foreground">Adicionar ao repertório</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicaPage;