import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  ImagePlay,
  Loader2,
  Upload,
} from "lucide-react";

interface Anuncio {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link: string | null;
  active: boolean;
  position: number;
  created_at: string;
}

const empty = {
  title: "",
  subtitle: "",
  link: "",
  image_url: "",
  active: true,
};

const AdminAnunciosPage = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Anuncio | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [uploading, setUploading] = useState(false);

  const { data: anuncios, isLoading } = useQuery<Anuncio[]>({
    queryKey: ["admin", "anuncios"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("anuncios" as any) as any)
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Anuncio[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "anuncios"] });
    qc.invalidateQueries({ queryKey: ["anuncios"] });
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const openEdit = (a: Anuncio) => {
    setEditing(a);
    setForm({
      title: a.title ?? "",
      subtitle: a.subtitle ?? "",
      link: a.link ?? "",
      image_url: a.image_url ?? "",
      active: a.active,
    });
    setOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("anuncios-images")
        .upload(path, file, { upsert: false, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("anuncios-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast.success("Imagem enviada!");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Informe o título");
      if (!form.image_url) throw new Error("Envie uma imagem");

      if (editing) {
        const { error } = await (supabase.from("anuncios" as any) as any)
          .update({
            title: form.title.trim(),
            subtitle: form.subtitle.trim() || null,
            link: form.link.trim() || null,
            image_url: form.image_url,
            active: form.active,
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const nextPos = (anuncios?.length ?? 0) + 1;
        const { error } = await (supabase.from("anuncios" as any) as any).insert({
          title: form.title.trim(),
          subtitle: form.subtitle.trim() || null,
          link: form.link.trim() || null,
          image_url: form.image_url,
          active: form.active,
          position: nextPos,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Banner atualizado" : "Banner criado");
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (a: Anuncio) => {
      const { error } = await (supabase.from("anuncios" as any) as any)
        .update({ active: !a.active })
        .eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (a: Anuncio) => {
      const { error } = await (supabase.from("anuncios" as any) as any)
        .delete()
        .eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Banner excluído");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async ({ a, dir }: { a: Anuncio; dir: -1 | 1 }) => {
      if (!anuncios) return;
      const sorted = [...anuncios].sort((x, y) => x.position - y.position);
      const idx = sorted.findIndex((x) => x.id === a.id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const other = sorted[swapIdx];
      await (supabase.from("anuncios" as any) as any)
        .update({ position: other.position })
        .eq("id", a.id);
      await (supabase.from("anuncios" as any) as any)
        .update({ position: a.position })
        .eq("id", other.id);
    },
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <Banner
        title="Banners promocionais"
        subtitle="Gerencie os slides exibidos no painel principal."
      />

      <div className="flex justify-end">
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo banner
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (anuncios?.length ?? 0) === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <ImagePlay className="mx-auto mb-3 h-10 w-10 opacity-50" />
          Nenhum banner cadastrado ainda.
        </Card>
      ) : (
        <div className="grid gap-3">
          {anuncios!.map((a, idx) => (
            <Card key={a.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-4 p-3">
                <div className="relative h-28 w-full sm:w-48 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {a.image_url ? (
                    <img
                      src={a.image_url}
                      alt={a.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImagePlay className="h-6 w-6" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h3 className="font-semibold">{a.title}</h3>
                    {a.active ? (
                      <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inativo</Badge>
                    )}
                    <Badge variant="outline">#{a.position}</Badge>
                  </div>
                  {a.subtitle && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {a.subtitle}
                    </p>
                  )}
                  {a.link && (
                    <p className="mt-1 text-xs text-primary truncate">{a.link}</p>
                  )}
                </div>

                <div className="flex sm:flex-col gap-2 sm:items-end">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => move.mutate({ a, dir: -1 })}
                      disabled={idx === 0}
                      aria-label="Mover para cima"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => move.mutate({ a, dir: 1 })}
                      disabled={idx === (anuncios!.length - 1)}
                      aria-label="Mover para baixo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(a)} className="gap-1">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive.mutate(a)}
                    >
                      {a.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Excluir este banner?")) remove.mutate(a);
                      }}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar banner" : "Novo banner"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Imagem do banner</Label>
              {form.image_url ? (
                <div className="relative h-36 w-full overflow-hidden rounded-lg border bg-muted">
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <label className="flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  {uploading ? "Enviando..." : "Clique para enviar imagem"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                    }}
                  />
                </label>
              )}
              <p className="text-xs text-muted-foreground">
                Recomendado: 1600×600px para ficar nítido em desktop e mobile.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="t">Título</Label>
              <Input
                id="t"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex.: Promoção de fim de mês"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="s">Subtítulo (opcional)</Label>
              <Textarea
                id="s"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="Texto secundário"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="l">Link (opcional)</Label>
              <Input
                id="l"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="cursor-pointer">Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Banners inativos não aparecem no carrossel.
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAnunciosPage;
