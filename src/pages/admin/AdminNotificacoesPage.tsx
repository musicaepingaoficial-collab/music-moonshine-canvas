import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useUser";
import { supabase } from "@/integrations/supabase/client";
import {
  isPushSupported,
  getCurrentSubscription,
  subscribePush,
  unsubscribePush,
  subscriptionToRow,
} from "@/lib/webpush";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Send, ShoppingCart, QrCode } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const NOTIFICATION_TYPES = [
  {
    key: "notify_purchase" as const,
    icon: ShoppingCart,
    title: "Compra aprovada",
    description: "Receba um aviso quando um pagamento for confirmado.",
  },
  {
    key: "notify_pix_generated" as const,
    icon: QrCode,
    title: "Pix gerado",
    description: "Receba quando um Pix for gerado, aguardando pagamento.",
  },
];

const AdminNotificacoesPage = () => {
  const { user } = useAuth();
  const [supported] = useState(isPushSupported());
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [busy, setBusy] = useState(false);

  const [prefs, setPrefs] = useState({
    notify_purchase: true,
    notify_pix_generated: true,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const sub = await getCurrentSubscription();
      setSubscribed(!!sub);

      const { data } = await (supabase.from("admin_notification_prefs" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          notify_purchase: data.notify_purchase,
          notify_pix_generated: data.notify_pix_generated,
        });
      }
    })();
  }, [user]);

  const handleEnable = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const sub = await subscribePush();
      const row = subscriptionToRow(sub);
      const { error } = await (supabase.from("admin_push_subscriptions" as any) as any).upsert(
        { user_id: user.id, ...row },
        { onConflict: "endpoint" }
      );
      if (error) throw error;
      setSubscribed(true);
      setPermission("granted");
      toast({ title: "Notificações ativadas", description: "Você receberá push neste dispositivo." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      const current = await getCurrentSubscription();
      const endpoint = current?.endpoint;
      await unsubscribePush();
      if (endpoint) {
        await (supabase.from("admin_push_subscriptions" as any) as any)
          .delete()
          .eq("endpoint", endpoint);
      }
      setSubscribed(false);
      toast({ title: "Notificações desativadas" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const updatePref = async (key: keyof typeof prefs, value: boolean) => {
    if (!user) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const { error } = await (supabase.from("admin_notification_prefs" as any) as any).upsert(
      { user_id: user.id, ...next },
      { onConflict: "user_id" }
    );
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setPrefs(prefs);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("send-admin-push", {
        body: {
          type: "test",
          title: "🔔 Notificação de teste",
          body: "Push está funcionando neste dispositivo.",
          url: "/admin",
        },
      });
      if (error) throw error;
      toast({ title: "Teste enviado", description: "Aguarde a notificação chegar." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notificações Admin</h1>
        <p className="text-sm text-muted-foreground">
          Receba push no celular ou desktop quando eventos importantes acontecerem.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {subscribed ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5" />}
            Push neste dispositivo
          </CardTitle>
          <CardDescription>
            {!supported
              ? "Este navegador não suporta push notifications."
              : permission === "denied"
              ? "Você bloqueou notificações. Libere nas configurações do navegador."
              : subscribed
              ? "Push ativo neste dispositivo."
              : "Ative para receber notificações mesmo com o app fechado."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {!subscribed ? (
            <Button onClick={handleEnable} disabled={!supported || busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Bell className="h-4 w-4 mr-2" />
              Ativar push neste dispositivo
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleDisable} disabled={busy}>
                <BellOff className="h-4 w-4 mr-2" />
                Desativar neste dispositivo
              </Button>
              <Button variant="secondary" onClick={handleTest} disabled={busy}>
                <Send className="h-4 w-4 mr-2" />
                Enviar teste
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de notificação</CardTitle>
          <CardDescription>Escolha quais eventos você quer receber.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_TYPES.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-4 rounded-lg border border-border/50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/15 p-2">
                  <t.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground">{t.title}</Label>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </div>
              <Switch
                checked={prefs[t.key]}
                onCheckedChange={(v) => updatePref(t.key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNotificacoesPage;
