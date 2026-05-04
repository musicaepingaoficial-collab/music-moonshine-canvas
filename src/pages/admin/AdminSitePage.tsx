import { useEffect, useState } from "react";
import { useSiteSettings, useUpdateSiteSettings } from "@/hooks/useSiteSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, MessageCircle, Save, Disc } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AdminSitePage = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const update = useUpdateSiteSettings();

  const [maintenance, setMaintenance] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [discografiasValor, setDiscografiasValor] = useState("0");

  useEffect(() => {
    if (settings) {
      setMaintenance(settings.maintenance_mode);
      setTitle(settings.maintenance_title);
      setMessage(settings.maintenance_message);
      setWhatsapp(settings.whatsapp_number || "");
      setDiscografiasValor(settings.discografias_valor?.toString() || "0");
    }
  }, [settings]);

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
    </div>
  );
};

export default AdminSitePage;
