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
import { Bell, BellOff, Send, ShoppingCart, QrCode, History, CheckCircle2, XCircle, Copy, MessageCircle, Mail, User, DollarSign, Package, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type DateFilter = "today" | "yesterday" | "week" | "month" | "all" | "custom";
const PAGE_SIZE = 10;

function getRange(filter: DateFilter, custom?: { from?: Date; to?: Date }): { from: Date | null; to: Date | null } {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  switch (filter) {
    case "today": return { from: start, to: end };
    case "yesterday": {
      const f = new Date(start); f.setDate(f.getDate() - 1);
      const t = new Date(end); t.setDate(t.getDate() - 1);
      return { from: f, to: t };
    }
    case "week": {
      const f = new Date(start); f.setDate(f.getDate() - f.getDay());
      return { from: f, to: end };
    }
    case "month": {
      const f = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: f, to: end };
    }
    case "custom": {
      const f = custom?.from ? new Date(custom.from.setHours(0, 0, 0, 0)) : null;
      const t = custom?.to ? new Date(new Date(custom.to).setHours(23, 59, 59, 999)) : null;
      return { from: f, to: t };
    }
    default: return { from: null, to: null };
  }
}

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
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(0);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});

  const loadLogs = async () => {
    setLoadingLogs(true);
    const { from, to } = getRange(dateFilter, customRange);
    let q: any = (supabase.from("admin_push_logs" as any) as any)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    if (from) q = q.gte("created_at", from.toISOString());
    if (to) q = q.lte("created_at", to.toISOString());
    q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data: rawLogs, count } = await q;
    const list = (rawLogs || []) as any[];

    // Enrich older logs missing buyer info by cross-referencing pending_subscriptions by time proximity (≤ 5 min)
    const needsEnrich = list.filter(
      (l) => (!l.data || !l.data.buyer_email) && (l.event_type === "pix_generated" || l.event_type === "purchase"),
    );
    if (needsEnrich.length) {
      const oldest = new Date(Math.min(...needsEnrich.map((l) => +new Date(l.created_at))) - 5 * 60_000).toISOString();
      const newest = new Date(Math.max(...needsEnrich.map((l) => +new Date(l.created_at))) + 5 * 60_000).toISOString();
      const { data: pendings } = await (supabase.from("pending_subscriptions") as any)
        .select("full_name, email, whatsapp, plan, price, status, created_at, approved_at")
        .gte("created_at", oldest)
        .lte("created_at", newest);
      const pool = ((pendings || []) as any[]).map((p) => ({
        ts: +new Date(p.approved_at || p.created_at),
        buyer_name: p.full_name, buyer_email: p.email, buyer_whatsapp: p.whatsapp,
        plan_slug: p.plan, amount: Number(p.price),
      }));
      list.forEach((l) => {
        if (l.data && l.data.buyer_email) return;
        const lt = +new Date(l.created_at);
        let best: any = null; let bestDiff = Infinity;
        for (const p of pool) {
          const diff = Math.abs(p.ts - lt);
          if (diff < bestDiff && diff <= 5 * 60_000) { best = p; bestDiff = diff; }
        }
        if (best) {
          l.data = { ...(l.data || {}), ...best, _enriched: true };
        }
      });
    }

    setLogs(list);
    setTotalLogs(count || 0);
    setLoadingLogs(false);
  };


  const [prefs, setPrefs] = useState({
    notify_purchase: true,
    notify_pix_generated: true,
  });

  useEffect(() => { loadLogs(); /* eslint-disable-next-line */ }, [page, dateFilter, customRange.from, customRange.to]);
  useEffect(() => { setPage(0); }, [dateFilter, customRange.from, customRange.to]);

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

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" /> Eventos recentes
              </CardTitle>
              <CardDescription>Histórico completo de vendas e PIX gerados.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={loadLogs} disabled={loadingLogs}>
              Atualizar
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {dateFilter === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(!customRange.from && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {customRange.from && customRange.to
                      ? `${format(customRange.from, "dd/MM/yyyy")} - ${format(customRange.to, "dd/MM/yyyy")}`
                      : "Selecione período"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: customRange.from, to: customRange.to }}
                    onSelect={(r: any) => setCustomRange({ from: r?.from, to: r?.to })}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{totalLogs} evento(s)</span>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento registrado no período.</p>
          ) : (
            <>
              <div className="space-y-3">
                {logs.map((l) => <EventCard key={l.id} log={l} />)}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
                <span className="text-xs text-muted-foreground">
                  Página {page + 1} de {Math.max(1, Math.ceil(totalLogs / PAGE_SIZE))}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loadingLogs}>
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE_SIZE >= totalLogs || loadingLogs}>
                    Próxima <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ───────── Event card ─────────
function digits(s?: string | null) {
  return (s || "").replace(/\D/g, "");
}
function waLink(phone?: string | null, msg?: string) {
  const d = digits(phone);
  if (!d) return null;
  const num = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${num}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
}
function copy(value: string, label = "Copiado") {
  navigator.clipboard?.writeText(value).then(() => toast({ title: label }));
}
function eventBadge(kind?: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  switch (kind) {
    case "pix_generated": return { label: "PIX gerado", variant: "secondary" };
    case "purchase_subscription":
    case "purchase_new_user":
    case "purchase_module":
    case "purchase_pdf": return { label: "Venda aprovada", variant: "default" };
    case "purchase_rejected": return { label: "Recusado", variant: "destructive" };
    case "purchase_refunded": return { label: "Reembolso", variant: "destructive" };
    case "chargeback": return { label: "Chargeback", variant: "destructive" };
    default: return { label: "Evento", variant: "outline" };
  }
}

function EventCard({ log }: { log: any }) {
  const d = log.data || {};
  const isPix = d.kind === "pix_generated";
  const amount = typeof d.amount === "number"
    ? d.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : null;
  const badge = eventBadge(d.kind);
  const product = d.plan_name || d.plan_slug || d.pdf_title || (d.module ? `Módulo ${d.module}` : null);
  const recoveryMsg = isPix && d.buyer_name
    ? `Olá ${String(d.buyer_name).split(" ")[0]}, vimos que você gerou um PIX${product ? ` do ${product}` : ""}${amount ? ` no valor de ${amount}` : ""} e ainda não foi pago. Posso te ajudar a finalizar?`
    : undefined;
  const wa = waLink(d.buyer_whatsapp, recoveryMsg);
  const sentOk = (log.sent ?? 0) > 0 && !log.error;
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-card">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-start justify-between gap-3 text-left">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {sentOk ? (
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive mt-1 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground truncate">{log.title || log.event_type}</span>
              <Badge variant={badge.variant}>{badge.label}</Badge>
              {!open && d.buyer_name && <span className="text-xs text-muted-foreground truncate">· {d.buyer_name}</span>}
              {!open && amount && <span className="text-xs font-medium text-foreground">· {amount}</span>}
            </div>
            {open && log.body && <p className="text-sm text-muted-foreground mt-0.5">{log.body}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(log.created_at).toLocaleString("pt-BR")}
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (<>


      {(d.buyer_name || d.buyer_email || d.buyer_whatsapp || amount || product) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm rounded-md bg-muted/40 p-3">
          {d.buyer_name && (
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{d.buyer_name}</span>
            </div>
          )}
          {product && (
            <div className="flex items-center gap-2 min-w-0">
              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{product}</span>
            </div>
          )}
          {amount && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium">{amount}</span>
            </div>
          )}
          {d.buyer_email && (
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <button onClick={() => copy(d.buyer_email, "E-mail copiado")} className="truncate hover:underline text-left">
                {d.buyer_email}
              </button>
            </div>
          )}
          {d.buyer_whatsapp && (
            <div className="flex items-center gap-2 min-w-0">
              <MessageCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <button onClick={() => copy(d.buyer_whatsapp, "WhatsApp copiado")} className="truncate hover:underline text-left">
                {d.buyer_whatsapp}
              </button>
            </div>
          )}
        </div>
      )}

      {(wa || d.claim_link || d.mp_payment_id) && (
        <div className="flex flex-wrap gap-2">
          {wa && (
            <Button asChild size="sm" variant={isPix ? "default" : "outline"}>
              <a href={wa} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                {isPix ? "Recuperar no WhatsApp" : "Falar no WhatsApp"}
              </a>
            </Button>
          )}
          {d.claim_link && (
            <Button size="sm" variant="outline" onClick={() => copy(d.claim_link, "Link de finalização copiado")}>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Link de finalização
            </Button>
          )}
          {d.mp_payment_id && (
            <Button size="sm" variant="ghost" onClick={() => copy(String(d.mp_payment_id), "ID do pagamento copiado")}>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              #{d.mp_payment_id}
            </Button>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Push: {log.sent ?? 0}/{log.total_subs ?? 0}
        {log.removed ? ` · ${log.removed} expirados` : ""}
        {log.error ? ` · erro: ${log.error}` : ""}
      </div>
    </div>
  );
}

export default AdminNotificacoesPage;
