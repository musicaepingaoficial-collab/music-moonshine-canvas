import { usePlayerStore } from "@/stores/playerStore";
import { ListPlus, PlaySquare, Play } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import type { Musica } from "@/types/database";

interface AddToQueueButtonProps {
  musica: Musica | any;
  title: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function AddToQueueButton({ musica, title, side = "bottom" }: AddToQueueButtonProps) {
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playNext = usePlayerStore((s) => s.playNext);
  const [open, setOpen] = useState(false);

  const track = {
    ...musica,
    id: musica.id,
    title: musica.title || title,
    artist: musica.artist || "",
    cover_url: musica.cover_url || null,
    file_url: musica.file_url || null,
    duration: musica.duration || 0,
    file_size: musica.file_size || null,
    categoria_id: musica.categoria_id || null,
    drive_id: musica.drive_id || null,
    subfolder: musica.subfolder || null,
    created_at: musica.created_at || ""
  };

  const handleAddToQueue = () => {
    addToQueue(track);
    toast.success(`"${title}" adicionada à lista`);
    setOpen(false);
  };

  const handlePlayNext = () => {
    playNext(track);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex-1 aspect-square max-w-[52px] flex items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/30 active:scale-90 transition-all shadow-lg"
          aria-label={`Opções de lista para "${title}"`}
        >
          <ListPlus className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1 bg-background/95 backdrop-blur-lg border-border" align="end" side={side} sideOffset={10}>
        <button
          onClick={() => {
            usePlayerStore.getState().play(track);
            setOpen(false);
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
        >
          <Play className="h-4 w-4 text-primary" />
          Tocar agora
        </button>
        <button
          onClick={handlePlayNext}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
        >
          <PlaySquare className="h-4 w-4 text-primary" />
          Tocar a seguir
        </button>
        <button
          onClick={handleAddToQueue}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
        >
          <ListPlus className="h-4 w-4 text-primary" />
          Adicionar à fila
        </button>
      </PopoverContent>
    </Popover>
  );
}
