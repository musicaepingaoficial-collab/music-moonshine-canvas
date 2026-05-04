import { Link } from "react-router-dom";
import { Banner } from "@/components/ui/Banner";
import { useRepertorios, useCreateRepertorio, useDeleteRepertorio, useUpdateRepertorio } from "@/hooks/useRepertorios";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FolderOpen, Plus, ChevronRight, Trash2, Pencil, ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { RepertorioWithCount } from "@/hooks/useRepertorios";
import { useHasActiveSubscription } from "@/hooks/useUser";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i >= 3 ? 2 : 0)} ${units[i]}`;
}

const MeusRepertoriosPage = () => {
  const { data: repertorios, isLoading } = useRepertorios();
  const createRep = useCreateRepertorio();
  const deleteRep = useDeleteRepertorio();
  const updateRep = useUpdateRepertorio();
  const { isAdmin } = useHasActiveSubscription();
  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const createFileRef = useRef<HTMLInputElement>(null);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editRep, setEditRep] = useState<RepertorioWithCount | null>(null);
  const [editName, setEditName] = useState("");
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const resetCreate = () => {
    setNewName("");
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>, mode: "create" | "edit") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida.");
      return;
    }
    const url = URL.createObjectURL(file);
    if (mode === "create") {
      setCoverFile(file);
      setCoverPreview(url);
    } else {
      setEditCoverFile(file);
      setEditCoverPreview(url);
    }
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createRep.mutate(
      { name: newName.trim(), coverFile: coverFile ?? undefined },
      {
        onSuccess: () => {
          toast.success(`Repertório "${newName.trim()}" criado!`);
          resetCreate();
          setCreateOpen(false);
        },
        onError: () => toast.error("Erro ao criar repertório."),
      }
    );
  };

  const openEdit = (rep: RepertorioWithCount) => {
    setEditRep(rep);
    setEditName(rep.name);
    setEditCoverPreview(rep.cover_url);
    setEditCoverFile(null);
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editRep || !editName.trim()) return;
    updateRep.mutate(
      { repertorioId: editRep.id, name: editName.trim(), coverFile: editCoverFile ?? undefined },
      {
        onSuccess: () => {
          toast.success("Repertório atualizado!");
          setEditOpen(false);
        },
        onError: () => toast.error("Erro ao atualizar repertório."),
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    deleteRep.mutate(id, {
      onSuccess: () => toast.success(`"${name}" removido.`),
      onError: () => toast.error("Erro ao remover repertório."),
    });
  };

  return (
    <div className="space-y-8">
      <Banner title="Repertórios" subtitle="Explore coleções de músicas organizadas." />

      {isAdmin && (
        <Button onClick={() => { resetCreate(); setCreateOpen(true); }} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Criar Repertório
        </Button>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Repertório</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <input ref={createFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverSelect(e, "create")} />
            <button
              onClick={() => createFileRef.current?.click()}
              className="flex h-32 w-32 items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary overflow-hidden"
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Capa" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-[10px]">Capa (opcional)</span>
                </div>
              )}
            </button>
            <span className="text-[10px] text-muted-foreground">1000×1000px recomendado</span>
            <Input
              placeholder="Nome do repertório"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-full"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createRep.isPending}>
              <Plus className="mr-1.5 h-4 w-4" />
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Repertório</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverSelect(e, "edit")} />
            <button
              onClick={() => editFileRef.current?.click()}
              className="flex h-32 w-32 items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary overflow-hidden"
            >
              {editCoverPreview ? (
                <img src={editCoverPreview} alt="Capa" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-[10px]">Capa (opcional)</span>
                </div>
              )}
            </button>
            <span className="text-[10px] text-muted-foreground">1000×1000px recomendado</span>
            <Input
              placeholder="Nome do repertório"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEdit()}
              className="w-full"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={!editName.trim() || updateRep.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-md" />
          ))}
        </div>
      ) : (repertorios?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {repertorios!.map((rep) => (
            <div key={rep.id} className="group relative aspect-[2/3] w-full overflow-hidden rounded-md bg-card transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:z-10">
              <Link to={`/repertorio/${rep.id}`} className="absolute inset-0 z-0">
                {rep.cover_url ? (
                  <img
                    src={rep.cover_url}
                    alt={rep.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                    <FolderOpen className="h-12 w-12 opacity-20" />
                  </div>
                )}
              </Link>
              
              {/* Overlay degrade estilo Netflix */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-100 pointer-events-none" />
              
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
                <Link to={`/repertorio/${rep.id}`}>
                  <p className="text-sm font-bold text-white line-clamp-2 leading-tight drop-shadow-md">
                    {rep.name}
                  </p>
                </Link>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-green-400 drop-shadow-sm">
                      {rep.musica_count} músicas
                    </span>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 z-20">
                      <button
                        onClick={(e) => { e.preventDefault(); openEdit(rep); }}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/40 transition-colors"
                        aria-label={`Editar ${rep.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); handleDelete(rep.id, rep.name); }}
                        disabled={deleteRep.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/80 text-white hover:bg-destructive transition-colors"
                        aria-label={`Remover ${rep.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={FolderOpen} title="Nenhum repertório criado ainda." />
      )}
    </div>
  );
};

export default MeusRepertoriosPage;
