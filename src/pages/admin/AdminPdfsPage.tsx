import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePdfs, type Pdf } from "@/hooks/usePdfs";

interface FormState {
  id?: string;
  title: string;
  description: string;
  author: string;
  access_type: "paid" | "subscriber_bonus";
  price: string;
  active: boolean;
  cover_url: string | null;
  file_path: string | null;
  file_size: number;
}

const empty: FormState = {
  title: "",
  description: "",
  author: "",
  access_type: "subscriber_bonus",
  price: "0",
  active: true,
  cover_url: null,
  file_path: null,
  file_size: 0,
};

export default function AdminPdfsPage() {
  const { data: pdfs, isLoading } = usePdfs({ adminMode: true });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setForm(empty);
    setCoverFile(null);
    setPdfFile(null);
    setOpen(true);
  };

  const openEdit = (p: Pdf) => {
    setForm({
      id: p.id,
      title: p.title,
      description: p.description ?? "",
      author: p.author ?? "",
      access_type: p.access_type,
      price: String(p.price),
      active: p.active,
      cover_url: p.cover_url,
      file_path: p.file_path,
      file_size: p.file_size,
    });
    setCoverFile(null);
    setPdfFile(null);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Título obrigatório");
      return;
    }
    if (!form.id && !pdfFile) {
      toast.error("Selecione o arquivo PDF");
      return;
    }
    if (form.access_type === "paid" && Number(form.price) <= 0) {
      toast.error("Preço precisa ser maior que zero para PDF pago");
      return;
    }

    setSaving(true);
    try {
      let cover_url = form.cover_url;
      let file_path = form.file_path;
      let file_size = form.file_size;

      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("pdf-covers").upload(path, coverFile, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("pdf-covers").getPublicUrl(path);
        cover_url = data.publicUrl;
      }

      if (pdfFile) {
        const path = `${crypto.randomUUID()}.pdf`;
        const { error } = await supabase.storage.from("pdfs").upload(path, pdfFile, {
          contentType: "application/pdf", upsert: false,
        });
        if (error) throw error;
        // remove arquivo antigo se substituído
        if (form.file_path) {
          await supabase.storage.from("pdfs").remove([form.file_path]);
        }
        file_path = path;
        file_size = pdfFile.size;
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        author: form.author.trim() || null,
        access_type: form.access_type,
        price: form.access_type === "paid" ? Number(form.price) : 0,
        active: form.active,
        cover_url,
        file_path: file_path!,
        file_size,
      };

      if (form.id) {
        const { error } = await supabase.from("pdfs").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pdfs").insert(payload);
        if (error) throw error;
      }

      toast.success("PDF salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["pdfs"] });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Pdf) => {
    if (!confirm(`Excluir "${p.title}"?`)) return;
    try {
      if (p.file_path) await supabase.storage.from("pdfs").remove([p.file_path]);
      const { error } = await supabase.from("pdfs").delete().eq("id", p.id);
      if (error) throw error;
      toast.success("PDF excluído");
      qc.invalidateQueries({ queryKey: ["pdfs"] });
    } catch (e: any) {
      toast.error(e.message || "Erro");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">PDFs</h1>
          <p className="text-sm text-muted-foreground">Gerencie PDFs vendidos avulso ou bônus para assinantes</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo PDF</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !pdfs?.length ? (
        <Card className="p-10 text-center text-muted-foreground">Nenhum PDF cadastrado.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pdfs.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="aspect-[3/4] bg-muted relative">
                {p.cover_url ? (
                  <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FileText className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                )}
                <Badge className="absolute top-2 left-2" variant={p.active ? "default" : "secondary"}>
                  {p.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-semibold line-clamp-1">{p.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{p.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    {p.access_type === "paid" ? `R$ ${Number(p.price).toFixed(2)}` : "Bônus assinantes"}
                  </Badge>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar PDF" : "Novo PDF"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Autor</Label>
              <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div>
              <Label>Capa</Label>
              <div className="flex items-center gap-3">
                {(coverFile || form.cover_url) && (
                  <img
                    src={coverFile ? URL.createObjectURL(coverFile) : form.cover_url!}
                    className="h-20 w-16 object-cover rounded border"
                    alt=""
                  />
                )}
                <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>

            <div>
              <Label>Arquivo PDF {form.id ? "(deixe vazio para manter)" : "*"}</Label>
              <Input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
              {form.file_path && !pdfFile && <p className="text-xs text-muted-foreground mt-1">Arquivo atual: {(form.file_size / 1024 / 1024).toFixed(2)} MB</p>}
            </div>

            <div>
              <Label>Tipo de acesso</Label>
              <RadioGroup
                value={form.access_type}
                onValueChange={(v) => setForm({ ...form, access_type: v as any })}
                className="mt-2"
              >
                <div className="flex items-start gap-2 rounded-lg border p-3">
                  <RadioGroupItem value="subscriber_bonus" id="bonus" className="mt-0.5" />
                  <Label htmlFor="bonus" className="flex-1 cursor-pointer font-normal">
                    <div className="font-medium">Bônus para assinantes</div>
                    <div className="text-xs text-muted-foreground">Liberado para quem tem assinatura ativa</div>
                  </Label>
                </div>
                <div className="flex items-start gap-2 rounded-lg border p-3">
                  <RadioGroupItem value="paid" id="paid" className="mt-0.5" />
                  <Label htmlFor="paid" className="flex-1 cursor-pointer font-normal">
                    <div className="font-medium">Pago avulso</div>
                    <div className="text-xs text-muted-foreground">Compra individual via PIX</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {form.access_type === "paid" && (
              <div>
                <Label>Preço (R$)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="font-medium">Ativo</Label>
                <p className="text-xs text-muted-foreground">Aparece para usuários no painel</p>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
