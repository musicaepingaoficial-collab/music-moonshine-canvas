import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings, useUpdateSiteSettings } from "@/hooks/useSiteSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, MessageCircle, Save, Disc, Ticket, Trash2, Video, Upload, Loader2, Globe, Settings, CreditCard, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const AdminSitePage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState("");
  const [couponPercent, setCouponPercent] = useState("");
  const [couponLimit, setCouponLimit] = useState("");

  const { data: coupons, isLoading: loadingCoupons } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createCoupon = useMutation({
    mutationFn: async () => {
      if (!couponCode || !couponPercent) throw new Error("Preencha código e desconto");
      const { error } = await supabase.from("cupons").insert({
        codigo: couponCode.toUpperCase(),
        desconto_percentual: parseFloat(couponPercent),
        uso_limite: couponLimit ? parseInt(couponLimit) : null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Cupom criado" });
      setCouponCode("");
      setCouponPercent("");
      setCouponLimit("");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" })
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Cupom excluído" });
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    }
  });
  const { data: settings, isLoading } = useSiteSettings();
  const update = useUpdateSiteSettings();

  const [maintenance, setMaintenance] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [discografiasValor, setDiscografiasValor] = useState("0");
  const [salesVideoUrl, setSalesVideoUrl] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);

  useEffect(() => {
    if (settings) {
      setMaintenance(settings.maintenance_mode);
      setTitle(settings.maintenance_title);
      setMessage(settings.maintenance_message);
      setWhatsapp(settings.whatsapp_number || "");
      setDiscografiasValor(settings.discografias_valor?.toString() || "0");
      setSalesVideoUrl(settings.sales_video_url || "");
    }
  }, [settings]);

  const handleVideoUpload = async (file: File) => {
    setUploadingVideo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `sales-video/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("anuncios-images")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("anuncios-images").getPublicUrl(path);
      setSalesVideoUrl(pub.publicUrl);
      toast({ title: "Vídeo enviado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      await update.mutateAsync({
        id: settings.id,
        values: {
          maintenance_mode: maintenance,
          maintenance_title: title,
          maintenance_message: message,
          whatsapp_number: whatsapp || null,
          discografias_valor: parseFloat(discografiasValor) || 0,
          sales_video_url: salesVideoUrl || null,
        },
      });

      const priceVal = parseFloat(discografiasValor) || 0;
      await supabase
        .from("planos")
        .update({ price: priceVal })
        .eq("slug", "discografias");

      toast({ title: "Configurações salvas", description: "As alterações foram aplicadas." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-foreground tracking-tight">Gerenciamento do Site</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Settings className="h-4 w-4" /> Personalize a experiência e regras do seu aplicativo.
          </p>
        </div>
        <Button 
          variant="secondary" 
          className="gap-2 font-bold h-11 px-6 shadow-sm border border-border/50"
          onClick={() => navigate('/ofertas')}
        >
          <ExternalLink className="h-4 w-4" /> Ver Página de Vendas
        </Button>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="geral" className="gap-2 py-3 rounded-lg data-[state=active]:shadow-md">
            <Globe className="h-4 w-4" /> Configurações Gerais
          </TabsTrigger>
          <TabsTrigger value="vsl" className="gap-2 py-3 rounded-lg data-[state=active]:shadow-md">
            <Video className="h-4 w-4" /> Vídeo de Vendas (VSL)
          </TabsTrigger>
          <TabsTrigger value="cupons" className="gap-2 py-3 rounded-lg data-[state=active]:shadow-md">
            <Ticket className="h-4 w-4" /> Cupons & Preços
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6 animate-in fade-in-50 duration-300">
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Comunicação & Status</CardTitle>
                  <CardDescription>Defina o contato oficial e o estado do sistema.</CardDescription>
                </div>
                <div className="flex items-center gap-3 bg-card p-2 px-3 rounded-full border border-border shadow-inner">
                  <span className={`text-xs font-black uppercase tracking-widest ${maintenance ? "text-destructive" : "text-emerald-500"}`}>
                    {maintenance ? "Modo Manutenção" : "Online"}
                  </span>
                  <Switch checked={maintenance} onCheckedChange={setMaintenance} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              {maintenance && (
                <div className="flex gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-5 animate-in slide-in-from-top-2">
                  <div className="p-2 bg-destructive/10 rounded-full h-fit">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-destructive uppercase text-sm tracking-tight">Atenção: O site está bloqueado</p>
                    <p className="text-sm text-destructive/80 leading-relaxed">
                      Visitantes verão a página de manutenção. Apenas administradores logados podem navegar normalmente.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                      <MessageCircle className="h-3 w-3" /> WhatsApp de Suporte
                    </Label>
                    <Input
                      id="whatsapp"
                      placeholder="Ex: 5588999999999"
                      value={whatsapp}
                      className="h-11 font-medium"
                      onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
                    />
                    <p className="text-[10px] text-muted-foreground leading-tight italic">
                      Dica: Use 55 + DDD + Número. Este número aparecerá nos botões de contato.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="disc-valor" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                      <CreditCard className="h-3 w-3" /> Valor do Módulo Discografias
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">R$</span>
                      <Input
                        id="disc-valor"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={discografiasValor}
                        className="h-11 pl-10 font-black text-lg"
                        onChange={(e) => setDiscografiasValor(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/50">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Customização da Manutenção</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="m-title" className="text-xs">Título de Aviso</Label>
                    <Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="m-msg" className="text-xs">Mensagem Detalhada</Label>
                    <Textarea
                      id="m-msg"
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vsl" className="animate-in fade-in-50 duration-300">
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle>Vídeo de Vendas Estratégico</CardTitle>
              <CardDescription>O VSL aparece no topo da página de ofertas para converter mais clientes.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="video-url" className="text-xs font-bold uppercase text-muted-foreground">Link do Vídeo</Label>
                    <div className="flex gap-2">
                      <Input
                        id="video-url"
                        placeholder="Link do YouTube ou Vimeo..."
                        value={salesVideoUrl}
                        onChange={(e) => setSalesVideoUrl(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="p-6 border-2 border-dashed border-border rounded-2xl bg-muted/10 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-3 bg-card rounded-full border border-border shadow-sm">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold">Subir Vídeo Próprio</p>
                      <p className="text-[11px] text-muted-foreground">O vídeo será hospedado no seu banco de dados.</p>
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVideoUpload(file);
                        }}
                      />
                      <Button variant="secondary" size="sm" type="button" disabled={uploadingVideo} className="h-9 px-6 font-bold">
                        {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Video className="h-4 w-4 mr-2" />}
                        Selecionar Arquivo
                      </Button>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Preview do Player</Label>
                  <div className="aspect-video bg-black rounded-xl border border-border flex items-center justify-center overflow-hidden shadow-2xl relative group">
                    {salesVideoUrl ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/10">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-pulse" />
                        <span className="sr-only">Vídeo Configurado</span>
                      </div>
                    ) : (
                      <Video className="h-12 w-12 text-muted-foreground/30" />
                    )}
                    <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-2 rounded-lg text-[10px] text-white/80 font-medium border border-white/10">
                      O vídeo aparecerá em destaque na Página de Vendas.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cupons" className="animate-in fade-in-50 duration-300">
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle>Campanhas de Desconto</CardTitle>
              <CardDescription>Gerencie seus cupons e aumente suas vendas com ofertas temporárias.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/20 p-5 rounded-2xl border border-border">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold tracking-wider">Código</Label>
                  <Input placeholder="PROMO20" value={couponCode} onChange={e => setCouponCode(e.target.value)} className="h-10 uppercase font-black" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold tracking-wider">Desconto (%)</Label>
                  <Input type="number" placeholder="20" value={couponPercent} onChange={e => setCouponPercent(e.target.value)} className="h-10 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold tracking-wider">Limite de Usos</Label>
                  <Input type="number" placeholder="Infinito" value={couponLimit} onChange={e => setCouponLimit(e.target.value)} className="h-10 font-bold" />
                </div>
                <Button className="h-10 font-black uppercase tracking-tight shadow-lg shadow-primary/20" onClick={() => createCoupon.mutate()} disabled={createCoupon.isPending}>
                  {createCoupon.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar Cupom"}
                </Button>
              </div>

              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-border">
                      <TableHead className="text-[10px] uppercase font-black tracking-widest py-4">Cupom</TableHead>
                      <TableHead className="text-[10px] uppercase font-black tracking-widest py-4">Valor</TableHead>
                      <TableHead className="text-[10px] uppercase font-black tracking-widest py-4">Resgates</TableHead>
                      <TableHead className="text-[10px] uppercase font-black tracking-widest py-4 text-right pr-6">Gerenciar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons?.map(c => (
                      <TableRow key={c.id} className="hover:bg-muted/30 transition-colors border-border">
                        <TableCell className="font-black text-primary tracking-tight">{c.codigo}</TableCell>
                        <TableCell className="font-bold">{c.desconto_percentual}% OFF</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{c.uso_atual}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">/ {c.uso_limite || "∞"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button variant="ghost" size="icon" onClick={() => deleteCoupon.mutate(c.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!coupons || coupons.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">Nenhum cupom ativo no momento.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={handleSave}
          disabled={update.isPending}
          className="gap-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xl h-14 px-10 rounded-full font-black uppercase tracking-widest"
        >
          {update.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {update.isPending ? "Salvando..." : "Aplicar Alterações"}
        </Button>
      </div>
    </div>
  );
};

export default AdminSitePage;
