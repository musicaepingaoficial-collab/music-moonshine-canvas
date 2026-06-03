import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, Eye, MessageCircle, Send, Instagram, Link as LinkIcon } from "lucide-react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useUpdateWelcomePopup,
  useWelcomePopupSettings,
  type PopupLink,
} from "@/hooks/useWelcomePopup";

const ICON_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { value: "telegram", label: "Telegram", Icon: Send },
  { value: "instagram", label: "Instagram", Icon: Instagram },
  { value: "link", label: "Link", Icon: LinkIcon },
] as const;

const linkSchema = z.object({
  label: z.string().trim().min(1, "Rótulo obrigatório").max(60),
  url: z.string().trim().url("URL inválida").max(500),
  icon: z.enum(["whatsapp", "telegram", "instagram", "link"]).optional(),
});

const formSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(120),
  description: z.string().trim().max(1000),
  image_url: z.string().nullable(),
  links: z.array(linkSchema).max(10),
  active: z.boolean(),
  show_to_new: z.boolean(),
  show_to_subscribers: z.boolean(),
  new_user_days: z.number().int().min(0).max(365),
  plan_slug: z.string().nullable(),
  discount_coupon: z.string().nullable(),
  cta_label: z.string().nullable(),
});

const AdminPopupPage = () => {
  const { data, isLoading } = useWelcomePopupSettings();
  const update = useUpdateWelcomePopup();

  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [links, setLinks] = useState<PopupLink[]>([]);
  const [showToNew, setShowToNew] = useState(true);
  const [showToSubs, setShowToSubs] = useState(false);
  const [newDays, setNewDays] = useState(7);
  const [planSlug, setPlanSlug] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [ctaLabel, setCtaLabel] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);

  const { data: plans } = useQuery({
    queryKey: ["admin-plans-popup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("planos").select("slug, name").eq("active", true);
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (!data) return;
    setActive(data.active);
    setTitle(data.title);
    setDescription(data.description);
    setImageUrl(data.image_url);
    setLinks(data.links || []);
    setShowToNew(data.show_to_new);
    setShowToSubs(data.show_to_subscribers);
    setNewDays(data.new_user_days);
    setPlanSlug(data.plan_slug || null);
    setDiscountPercent(data.discount_percent || null);
    setCtaLabel(data.cta_label || null);
  }, [data]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `welcome-popup/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("anuncios-images")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("anuncios-images").getPublicUrl(path);
      setImageUrl(pub.publicUrl);
      toast.success("Imagem enviada");
    } catch (err: any) {
      toast.error(err.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const addLink = () =>
    setLinks((prev) => [...prev, { label: "", url: "", icon: "link" }]);
  const updateLink = (i: number, patch: Partial<PopupLink>) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLink = (i: number) =>
    setLinks((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!data) return;
    const parsed = formSchema.safeParse({
      title,
      description,
      image_url: imageUrl,
      links,
      active,
      show_to_new: showToNew,
      show_to_subscribers: showToSubs,
      new_user_days: newDays,
      plan_slug: planSlug,
      discount_percent: discountPercent,
      cta_label: ctaLabel,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first.message);
      return;
    }
    try {
      await update.mutateAsync({
        id: data.id,
        values: { ...parsed.data, version: data.version + 1 } as any,
      });
      toast.success("Popup salvo. Será reexibido aos usuários.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Banner
        title="Popup de Boas-vindas"
        subtitle="Configure um popup com grupos e promoções para usuários do sistema."
      />

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Popup ativo</Label>
            <p className="text-xs text-muted-foreground">
              Quando desligado, ninguém vê o popup.
            </p>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>

        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Bem-vindo ao Música e Pinga!"
          />
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Entre nos nossos grupos e fique por dentro das novidades!"
          />
          <p className="text-xs text-muted-foreground text-right">
            {description.length}/1000
          </p>
        </div>

        <div className="space-y-2">
          <Label>Imagem (opcional)</Label>
          {imageUrl && (
            <div className="relative w-full max-w-sm">
              <img
                src={imageUrl}
                alt="preview"
                className="w-full h-40 object-cover rounded-lg border border-border"
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={() => setImageUrl(null)}
              >
                Remover
              </Button>
            </div>
          )}
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
            <Button asChild variant="outline" disabled={uploading}>
              <span>
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {imageUrl ? "Trocar imagem" : "Enviar imagem"}
              </span>
            </Button>
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Links / Grupos / Promoções</Label>
            <Button size="sm" variant="outline" onClick={addLink} disabled={links.length >= 10}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
          {links.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum link cadastrado.</p>
          )}
          {links.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3">
                <Label className="text-xs">Ícone</Label>
                <Select
                  value={l.icon ?? "link"}
                  onValueChange={(v) => updateLink(i, { icon: v as PopupLink["icon"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Rótulo</Label>
                <Input
                  value={l.label}
                  onChange={(e) => updateLink(i, { label: e.target.value })}
                  maxLength={60}
                />
              </div>
              <div className="col-span-5">
                <Label className="text-xs">URL</Label>
                <Input
                  value={l.url}
                  onChange={(e) => updateLink(i, { url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeLink(i)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 border-t border-border pt-5">
          <Label className="text-base">Promoção de Plano (Opcional)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plano para oferta</Label>
              <Select value={planSlug || "none"} onValueChange={(v) => setPlanSlug(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {plans?.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Desconto (%)</Label>
              <Input 
                type="number" 
                min={0} 
                max={100} 
                value={discountPercent || ""} 
                onChange={(e) => setDiscountPercent(e.target.value ? Number(e.target.value) : null)}
                placeholder="Ex: 20"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Texto do Botão de Assinar</Label>
            <Input 
              value={ctaLabel || ""} 
              onChange={(e) => setCtaLabel(e.target.value || null)} 
              placeholder="Ex: Assinar com Desconto"
            />
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <Label className="text-base">Quem deve ver</Label>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Usuários novos / sem assinatura</p>
              <p className="text-xs text-muted-foreground">
                Mostra para quem se enquadra na regra abaixo.
              </p>
            </div>
            <Switch checked={showToNew} onCheckedChange={setShowToNew} />
          </div>

          {showToNew && (
            <div className="flex items-center gap-2 pl-4">
              <Label className="text-xs">Considerar "novo" até</Label>
              <Input
                type="number"
                min={0}
                max={365}
                value={newDays}
                onChange={(e) => setNewDays(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-xs text-muted-foreground">
                dias após cadastro (0 = qualquer não-assinante)
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Assinantes ativos</p>
              <p className="text-xs text-muted-foreground">
                Inclui também quem já tem plano ativo.
              </p>
            </div>
            <Switch checked={showToSubs} onCheckedChange={setShowToSubs} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreview(true)} className="gap-2">
            <Eye className="h-4 w-4" />
            Pré-visualizar
          </Button>
          <Button onClick={handleSave} disabled={update.isPending} className="ml-auto">
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </div>
      </Card>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {imageUrl && (
            <img src={imageUrl} alt={title} className="w-full h-44 object-cover" />
          )}
          <div className="p-6 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">{title || "Título"}</h2>
            {description && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {description}
              </p>
            )}
            <div className="space-y-2">
              {links.map((l, i) => {
                const opt = ICON_OPTIONS.find((o) => o.value === (l.icon ?? "link"))!;
                const Icon = opt.Icon;
                return (
                  <Button key={i} variant="outline" className="w-full justify-start gap-2 h-12">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-medium">{l.label || "(sem rótulo)"}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPopupPage;
