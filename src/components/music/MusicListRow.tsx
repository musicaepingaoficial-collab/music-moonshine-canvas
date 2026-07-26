import { useState } from "react";
import { Play, Pause, Download, Heart, Loader2, Music2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useToggleFavorito, useFavoritos } from "@/hooks/useFavorites";
import { usePlayerStore } from "@/stores/playerStore";
import { useHasActiveSubscription } from "@/hooks/useUser";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { downloadSingle } from "@/services/zipService";
import { AddToQueueButton } from "./AddToQueueButton";
import type { Musica } from "@/types/database";

interface Props {
  musica: Musica;
  queueContext?: Musica[];
  index?: number;
}

export function MusicListRow({ musica, queueContext, index }: Props) {
  const toggleFav = useToggleFavorito();
  const { data: favoritos } = useFavoritos();
  const [downloading, setDownloading] = useState(false);
  const { hasAccess, isLoading: accessLoading } = useHasActiveSubscription();
  const { isDemo, openGate } = useDemoMode();
  const navigate = useNavigate();
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isActive = currentTrack?.id === musica.id;
  const isThisPlaying = isActive && isPlaying;
  const isFavorite = favoritos?.some((f) => f.musicas.id === musica.id);

  const handleToggle = () => {
    if (isThisPlaying) pause();
    else play(musica, queueContext);
  };

  const handleFavorite = () => {
    if (isDemo) { openGate("private"); return; }
    toggleFav.mutate(musica.id);
  };

  const handleDownload = async () => {
    if (isDemo) { openGate("download"); return; }
    if (accessLoading) return;
    if (!hasAccess) {
      toast.error("Assine um plano para baixar músicas.");
      navigate("/planos");
      return;
    }
    setDownloading(true);
    try {
      await downloadSingle(musica.id);
      toast.success("Download iniciado");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao baixar música");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50 ${
        isActive ? "bg-accent/30 ring-1 ring-primary/40" : ""
      }`}
    >
      {/* Index / play button */}
      <button
        onClick={handleToggle}
        className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted"
        aria-label={isThisPlaying ? `Pausar ${musica.title}` : `Tocar ${musica.title}`}
      >
        {musica.cover_url ? (
          <img
            src={musica.cover_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Music2 className="h-5 w-5 text-muted-foreground/50" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {isThisPlaying ? (
            <Pause className="h-5 w-5 text-white fill-current" />
          ) : (
            <Play className="h-5 w-5 text-white fill-current translate-x-0.5" />
          )}
        </div>
        {isActive && !isThisPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Play className="h-5 w-5 text-primary fill-current translate-x-0.5" />
          </div>
        )}
      </button>

      {/* Title + artist */}
      <Link
        to={`/musica/${musica.id}`}
        className="min-w-0 flex-1 hover:underline underline-offset-2"
      >
        <p className={`truncate text-sm font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
          {musica.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">{musica.artist}</p>
      </Link>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={handleFavorite}
          disabled={toggleFav.isPending}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-accent ${
            isFavorite ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={isFavorite ? "Desfavoritar" : "Favoritar"}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
        </button>

        <button
          onClick={handleDownload}
          disabled={downloading || accessLoading}
          className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Baixar"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </button>

        <AddToQueueButton musica={musica as any} title={musica.title} side="top" />
      </div>
    </div>
  );
}
