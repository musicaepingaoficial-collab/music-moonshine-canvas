import { useState } from "react";
import { Play, Download, Heart, Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToggleFavorito } from "@/hooks/useFavorites";
import { usePlayerStore } from "@/stores/playerStore";
import { useNavigate, Link } from "react-router-dom";
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
  const { hasAccess, isLoading: accessLoading, isAdmin } = useHasActiveSubscription();
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
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`group relative overflow-hidden rounded-md bg-card transition-all duration-300 hover:shadow-2xl hover:z-10 ${isActive ? "ring-2 ring-primary" : ""}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`Capa de ${title}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Play className="h-10 w-10 opacity-20" />
          </div>
        )}
        
        {/* Overlay degrade estilo Netflix */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute inset-0 flex flex-col justify-end p-3 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          <Link to={`/musica/${id}`} className="block hover:underline underline-offset-2">
            <h3 className="truncate text-sm font-bold text-white drop-shadow-md">{title}</h3>
          </Link>
          <p className="truncate text-[10px] text-white/70 mb-2">{artist}</p>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
            <button
              onClick={handlePlay}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black hover:scale-110 transition-transform"
              aria-label={`Tocar ${title}`}
            >
              <Play className="h-4 w-4 translate-x-0.5" fill="currentColor" />
            </button>
            
            <button
              onClick={handleFavorite}
              disabled={toggleFav.isPending}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/40 transition-colors"
              aria-label={`Favoritar ${title}`}
            >
              <Heart className={`h-4 w-4 ${toggleFav.isPending ? "animate-pulse" : ""}`} />
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading || accessLoading}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/40 transition-colors"
              aria-label={`Baixar ${title}`}
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </button>
            
            {isAdmin && (
              <div className="ml-auto">
                <AddToRepertorioDialog musicaId={id} title={title} />
              </div>
            )}
            
            {onRemove && (
              <button
                onClick={onRemove}
                disabled={removeDisabled}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/80 text-white hover:bg-destructive transition-colors"
                aria-label={`Remover ${title} do repertório`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
