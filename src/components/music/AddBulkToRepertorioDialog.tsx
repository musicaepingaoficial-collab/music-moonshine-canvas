import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRepertorios, useCreateRepertorio, useAddMusicasToRepertorio } from "@/hooks/useRepertorios";
import { ListPlus, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddBulkToRepertorioDialogProps {
  musicaIds: string[];
  label: string;
  children: React.ReactNode;
}

export function AddBulkToRepertorioDialog({ musicaIds, label, children }: AddBulkToRepertorioDialogProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const { data: repertorios, isLoading } = useRepertorios();
  const createRep = useCreateRepertorio();
  const addMusicas = useAddMusicasToRepertorio();

  const handleAdd = (repertorioId: string, repName: string) => {
    addMusicas.mutate(
      { repertorioId, musicaIds },
      {
        onSuccess: () => {
          toast.success(`${musicaIds.length} músicas adicionadas ao repertório "${repName}"`);
          setOpen(false);
        },
        onError: () => toast.error("Erro ao adicionar ao repertório."),
      }
    );
  };

  const handleCreateAndAdd = () => {
    if (!newName.trim()) return;
    createRep.mutate(
      { name: newName.trim() },
      {
        onSuccess: (data) => {
          addMusicas.mutate({ repertorioId: data.id, musicaIds });
          toast.success(`Repertório "${newName.trim()}" criado com ${musicaIds.length} músicas!`);
          setNewName("");
          setOpen(false);
        },
        onError: () => toast.error("Erro ao criar repertório."),
      }
    );
  };

  if (!musicaIds.length) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <p className="mb-1 text-sm font-medium text-foreground">Salvar "{label}" em repertório</p>
        <p className="mb-2 text-xs text-muted-foreground">{musicaIds.length} músicas</p>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {(repertorios ?? []).map((rep) => (
              <button
                key={rep.id}
                onClick={() => handleAdd(rep.id, rep.name)}
                disabled={addMusicas.isPending}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
              >
                <ListPlus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{rep.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{rep.musica_count}</span>
              </button>
            ))}
            {(repertorios ?? []).length === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">Nenhum repertório ainda.</p>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2">
          <Input
            placeholder="Novo repertório..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
            className="h-8 text-xs"
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleCreateAndAdd}
            disabled={!newName.trim() || createRep.isPending}
            aria-label="Criar repertório"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
