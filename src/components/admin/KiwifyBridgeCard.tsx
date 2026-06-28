import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, PlugZap, Send, Webhook } from "lucide-react";
import { toast } from "sonner";
import {
  useKiwifyBridgeConfig,
  useKiwifyBridgeLogs,
  useUpdateKiwifyBridgeConfig,
  type KiwifyBridgeLog,
} from "@/hooks/useKiwifyBridge";

const SUPABASE_PROJECT = "zsquzchwxnsuysfrlngt";
const WEBHOOK_URL = `https://${SUPABASE_PROJECT}.supabase.co/functions/v1/mp-to-kiwify-webhook`;

export function KiwifyBridgeCard() {
  const { data: config, isLoading } = useKiwifyBridgeConfig();
  const update = useUpdateKiwifyBridgeConfig();
  const { data: logs } = useKiwifyBridgeLogs(20);
  const [testing, setTesting] = useState(false);

  const [form, setForm] = useState({
    enabled: false,
    destination_url: "",
    product_id: "",
    product_name: "",
    secret_token: "",
    forward_pending: false,
    forward_refused: false,
  });

  useEffect(() => {
    if (!config) return;
    setForm({
      enabled: config.enabled,
      destination_url: config.destination_url ?? "",
      product_id: config.product_id ?? "",
      product_name: config.product_name ?? "",
      secret_token: config.secret_token ?? "",
      forward_pending: config.forward_pending,
      forward_refused: config.forward_refused,
    });
  }, [config]);

  function copy(text: string, label = "Copiado") {
    navigator.clipboard.writeText(text).then(
      () => toast.success(label),
      () => toast.error("Não foi possível copiar"),
    );
  }

  async function save() {
    if (!config) return;
    try {
      await update.mutateAsync({
        id: config.id,
        values: {
          enabled: form.enabled,
          destination_url: form.destination_url.trim() || null,
          product_id: form.product_id.trim() || null,
          product_name: form.product_name.trim() || null,
          secret_token: form.secret_token.trim() || null,
          forward_pending: form.forward_pending,
          forward_refused: form.forward_refused,
        },
      });
      toast.success("Configuração salva");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    }
  }

  async function runTest() {
    if (!form.destination_url) {
      toast.error("Configure a URL de destino antes de testar");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(`${WEBHOOK_URL}?test=1`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (json?.ok && json?.forwarded) {
        toast.success(`Teste enviado (HTTP ${json.response_status})`);
      } else {
        toast.warning("Teste executado — confira o histórico abaixo");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no teste");
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PlugZap className="h-5 w-5" /> Bridge Mercado Pago → Kiwify
        </CardTitle>
        <CardDescription>
          Traduz os webhooks do Mercado Pago para o formato Kiwify e reenvia
          para sua plataforma de tracking (UTMfy, etc.).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Webhook URL */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Webhook className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">
              URL do webhook para colar no painel do Mercado Pago
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 truncate font-mono text-xs">{WEBHOOK_URL}</p>
            <Button size="sm" variant="outline" onClick={() => copy(WEBHOOK_URL, "URL copiada")}>
              <Copy className="mr-2 h-4 w-4" /> Copiar
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">Ativar bridge</Label>
            <p className="text-xs text-muted-foreground">
              Quando desligado, eventos são ignorados.
            </p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(v) => setForm((s) => ({ ...s, enabled: v }))}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dest-url">URL de destino (postback Kiwify-like)</Label>
          <Input
            id="dest-url"
            placeholder="https://api.utmify.com.br/webhooks/..."
            value={form.destination_url}
            onChange={(e) => setForm((s) => ({ ...s, destination_url: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="prod-id">Product ID</Label>
            <Input
              id="prod-id"
              placeholder="ex: assinatura-anual"
              value={form.product_id}
              onChange={(e) => setForm((s) => ({ ...s, product_id: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prod-name">Product Name</Label>
            <Input
              id="prod-name"
              placeholder="ex: Música e Pinga Premium"
              value={form.product_name}
              onChange={(e) => setForm((s) => ({ ...s, product_name: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="secret">Secret token (opcional)</Label>
          <Input
            id="secret"
            type="password"
            placeholder="usado para assinar o body (HMAC-SHA1)"
            value={form.secret_token}
            onChange={(e) => setForm((s) => ({ ...s, secret_token: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Encaminhar pendentes</Label>
              <p className="text-xs text-muted-foreground">PIX/boleto gerados</p>
            </div>
            <Switch
              checked={form.forward_pending}
              onCheckedChange={(v) => setForm((s) => ({ ...s, forward_pending: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Encaminhar recusados</Label>
              <p className="text-xs text-muted-foreground">Pagamentos negados</p>
            </div>
            <Switch
              checked={form.forward_refused}
              onCheckedChange={(v) => setForm((s) => ({ ...s, forward_refused: v }))}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={update.isPending || isLoading}>
            Salvar configuração
          </Button>
          <Button variant="outline" onClick={runTest} disabled={testing}>
            <Send className="mr-2 h-4 w-4" />
            {testing ? "Enviando..." : "Testar envio"}
          </Button>
        </div>

        {/* Logs */}
        <div className="space-y-2 pt-2">
          <h4 className="text-sm font-semibold">Histórico (últimos 20)</h4>
          <LogsList logs={logs ?? []} />
        </div>
      </CardContent>
    </Card>
  );
}

function LogsList({ logs }: { logs: KiwifyBridgeLog[] }) {
  const [open, setOpen] = useState<KiwifyBridgeLog | null>(null);

  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum evento registrado ainda.
      </p>
    );
  }
  return (
    <>
      <div className="space-y-2">
        {logs.map((l) => (
          <div
            key={l.id}
            className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={l.success ? "default" : "destructive"} className="text-xs">
                  {l.success ? "OK" : "Falha"}
                </Badge>
                {l.response_status != null && (
                  <Badge variant="outline" className="text-xs">
                    HTTP {l.response_status}
                  </Badge>
                )}
                {l.mp_status && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {l.mp_status} → {l.kiwify_status ?? "-"}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                #{l.mp_payment_id ?? "—"} ·{" "}
                {new Date(l.created_at).toLocaleString("pt-BR")}
                {l.error_message ? ` · ${l.error_message}` : ""}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setOpen(l)}>
              Ver payload
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payload enviado</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-xs">
            {open ? JSON.stringify(open.request_payload, null, 2) : ""}
          </pre>
          {open?.response_body && (
            <>
              <h4 className="text-sm font-semibold">Resposta</h4>
              <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">
                {open.response_body}
              </pre>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
