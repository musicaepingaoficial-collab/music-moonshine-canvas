import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader2, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/stores/playerStore";
import { AnimatePresence, motion } from "framer-motion";

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MusicPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const currentTime = usePlayerStore((s) => s.currentTime);

  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const close = usePlayerStore((s) => s.close);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const setProgress = usePlayerStore((s) => s.setProgress);

  const handlePlayPause = () => {
    isPlaying ? pause() : resume();
  };

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="player-bar fixed bottom-0 left-0 right-0 z-50 flex h-20 items-center px-4 md:px-6"
        >
          {/* Track info */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary">
              {currentTrack.cover_url ? (
                <img
                  src={currentTrack.cover_url}
                  alt={`Capa de ${currentTrack.title}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Play className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {currentTrack.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {currentTrack.artist}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-1 flex-col items-center gap-1">
            <div className="flex items-center gap-4">
              <button
                onClick={previous}
                className="text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-full p-1"
                aria-label="Música anterior"
              >
                <SkipBack className="h-4 w-4" fill="currentColor" />
              </button>
              <button
                onClick={handlePlayPause}
                disabled={isLoading}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                aria-label={isPlaying ? "Pausar" : "Tocar"}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" fill="currentColor" />
                ) : (
                  <Play className="h-4 w-4 translate-x-0.5" fill="currentColor" />
                )}
              </button>
              <button
                onClick={next}
                className="text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-full p-1"
                aria-label="Próxima música"
              >
                <SkipForward className="h-4 w-4" fill="currentColor" />
              </button>
            </div>
            <div className="flex w-full max-w-md items-center gap-2">
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[progress]}
                onValueChange={([v]) => setProgress(v)}
                max={100}
                step={0.1}
                className="flex-1 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-foreground"
                aria-label="Progresso da música"
              />
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume + Close */}
          <div className="hidden flex-1 items-center justify-end gap-2 md:flex">
            <button
              onClick={toggleMute}
              className="text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-full p-1"
              aria-label={muted ? "Ativar som" : "Silenciar"}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <Slider
              value={muted ? [0] : [volume]}
              onValueChange={([v]) => setVolume(v)}
              max={100}
              step={1}
              className="w-24 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-foreground"
              aria-label="Volume"
            />
            <button
              onClick={close}
              className="ml-2 text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-full p-1"
              aria-label="Fechar reprodutor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={close}
            className="ml-2 text-muted-foreground transition-all duration-200 hover:text-foreground rounded-full p-1 md:hidden"
            aria-label="Fechar reprodutor"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
