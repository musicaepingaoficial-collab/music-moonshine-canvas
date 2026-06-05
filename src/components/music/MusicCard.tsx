import { useState } from "react";
import { Play, Download, Heart, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToggleFavorito } from "@/hooks/useFavorites";
import { usePlayerStore } from "@/stores/playerStore";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useHasActiveSubscription } from "@/hooks/useUser";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { downloadSingle } from "@/services/zipService";
import { AddToQueueButton } from "./AddToQueueButton";
import trackPlaceholder from "@/assets/track-placeholder.png";

interface MusicCardProps {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string | null;
  fileUrl?: string | null;
  driveId?: string | null;
  queueContext?: any[];
}

export function MusicCard({ id, title, artist, coverUrl, fileUrl, driveId, queueContext }: MusicCardProps) {
  const toggleFav = useToggleFavorito();
  const [downloading, setDownloading] = useState(false);
  const { hasAccess, isLoading: accessLoading, isAdmin } = useHasActiveSubscription();
  const { isDemo, openGate } = useDemoMode();
  const navigate = useNavigate();
  const play = usePlayerStore((s) => s.play);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isActive = currentTrack?.id === id && isPlaying;

  const handlePlay = () => {
    const track = { id, title, artist, cover_url: coverUrl ?? null, file_url: fileUrl ?? null, duration: 0, file_size: null, categoria_id: null, drive_id: driveId ?? null, subfolder: null, created_at: "" };
    play(track, queueContext);
  };

  const handleFavorite = () => {
    if (isDemo) { openGate("private"); return; }
    console.log("[MusicCard:toggleFavorite]", { id, title });
    toggleFav.mutate(id);
  };

  const handleDownload = async () => {
    if (isDemo) { openGate("download"); return; }
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
      className={`group relative min-w-0 w-full overflow-hidden rounded-md bg-card transition-all duration-300 hover:shadow-2xl hover:z-10 ${isActive ? "ring-2 ring-primary" : ""}`}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`Capa de ${title}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0d1410] via-[#0a0f0a] to-[#050805]">
            <img
              src={trackPlaceholder}
              alt=""
              aria-hidden="true"
              className="h-3/4 w-3/4 object-contain opacity-90 drop-shadow-[0_0_24px_rgba(34,197,94,0.35)] transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          </div>
        )}
        
        {/* Overlay degrade estilo Netflix */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute inset-0 flex flex-col justify-end p-2 sm:p-3 translate-y-2 group-hover:translate-y-0 transition-transform duration-300 min-w-0">
          <Link to={`/musica/${id}`} className="block hover:underline underline-offset-2 min-w-0">
            <h3 className="truncate text-sm font-bold text-white drop-shadow-md">{title}</h3>
          </Link>
          <p className="truncate text-[10px] text-white/70 mb-2">{artist}</p>

          <div className="flex items-center gap-2 w-full min-w-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 delay-75">
            <button
              onClick={handlePlay}
              className="flex-[1.6] flex h-11 sm:h-12 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-zinc-100 active:scale-95 transition-all"
              aria-label={`Tocar ${title}`}
            >
              <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
            </button>

            <button
              onClick={handleFavorite}
              disabled={toggleFav.isPending}
              className="flex-1 aspect-square max-w-[52px] flex items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/30 active:scale-90 transition-all shadow-lg"
              aria-label={`Favoritar ${title}`}
            >
              <Heart className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${toggleFav.isPending ? "animate-pulse" : ""}`} />
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading || accessLoading}
              className="flex-1 aspect-square max-w-[52px] flex items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/30 active:scale-90 transition-all shadow-lg"
              aria-label={`Baixar ${title}`}
            >
              {downloading ? <Loader2 className="h-4 w-4 sm:h-[18px] sm:w-[18px] animate-spin" /> : <Download className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />}
            </button>

            <AddToQueueButton
              musica={{ id, title, artist, cover_url: coverUrl, file_url: fileUrl, drive_id: driveId }}
              title={title}
              side="top"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
