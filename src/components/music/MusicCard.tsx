import { useState } from "react";
import { Play, Download, Heart, Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToggleFavorito } from "@/hooks/useFavorites";
import { usePlayerStore } from "@/stores/playerStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useHasActiveSubscription } from "@/hooks/useUser";
import { downloadSingle } from "@/services/zipService";
import { AddToRepertorioDialog } from "./AddToRepertorioDialog";

interface MusicCardProps {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string | null;
  fileUrl?: string | null;
  driveId?: string | null;
  onRemove?: () => void;
  removeDisabled?: boolean;
}

export function MusicCard({ id, title, artist, coverUrl, fileUrl, driveId, onRemove, removeDisabled }: MusicCardProps) {
  const toggleFav = useToggleFavorito();
  const [downloading, setDownloading] = useState(false);
  const { hasAccess, isLoading: accessLoading } = useHasActiveSubscription();
  const navigate = useNavigate();
  const play = usePlayerStore((s) => s.play);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isActive = currentTrack?.id === id && isPlaying;

  const handlePlay = () => {
    play({ id, title, artist, cover_url: coverUrl ?? null, file_url: fileUrl ?? null, duration: 0, file_size: null, categoria_id: null, drive_id: driveId ?? null, subfolder: null, created_at: "" });
  };

  const handleFavorite = () => {
    console.log("[MusicCard:toggleFavorite]", { id, title });
    toggleFav.mutate(id);
  };

  const handleDownload = async () => {
    if (accessLoading) return;
    if (!hasAccess) {
      toast.error("Assine um plano para baixar músicas.");
      navigate("/planos");
      return;
    }
    console.log("[MusicCard:download]", { id, title });
    setDownloading(true);
    try {
      await downloadSingle(id);
      toast.success("Download iniciado");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao baixar música");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.2 }}
      className={`group relative overflow-hidden rounded-xl bg-card p-4 transition-all duration-200 hover:bg-accent ${isActive ? "ring-1 ring-primary/50" : ""}`}
    >
      <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-secondary">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`Capa de ${title}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Play className="h-8 w-8" />
          </div>
        )}
        <button
          onClick={handlePlay}
          className="absolute bottom-2 right-2 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 hover:scale-105 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Tocar ${title}`}
        >
          <Play className="h-4 w-4 translate-x-0.5" fill="currentColor" />
        </button>
      </div>

      <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
      <p className="truncate text-xs text-muted-foreground">{artist}</p>

      <div className="mt-2 flex items-center gap-1">
        <button
          onClick={handleFavorite}
          disabled={toggleFav.isPending}
          className="rounded-full p-1.5 text-muted-foreground transition-all duration-200 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          aria-label={`Favoritar ${title}`}
        >
          <Heart className="h-4 w-4" />
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading || accessLoading}
          title={!hasAccess && !accessLoading ? "Assine para baixar" : undefined}
          className="rounded-full p-1.5 text-muted-foreground transition-all duration-200 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          aria-label={`Baixar ${title}`}
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </button>
        <AddToRepertorioDialog musicaId={id} title={title} />
        {onRemove && (
          <button
            onClick={onRemove}
            disabled={removeDisabled}
            className="rounded-full p-1.5 text-muted-foreground transition-all duration-200 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            aria-label={`Remover ${title} do repertório`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
