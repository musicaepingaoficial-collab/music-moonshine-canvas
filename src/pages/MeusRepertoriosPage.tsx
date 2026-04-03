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
      <Banner title="Meus Repertórios" subtitle="Gerencie suas coleções de músicas." />

      <Button onClick={() => { resetCreate(); setCreateOpen(true); }} size="sm">
        <Plus className="mr-1.5 h-4 w-4" />
        Criar Repertório
      </Button>

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (repertorios?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {repertorios!.map((rep) => (
            <div
              key={rep.id}
              className="group flex items-center gap-4 rounded-xl bg-card p-4 transition-all duration-200 hover:bg-accent"
            >
              <Link
                to={`/repertorio/${rep.id}`}
                className="flex flex-1 items-center gap-4 min-w-0"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary overflow-hidden">
                  {rep.cover_url ? (
                    <img src={rep.cover_url} alt={rep.name} className="h-full w-full object-cover" />
                  ) : (
                    <FolderOpen className="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{rep.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {rep.musica_count} música{rep.musica_count !== 1 ? "s" : ""}
                    {rep.total_size > 0 && ` · ${formatFileSize(rep.total_size)}`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => openEdit(rep)}
                  className="rounded-full p-1.5 text-muted-foreground hover:text-primary"
                  aria-label={`Editar ${rep.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(rep.id, rep.name)}
                  disabled={deleteRep.isPending}
                  className="rounded-full p-1.5 text-muted-foreground hover:text-destructive"
                  aria-label={`Remover ${rep.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
