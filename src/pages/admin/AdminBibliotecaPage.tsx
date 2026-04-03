import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Music2, Plus, Pencil, Trash2, FolderPlus } from "lucide-react";
import { toast } from "sonner";

interface MusicaForm {
  title: string;
  artist: string;
  categoria_id: string;
  drive_id: string;
  file_url: string;
  cover_url: string;
  duration: string;
}

const emptyForm: MusicaForm = { title: "", artist: "", categoria_id: "", drive_id: "", file_url: "", cover_url: "", duration: "" };

const AdminBibliotecaPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<MusicaForm>(emptyForm);
  const [catOpen, setCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);

  const { data: musicas, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-musicas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("musicas")
        .select("id, title, artist, cover_url, file_url, duration, created_at, categoria_id, drive_id, categorias(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ["admin-categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: drives } = useQuery({
    queryKey: ["admin-drives"],
    queryFn: async () => {
      const { data, error } = await supabase.from("google_drives").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ["admin-musicas"] });

  const addMusicaMut = useMutation({
    mutationFn: async (f: MusicaForm) => {
      const { error } = await supabase.from("musicas").insert({
        title: f.title.trim(),
        artist: f.artist.trim(),
        categoria_id: f.categoria_id || null,
        drive_id: f.drive_id || null,
        file_url: f.file_url.trim() || null,
        cover_url: f.cover_url.trim() || null,
        duration: f.duration ? parseInt(f.duration) : 0,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Música adicionada!"); setAddOpen(false); setForm(emptyForm); },
    onError: () => toast.error("Erro ao adicionar música."),
  });

  const updateMusicaMut = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: MusicaForm }) => {
      const { error } = await supabase.from("musicas").update({
        title: f.title.trim(),
        artist: f.artist.trim(),
        categoria_id: f.categoria_id || null,
        drive_id: f.drive_id || null,
        file_url: f.file_url.trim() || null,
        cover_url: f.cover_url.trim() || null,
        duration: f.duration ? parseInt(f.duration) : 0,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Música atualizada!"); setEditId(null); },
    onError: () => toast.error("Erro ao atualizar música."),
  });

  const deleteMusicaMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("musicas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Música removida!"); setDeleteId(null); },
    onError: () => toast.error("Erro ao remover música."),
  });

  const addCategoriaMut = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { error } = await supabase.from("categorias").insert({ name: name.trim(), slug });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categorias"] });
      toast.success("Categoria criada!");
      setNewCatName("");
    },
    onError: () => toast.error("Erro ao criar categoria."),
  });

  const deleteCategoriaMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categorias"] });
      toast.success("Categoria removida!");
      setDeleteCatId(null);
    },
    onError: () => toast.error("Erro ao remover categoria."),
  });

  const filtered = (musicas ?? []).filter(
    (m) => m.title.toLowerCase().includes(search.toLowerCase()) || m.artist.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${String(sec).padStart(2, "0")}`;
  };

  const openEdit = (m: NonNullable<typeof musicas>[number]) => {
    setForm({
      title: m.title,
      artist: m.artist,
      categoria_id: m.categoria_id ?? "",
      drive_id: m.drive_id ?? "",
      file_url: m.file_url ?? "",
      cover_url: m.cover_url ?? "",
      duration: m.duration?.toString() ?? "",
    });
    setEditId(m.id);
  };

  const MusicaFormFields = () => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Título *</Label>
          <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Nome da música" />
        </div>
        <div className="space-y-2">
          <Label>Artista *</Label>
          <Input value={form.artist} onChange={(e) => setForm((p) => ({ ...p, artist: e.target.value }))} placeholder="Nome do artista" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={form.categoria_id} onValueChange={(v) => setForm((p) => ({ ...p, categoria_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              {(categorias ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Drive</Label>
          <Select value={form.drive_id} onValueChange={(v) => setForm((p) => ({ ...p, drive_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              {(drives ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>URL do arquivo</Label>
        <Input value={form.file_url} onChange={(e) => setForm((p) => ({ ...p, file_url: e.target.value }))} placeholder="https://..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>URL da capa</Label>
          <Input value={form.cover_url} onChange={(e) => setForm((p) => ({ ...p, cover_url: e.target.value }))} placeholder="https://..." />
        </div>
        <div className="space-y-2">
          <Label>Duração (segundos)</Label>
          <Input type="number" value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} placeholder="180" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Biblioteca</h1>
          <p className="text-sm text-muted-foreground">Gerencie as músicas e categorias da plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-1" /> Categorias
          </Button>
          <Button onClick={() => { setForm(emptyForm); setAddOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Música
          </Button>
        </div>
      </div>

      {error && <ErrorState message="Erro ao carregar músicas." onRetry={() => refetch()} />}

      <Card className="border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por título ou artista..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Badge variant="secondary" className="whitespace-nowrap">
              {filtered.length} música{filtered.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Music2} title="Nenhuma música encontrada" description="Tente alterar os termos da busca." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Artista</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Adicionada</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-foreground">{m.title}</TableCell>
                      <TableCell className="text-muted-foreground">{m.artist}</TableCell>
                      <TableCell>
                        {(m as any).categorias?.name ? (
                          <Badge variant="secondary">{(m as any).categorias.name}</Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDuration(m.duration)}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(m.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(m.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Music Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Música</DialogTitle>
            <DialogDescription>Preencha os dados da nova música.</DialogDescription>
          </DialogHeader>
          <MusicaFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => addMusicaMut.mutate(form)} disabled={!form.title.trim() || !form.artist.trim() || addMusicaMut.isPending}>
              {addMusicaMut.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Music Dialog */}
      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Música</DialogTitle>
            <DialogDescription>Altere os dados da música.</DialogDescription>
          </DialogHeader>
          <MusicaFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Cancelar</Button>
            <Button
              onClick={() => editId && updateMusicaMut.mutate({ id: editId, f: form })}
              disabled={!form.title.trim() || !form.artist.trim() || updateMusicaMut.isPending}
            >
              {updateMusicaMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Music Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover música?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && deleteMusicaMut.mutate(deleteId)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Categories Management Dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Categorias</DialogTitle>
            <DialogDescription>Crie ou remova categorias de música.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Nome da categoria" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
              <Button onClick={() => newCatName.trim() && addCategoriaMut.mutate(newCatName)} disabled={!newCatName.trim() || addCategoriaMut.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(categorias ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria criada.</p>
              ) : (
                (categorias ?? []).map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                    <span className="text-sm text-foreground">{c.name}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteCatId(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirm */}
      <AlertDialog open={!!deleteCatId} onOpenChange={(o) => !o && setDeleteCatId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>Músicas desta categoria ficarão sem categoria.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteCatId && deleteCategoriaMut.mutate(deleteCatId)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBibliotecaPage;
