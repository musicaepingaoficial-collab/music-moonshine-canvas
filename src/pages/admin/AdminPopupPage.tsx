import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, Eye, MessageCircle, Send, Instagram, Link as LinkIcon, Users, Settings, Megaphone, CheckCircle2, X } from "lucide-react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useUpdateWelcomePopup,
  useAllWelcomePopups,
  useCreateWelcomePopup,
  useDeleteWelcomePopup,
  type PopupLink,
} from "@/hooks/useWelcomePopup";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

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
  delay_seconds: z.number().int().min(0).max(3600),
  priority: z.number().int().min(0).max(999),
  plan_slug: z.string().nullable(),
  discount_coupon: z.string().nullable(),
  cta_label: z.string().nullable(),
  exclude_plan_slugs: z.array(z.string()),
  include_plan_slugs: z.array(z.string()),
});

const AdminPopupPage = () => {
  const { data: popups = [], isLoading } = useAllWelcomePopups();
  const update = useUpdateWelcomePopup();
  const createPopup = useCreateWelcomePopup();
  const deletePopup = useDeleteWelcomePopup();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const data = popups.find((p) => p.id === selectedId) || popups[0] || null;

  const [delaySeconds, setDelaySeconds] = useState(0);
  const [priority, setPriority] = useState(0);

  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [links, setLinks] = useState<PopupLink[]>([]);
  const [showToNew, setShowToNew] = useState(true);
  const [showToSubs, setShowToSubs] = useState(false);
  const [newDays, setNewDays] = useState(7);
  const [planSlug, setPlanSlug] = useState<string | null>(null);
  const [discountCoupon, setDiscountCoupon] = useState<string | null>(null);
  const [ctaLabel, setCtaLabel] = useState<string | null>(null);
  const [excludePlanSlugs, setExcludePlanSlugs] = useState<string[]>([]);
  const [includePlanSlugs, setIncludePlanSlugs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);

  const { data: plans } = useQuery({
    queryKey: ["admin-plans-popup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("planos").select("slug, name, price").eq("active", true);
      if (error) throw error;
      return data;
    }
  });

  const { data: couponInfo } = useQuery({
    queryKey: ["admin-popup-coupon", discountCoupon],
    queryFn: async () => {
      const { data } = await supabase
        .from("cupons")
        .select("desconto_percentual")
        .eq("codigo", (discountCoupon || "").toUpperCase())
        .eq("ativo", true)
        .maybeSingle();
      return data;
    },
    enabled: !!discountCoupon,
  });

  useEffect(() => {
    if (!data) return;
    if (!selectedId) setSelectedId(data.id);
    setActive(data.active);
    setTitle(data.title);
    setDescription(data.description);
    setImageUrl(data.image_url);
    setLinks(data.links || []);
    setShowToNew(data.show_to_new);
    setShowToSubs(data.show_to_subscribers);
    setNewDays(data.new_user_days);
    setDelaySeconds((data as any).delay_seconds ?? 0);
    setPriority(data.priority ?? 0);
    setPlanSlug(data.plan_slug || null);
    setDiscountCoupon(data.discount_coupon || null);
    setCtaLabel(data.cta_label || null);
    setExcludePlanSlugs(data.exclude_plan_slugs || []);
    setIncludePlanSlugs(data.include_plan_slugs || []);
  }, [data, selectedId]);

  const handleNew = async () => {
    try {
      const created = await createPopup.mutateAsync({
        title: "Novo popup",
        description: "",
        image_url: null,
        links: [],
        active: false,
        show_to_new: true,
        show_to_subscribers: false,
        new_user_days: 7,
        delay_seconds: 0,
        priority: 0,
        plan_slug: null,
        discount_coupon: null,
        cta_label: null,
        exclude_plan_slugs: [],
        include_plan_slugs: [],
      } as any);
      setSelectedId(created.id);
      toast.success("Popup criado");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar popup");
    }
  };

  const handleDelete = async () => {
    if (!data) return;
    try {
      await deletePopup.mutateAsync(data.id);
      setSelectedId(null);
      toast.success("Popup excluído");
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir");
    }
  };


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


  const togglePlanSelection = (slug: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(slug)) {
      setList(list.filter(s => s !== slug));
    } else {
      setList([...list, slug]);
    }
  };

  const handleSave = async () => {
    const isNew = !data;
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
      discount_coupon: discountCoupon,
      cta_label: ctaLabel,
      exclude_plan_slugs: excludePlanSlugs,
      include_plan_slugs: includePlanSlugs,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first.message);
      return;
    }
    try {
      if (isNew) {
        const { error } = await supabase.from("welcome_popup").insert({
          ...parsed.data,
          version: 1,
          priority: 0
        });
        if (error) throw error;
      } else {
        await update.mutateAsync({
          id: data.id,
          values: { ...parsed.data, version: data.version + 1 } as any,
        });
      }
      toast.success("Popup salvo e atualizado.");
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Banner
        title="Popup de Boas-vindas"
        subtitle="Gerencie avisos, promoções e grupos que aparecem ao entrar no sistema."
      />

      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">Status do Popup</h3>
            <p className="text-sm text-muted-foreground">O popup está atualmente {active ? 'visível' : 'desativado'} para os usuários.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{active ? 'Ativo' : 'Inativo'}</span>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="content" className="gap-2">
            <Settings className="h-4 w-4" /> Conteúdo
          </TabsTrigger>
          <TabsTrigger value="targeting" className="gap-2">
            <Users className="h-4 w-4" /> Público-Alvo
          </TabsTrigger>
          <TabsTrigger value="promo" className="gap-2">
            <Megaphone className="h-4 w-4" /> Promoção
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo Visual</CardTitle>
              <CardDescription>Defina o que o usuário verá no popup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título Principal</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={120}
                      placeholder="Ex: Oferta Exclusiva!"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto de Apoio</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={5}
                      maxLength={1000}
                      placeholder="Descreva a promoção ou o aviso aqui..."
                    />
                    <div className="text-[10px] text-muted-foreground text-right uppercase tracking-wider">
                      {description.length} / 1000 caracteres
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Imagem de Destaque</Label>
                  <div className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center min-h-[200px] bg-muted/30">
                    {imageUrl ? (
                      <div className="relative w-full group">
                        <img
                          src={imageUrl}
                          alt="preview"
                          className="w-full h-48 object-cover rounded-lg border border-border shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setImageUrl(null)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Remover
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-3">
                        <div className="p-3 bg-card rounded-full inline-block border border-border">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Nenhuma imagem selecionada</p>
                          <p className="text-xs text-muted-foreground">Recomendado: 800x400px</p>
                        </div>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUpload(f);
                            }}
                          />
                          <Button asChild variant="secondary" size="sm" disabled={uploading}>
                            <span>{uploading ? "Enviando..." : "Selecionar Imagem"}</span>
                          </Button>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-bold">Botões e Links Extras</Label>
                  <Button size="sm" variant="outline" onClick={addLink} disabled={links.length >= 10}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Link
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {links.length === 0 && (
                    <div className="text-center py-8 border border-dashed rounded-lg bg-muted/20">
                      <p className="text-sm text-muted-foreground">Nenhum link adicional cadastrado.</p>
                    </div>
                  )}
                  {links.map((l, i) => (
                    <div key={i} className="flex gap-3 items-end bg-muted/30 p-3 rounded-lg border border-border">
                      <div className="w-32">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Ícone</Label>
                        <Select
                          value={l.icon ?? "link"}
                          onValueChange={(v) => updateLink(i, { icon: v as PopupLink["icon"] })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ICON_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <opt.Icon className="h-3 w-3" />
                                  {opt.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Rótulo do Botão</Label>
                        <Input
                          value={l.label}
                          onChange={(e) => updateLink(i, { label: e.target.value })}
                          maxLength={60}
                          className="h-9"
                          placeholder="Ex: Grupo VIP"
                        />
                      </div>
                      <div className="flex-[2]">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">URL de Destino</Label>
                        <Input
                          value={l.url}
                          onChange={(e) => updateLink(i, { url: e.target.value })}
                          placeholder="https://..."
                          className="h-9"
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeLink(i)}
                        className="text-destructive h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targeting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Exibição</CardTitle>
              <CardDescription>Controle exatamente quem verá este popup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="space-y-1">
                    <Label className="text-base">Usuários Novos / Sem Plano</Label>
                    <p className="text-sm text-muted-foreground">Pessoas que acabaram de se cadastrar ou não possuem assinatura ativa.</p>
                  </div>
                  <Switch checked={showToNew} onCheckedChange={setShowToNew} />
                </div>

                {showToNew && (
                  <div className="flex items-center gap-4 pl-6 py-2 border-l-2 border-primary/20">
                    <Label className="text-sm whitespace-nowrap">Considerar "novo" por até</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={365}
                        value={newDays}
                        onChange={(e) => setNewDays(Number(e.target.value))}
                        className="w-20 h-9"
                      />
                      <span className="text-sm text-muted-foreground">dias (0 = qualquer não-assinante)</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="space-y-1">
                    <Label className="text-base">Assinantes Ativos</Label>
                    <p className="text-sm text-muted-foreground">Pessoas que já possuem um plano pago ativo.</p>
                  </div>
                  <Switch checked={showToSubs} onCheckedChange={setShowToSubs} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-destructive/10 text-destructive rounded-md">
                      <X className="h-4 w-4" />
                    </div>
                    <Label className="text-base font-bold">Ocultar para estes planos</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Útil para não mostrar promoção de Vitalício para quem já é Vitalício.</p>
                  <div className="grid grid-cols-1 gap-2">
                    {plans?.map((p) => (
                      <div key={p.slug} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md transition-colors">
                        <Checkbox 
                          id={`ex-${p.slug}`} 
                          checked={excludePlanSlugs.includes(p.slug)}
                          onCheckedChange={() => togglePlanSelection(p.slug, excludePlanSlugs, setExcludePlanSlugs)}
                        />
                        <label htmlFor={`ex-${p.slug}`} className="text-sm font-medium leading-none cursor-pointer">
                          {p.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-md">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <Label className="text-base font-bold">Mostrar SOMENTE para estes</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Se algum for selecionado, apenas estes usuários verão o popup.</p>
                  <div className="grid grid-cols-1 gap-2">
                    {plans?.map((p) => (
                      <div key={p.slug} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md transition-colors">
                        <Checkbox 
                          id={`in-${p.slug}`} 
                          checked={includePlanSlugs.includes(p.slug)}
                          onCheckedChange={() => togglePlanSelection(p.slug, includePlanSlugs, setIncludePlanSlugs)}
                        />
                        <label htmlFor={`in-${p.slug}`} className="text-sm font-medium leading-none cursor-pointer">
                          {p.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Promoção Direta</CardTitle>
              <CardDescription>Configure um botão que leva direto ao checkout com desconto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Plano de Destino</Label>
                  <Select value={planSlug || "none"} onValueChange={(v) => setPlanSlug(v === "none" ? null : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (desativa botão de oferta)</SelectItem>
                      {plans?.map((p) => (
                        <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Ao clicar, o usuário será levado para a página de ofertas com este plano pré-selecionado.</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Cupom de Desconto Automático</Label>
                  <Input 
                    value={discountCoupon || ""} 
                    onChange={(e) => setDiscountCoupon(e.target.value || null)}
                    placeholder="Ex: VITALICIO20"
                  />
                  <p className="text-[10px] text-muted-foreground">O cupom será aplicado automaticamente no checkout.</p>
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <Label>Texto do Botão Principal</Label>
                <Input 
                  value={ctaLabel || ""} 
                  onChange={(e) => setCtaLabel(e.target.value || null)} 
                  placeholder="Ex: Aproveitar Oferta Agora"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-6 right-6 flex gap-3 z-50">
        <Button size="lg" variant="outline" onClick={() => setPreview(true)} className="gap-2 bg-background shadow-xl">
          <Eye className="h-5 w-5" />
          Testar Visual
        </Button>
        <Button size="lg" onClick={handleSave} disabled={update.isPending} className="gap-2 shadow-xl px-8">
          {update.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          Publicar Popup
        </Button>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          {imageUrl && (
            <img src={imageUrl} alt={title} className="w-full h-48 object-cover" />
          )}
          <div className="p-6 space-y-5 bg-card">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-foreground leading-tight">{title || "Título de Exemplo"}</h2>
              {description && (
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            
            <div className="space-y-3">
              {planSlug && (() => {
                const basePrice = Number(plans?.find((p: any) => p.slug === planSlug)?.price ?? 0);
                const pct = Number(couponInfo?.desconto_percentual ?? 0);
                const finalPrice = basePrice * (1 - pct / 100);
                return (
                  <div className="space-y-2">
                    <div className="flex flex-col items-center">
                      {pct > 0 && (
                        <span className="text-[10px] uppercase font-bold text-muted-foreground line-through">
                          De R$ {basePrice.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                      <span className="text-sm font-bold text-emerald-500">
                        Por apenas R$ {finalPrice.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <Button 
                      className="w-full h-14 gap-3 text-lg font-black shadow-lg shadow-primary/30 uppercase tracking-tighter"
                      onClick={() => setPreview(false)}
                    >
                      <Megaphone className="h-6 w-6" />
                      {ctaLabel || "Aproveitar Oferta Agora"}
                    </Button>
                  </div>
                );
              })()}
              
              {links.map((l, i) => {
                const opt = ICON_OPTIONS.find((o) => o.value === (l.icon ?? "link"))!;
                const Icon = opt.Icon;
                return (
                  <Button key={i} variant="outline" className="w-full justify-start gap-3 h-12 border-primary/20 bg-primary/5 hover:bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-bold">{l.label || "Link sem rótulo"}</span>
                  </Button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
              <Button onClick={() => setPreview(false)} variant="ghost" size="sm" className="text-[10px] uppercase font-bold tracking-widest h-8">
                Avisar depois
              </Button>
              <Button onClick={() => setPreview(false)} variant="ghost" size="sm" className="text-[10px] uppercase font-bold tracking-widest h-8 text-muted-foreground">
                Não mostrar mais
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPopupPage;
