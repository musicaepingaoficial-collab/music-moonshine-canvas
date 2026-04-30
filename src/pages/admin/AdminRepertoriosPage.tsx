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
import { Plus, Trash2, Music2, FolderOpen, Search, Image as ImageIcon, HardDrive, Folder } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const AdminRepertoriosPage = () => {
  const { data: repertorios, isLoading, error, refetch } = useRepertorios();
  const createRep = useCreateRepertorio();
  const deleteRep = useDeleteRepertorio();

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createRep.mutateAsync({ 
        name: newName.trim(), 
        description: newDesc.trim() || undefined,
        coverFile: coverFile || undefined
      });
      setNewName("");
      setNewDesc("");
      setCoverFile(null);
      setCoverPreview(null);
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
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
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
          </div>
          
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Capa do repertório</label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => document.getElementById('cover-upload')?.click()}
                  className="w-full justify-start h-10 border-dashed"
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {coverFile ? coverFile.name : "Selecionar capa..."}
                </Button>
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {coverPreview && (
                  <div className="h-10 w-10 rounded border overflow-hidden bg-muted">
                    <img src={coverPreview} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </div>
            
            <Button onClick={handleCreate} disabled={createRep.isPending || !newName.trim()} className="h-10 px-6">
              <Plus className="mr-1 h-4 w-4" /> Criar Repertório
            </Button>
          </div>
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
                  <TableHead>Capa</TableHead>
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
                    <TableCell>
                      {r.cover_url ? (
                        <div className="h-10 w-10 rounded border overflow-hidden bg-muted">
                          <img src={r.cover_url} alt={r.name} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded border flex items-center justify-center bg-muted text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </TableCell>
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

  const { data: drives } = useQuery({
    queryKey: ["admin-drives"],
    queryFn: async () => {
      const { data } = await supabase.from("google_drives").select("*");
      return data || [];
    }
  });

  const { data: folders } = useQuery({
    queryKey: ["available-folders", drives],
    queryFn: async () => {
      const { data } = await supabase.from("musicas").select("subfolder, drive_id").not("subfolder", "is", null);
      const uniqueFolders: { subfolder: string, drive_id: string }[] = [];
      const seen = new Set();
      data?.forEach(item => {
        const key = `${item.drive_id}|${item.subfolder}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueFolders.push(item);
        }
      });
      return uniqueFolders;
    }
  });

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

  const addAllFromDrive = async (driveId: string) => {
    try {
      const { data: driveMusicas } = await supabase.from("musicas").select("id").eq("drive_id", driveId);
      if (driveMusicas && driveMusicas.length > 0) {
        const idsToAdd = driveMusicas.map(m => m.id).filter(id => !repMusicaIds.has(id));
        if (idsToAdd.length === 0) {
          toast.info("Todas as músicas deste drive já estão no repertório.");
          return;
        }
        await addMusicas.mutateAsync({ repertorioId, musicaIds: idsToAdd });
        toast.success(`${idsToAdd.length} música(s) do drive adicionada(s)!`);
      }
    } catch {
      toast.error("Erro ao adicionar músicas do drive.");
    }
  };

  const addAllFromFolder = async (driveId: string, subfolder: string) => {
    try {
      const { data: folderMusicas } = await supabase.from("musicas").select("id").eq("drive_id", driveId).eq("subfolder", subfolder);
      if (folderMusicas && folderMusicas.length > 0) {
        const idsToAdd = folderMusicas.map(m => m.id).filter(id => !repMusicaIds.has(id));
        if (idsToAdd.length === 0) {
          toast.info("Todas as músicas desta pasta já estão no repertório.");
          return;
        }
        await addMusicas.mutateAsync({ repertorioId, musicaIds: idsToAdd });
        toast.success(`${idsToAdd.length} música(s) da pasta adicionada(s)!`);
      }
    } catch {
      toast.error("Erro ao adicionar músicas da pasta.");
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar músicas do repertório</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-6">
          {/* Current songs */}
          <div className="shrink-0">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Músicas no repertório ({repMusicas?.length ?? 0})
            </h3>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (repMusicas?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma música adicionada.</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto pr-2">
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
                      <Trash2 className="h-3.3 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Tabs defaultValue="individual" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="individual">Músicas</TabsTrigger>
              <TabsTrigger value="pastas">Pastas</TabsTrigger>
              <TabsTrigger value="drives">Drives</TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="flex-1 overflow-hidden flex flex-col m-0">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar músicas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-1">
                {available.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-10 text-center">
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
                      />
                      <span className="text-sm text-foreground">
                        {m.title} — <span className="text-muted-foreground">{m.artist}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
              <div className="pt-4 border-t flex justify-end gap-2 shrink-0">
                {selected.size > 0 && (
                  <Button size="sm" onClick={handleAdd} disabled={addMusicas.isPending}>
                    <Plus className="mr-1 h-4 w-4" /> Adicionar {selected.size} selecionada(s)
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pastas" className="flex-1 overflow-y-auto pr-2 m-0">
              <div className="space-y-2">
                {folders?.length === 0 ? (
                  <EmptyState icon={Folder} title="Nenhuma pasta encontrada" />
                ) : (
                  folders?.map((f, i) => {
                    const drive = drives?.find(d => d.id === f.drive_id);
                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <Folder className="h-5 w-5 text-primary shrink-0" />
                          <div className="overflow-hidden">
                            <p className="font-medium text-sm truncate">{f.subfolder}</p>
                            <p className="text-xs text-muted-foreground truncate">{drive?.name || "Drive Desconhecido"}</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => addAllFromFolder(f.drive_id, f.subfolder)}
                          disabled={addMusicas.isPending}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Adicionar Tudo
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="drives" className="flex-1 overflow-y-auto pr-2 m-0">
              <div className="space-y-2">
                {drives?.length === 0 ? (
                  <EmptyState icon={HardDrive} title="Nenhum drive encontrado" />
                ) : (
                  drives?.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                      <div className="flex items-center gap-3">
                        <HardDrive className="h-5 w-5 text-primary" />
                        <span className="font-medium text-sm">{d.name}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => addAllFromDrive(d.id)}
                        disabled={addMusicas.isPending}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Adicionar Tudo
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <DialogClose asChild>
            <Button variant="outline" size="sm">Fechar</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdminRepertoriosPage;