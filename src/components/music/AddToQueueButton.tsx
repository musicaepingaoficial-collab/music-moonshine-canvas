import { usePlayerStore } from "@/stores/playerStore";
import { ListPlus } from "lucide-react";
import { toast } from "sonner";
import type { Musica } from "@/types/database";

interface AddToQueueButtonProps {
  musica: Musica | any;
  title: string;
}

export function AddToQueueButton({ musica, title }: AddToQueueButtonProps) {
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const handleAddToQueue = () => {
    // Ensure all required properties are present for the player store
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
    
    addToQueue(track);
    toast.success(`"${title}" adicionada à lista de reprodução`);
  };

  return (
    <button
      onClick={handleAddToQueue}
      className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/40 transition-colors shadow-lg"
      aria-label={`Adicionar "${title}" à lista de reprodução`}
      title="Adicionar à lista de reprodução"
    >
      <ListPlus className="h-4 w-4" />
    </button>
  );
}
