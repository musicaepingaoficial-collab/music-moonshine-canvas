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
import { AlertTriangle, MessageCircle, Save, Disc, Ticket, Trash2, Video, Upload, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const AdminSitePage = () => {
  const queryClient = useQueryClient();
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
        },
      });

      // Also update the hidden 'discografias' plan price for Mercado Pago integration
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações do site</h1>
        <p className="text-sm text-muted-foreground">
          Controle do modo manutenção e número de WhatsApp usado em todo o site.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Modo manutenção</CardTitle>
            <CardDescription>
              Quando ativo, apenas administradores logados acessam o site.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {maintenance ? "Manutenção ativa" : "Site no ar"}
            </span>
            <Switch checked={maintenance} onCheckedChange={setMaintenance} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {maintenance && (
            <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Site fora do ar</p>
                <p className="text-sm text-destructive/80">
                  O site público está em modo manutenção. Apenas /admin e /login permanecem acessíveis.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Número de WhatsApp do site
            </Label>
            <Input
              id="whatsapp"
              placeholder="5588981258499"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
            />
            <p className="text-xs text-muted-foreground">
              Formato internacional sem símbolos: 55 + DDD + número. Ex: 5588981258499.
            </p>
          </div>

          <div className="space-y-4 border-t border-border/50 pt-5">
            <p className="text-sm font-medium text-foreground">Venda de Módulos</p>
            <div className="space-y-2">
              <Label htmlFor="disc-valor" className="flex items-center gap-2">
                <Disc className="h-4 w-4" />
                Valor do Módulo Discografias (R$)
              </Label>
              <Input
                id="disc-valor"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={discografiasValor}
                onChange={(e) => setDiscografiasValor(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Define o preço para compra avulsa do módulo pelas discografias.
              </p>
            </div>
          </div>

          <div className="space-y-3 border-t border-border/50 pt-5">
            <p className="text-sm font-medium text-foreground">Página de manutenção</p>
            <div className="space-y-2">
              <Label htmlFor="m-title">Título</Label>
              <Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-msg">Mensagem amigável</Label>
              <Textarea
                id="m-msg"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={update.isPending}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-4 w-4" />
              {update.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Cupons de Desconto
          </CardTitle>
          <CardDescription>Crie códigos promocionais para seus clientes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input placeholder="EX: PROMO20" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Desconto (%)</Label>
              <Input type="number" placeholder="20" value={couponPercent} onChange={e => setCouponPercent(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Limite de usos</Label>
              <Input type="number" placeholder="Opcional" value={couponLimit} onChange={e => setCouponLimit(e.target.value)} />
            </div>
            <Button onClick={() => createCoupon.mutate()} disabled={createCoupon.isPending}>
              Criar Cupom
            </Button>
          </div>

          <div className="rounded-md border border-border mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons?.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-bold">{c.codigo}</TableCell>
                    <TableCell>{c.desconto_percentual}%</TableCell>
                    <TableCell>{c.uso_atual} / {c.uso_limite || "∞"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteCoupon.mutate(c.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!coupons || coupons.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Nenhum cupom ativo.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSitePage;
