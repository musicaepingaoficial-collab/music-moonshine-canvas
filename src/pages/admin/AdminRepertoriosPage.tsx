import { useState } from "react";
import { useRepertorios, useCreateRepertorio, useDeleteRepertorio, useRepertorioMusicas, useAddMusicasToRepertorio, useRemoveMusicaFromRepertorio } from "@/hooks/useRepertorios";
import { useMusicas } from "@/hooks/useMusics";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, Music2, FolderOpen, Search } from "lucide-react";

const AdminRepertoriosPage = () => {
  const { data: repertorios, isLoading, error, refetch } = useRepertorios();
  const createRep = useCreateRepertorio();
  const deleteRep = useDeleteRepertorio();

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createRep.mutateAsync({ name: newName.trim(), description: newDesc.trim() || undefined });
      setNewName("");
      setNewDesc("");
      toast.success("Repertório criado!");
    } catch {
      toast.error("Erro ao criar repertório.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRep.mutateAsync(id);
      toast.success("Repertório excluído!");
    } catch {
      toast.error("Erro ao excluir.");
    }
  };

  console.log("[AdminRepertorios:render]", { total: repertorios?.length });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Repertórios</h1>
        <p className="text-sm text-muted-foreground">Crie e gerencie repertórios de músicas</p>
      </div>

      {error && <ErrorState message="Erro ao carregar repertórios." onRetry={() => refetch()} />}

      {/* Create new */}
      <Card className="border-0">
        <CardHeader className="pb-3">
          <h2 className="text-sm font-semibold text-foreground">Novo repertório</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Nome (ex: Repertório Abril 2026)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
            aria-label="Nome do repertório"
          />
          <Input
            placeholder="Descrição (opcional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="flex-1"
            aria-label="Descrição do repertório"
          />
          <Button onClick={handleCreate} disabled={createRep.isPending || !newName.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Criar
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-0">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (repertorios?.length ?? 0) === 0 ? (
            <EmptyState icon={FolderOpen} title="Nenhum repertório criado ainda." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Músicas</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repertorios!.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-foreground">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.description || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.musica_count}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRepId(r.id)}
                          aria-label="Gerenciar músicas"
                        >
                          <Music2 className="mr-1 h-4 w-4" /> Músicas
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(r.id)}
                          disabled={deleteRep.isPending}
                          aria-label="Excluir repertório"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Music manager dialog */}
      {selectedRepId && (
        <MusicManagerDialog
          repertorioId={selectedRepId}
          onClose={() => setSelectedRepId(null)}
        />
      )}
    </div>
  );
};

function MusicManagerDialog({ repertorioId, onClose }: { repertorioId: string; onClose: () => void }) {
  const { data: repMusicas, isLoading: loadingRep } = useRepertorioMusicas(repertorioId);
  const { data: allMusicas, isLoading: loadingAll } = useMusicas();
  const addMusicas = useAddMusicasToRepertorio();
  const removeMusica = useRemoveMusicaFromRepertorio();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const repMusicaIds = new Set((repMusicas ?? []).map((m) => m.id));
  const available = (allMusicas ?? []).filter(
    (m) =>
      !repMusicaIds.has(m.id) &&
      (m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.artist.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = async () => {
    if (selected.size === 0) return;
    try {
      await addMusicas.mutateAsync({ repertorioId, musicaIds: Array.from(selected) });
      setSelected(new Set());
      toast.success(`${selected.size} música(s) adicionada(s)!`);
    } catch {
      toast.error("Erro ao adicionar músicas.");
    }
  };

  const handleRemove = async (musicaId: string) => {
    try {
      await removeMusica.mutateAsync({ repertorioId, musicaId });
      toast.success("Música removida do repertório.");
    } catch {
      toast.error("Erro ao remover.");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isLoading = loadingRep || loadingAll;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar músicas do repertório</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Current songs */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Músicas no repertório ({repMusicas?.length ?? 0})
            </h3>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (repMusicas?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma música adicionada.</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {repMusicas!.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-sm text-foreground">
                      {m.title} — <span className="text-muted-foreground">{m.artist}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(m.id)}
                      disabled={removeMusica.isPending}
                      aria-label={`Remover ${m.title}`}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add songs */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Adicionar músicas</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar músicas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                aria-label="Buscar músicas para adicionar"
              />
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {available.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {search ? "Nenhuma música encontrada." : "Todas as músicas já estão no repertório."}
                </p>
              ) : (
                available.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selected.has(m.id)}
                      onCheckedChange={() => toggleSelect(m.id)}
                      aria-label={`Selecionar ${m.title}`}
                    />
                    <span className="text-sm text-foreground">
                      {m.title} — <span className="text-muted-foreground">{m.artist}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <DialogClose asChild>
            <Button variant="outline" size="sm">Fechar</Button>
          </DialogClose>
          {selected.size > 0 && (
            <Button size="sm" onClick={handleAdd} disabled={addMusicas.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar {selected.size} música(s)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdminRepertoriosPage;
