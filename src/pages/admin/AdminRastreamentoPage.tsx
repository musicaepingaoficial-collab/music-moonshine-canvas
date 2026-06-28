import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Code2, Copy, Link2, Pencil, Plus, Radar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useDeleteSnippet,
  useTrackingSnippets,
  useUpdateSnippet,
  type TrackingSnippet,
} from "@/hooks/useTrackingSnippets";
import { TrackingSnippetDialog } from "@/components/admin/TrackingSnippetDialog";
import { KiwifyBridgeCard } from "@/components/admin/KiwifyBridgeCard";

type DestKey =
  | "vendas"
  | "planos"
  | "checkout_mensal"
  | "checkout_anual"
  | "checkout_vitalicio"
  | "teste_gratis"
  | "obrigado";

const DEST_PATHS: Record<DestKey, string> = {
  vendas: "/",
  planos: "/#planos",
  checkout_mensal: "/?checkout=mensal#planos",
  checkout_anual: "/?checkout=anual#planos",
  checkout_vitalicio: "/?checkout=vitalicio#planos",
  teste_gratis: "/login?intent=trial",
  obrigado: "/dashboard?status=success",
};

const DEST_LABELS: Record<DestKey, string> = {
  vendas: "Página de vendas (topo)",
  planos: "Página de vendas (seção Planos)",
  checkout_mensal: "Checkout direto — Plano Mensal",
  checkout_anual: "Checkout direto — Plano Anual",
  checkout_vitalicio: "Checkout direto — Vitalício",
  teste_gratis: "Teste grátis (funil trial)",
  obrigado: "Pós-pagamento (conversão)",
};

function copy(text: string, label = "URL") {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(`${label} copiada`))
    .catch(() => toast.error("Não foi possível copiar"));
}

function UrlRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm">{url}</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => copy(url, label)}>
        <Copy className="mr-2 h-4 w-4" /> Copiar
      </Button>
    </div>
  );
}

export default function AdminRastreamentoPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const urls = useMemo(() => {
    const out = {} as Record<DestKey, string>;
    (Object.keys(DEST_PATHS) as DestKey[]).forEach((k) => {
      out[k] = `${origin}${DEST_PATHS[k]}`;
    });
    return out;
  }, [origin]);

  const [dest, setDest] = useState<DestKey>("vendas");
  const [utm, setUtm] = useState({
    source: "",
    medium: "",
    campaign: "",
    term: "",
    content: "",
  });

  const builtUrl = useMemo(() => {
    const base = `${origin}${DEST_PATHS[dest]}`;
    const u = new URL(base);
    const map: Record<string, string> = {
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
      utm_term: utm.term,
      utm_content: utm.content,
    };
    Object.entries(map).forEach(([k, v]) => {
      const val = v.trim();
      if (val) u.searchParams.set(k, val);
    });
    return u.toString();
  }, [origin, dest, utm]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Radar className="h-6 w-6 text-primary" /> Rastreamento
        </h1>
        <p className="text-sm text-muted-foreground">
          URLs prontas para copiar e gerador de UTM para integrar com plataformas externas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5" /> URLs principais
          </CardTitle>
          <CardDescription>
            Use estes endereços ao configurar sua plataforma de UTMs / atribuição.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(DEST_PATHS) as DestKey[]).map((k) => (
            <UrlRow key={k} label={DEST_LABELS[k]} url={urls[k]} />
          ))}
          <p className="text-xs text-muted-foreground">
            <strong>Dois funis:</strong> use os links de <em>Checkout direto</em> para campanhas
            que vão direto para o pagamento (abre o modal de checkout do plano escolhido na
            página de vendas) e o link de <em>Teste grátis</em> para o funil de quem testa antes
            de comprar. A página pós-pagamento (<code>?status=success</code>) é o gatilho de
            conversão.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gerador de URL com UTM</CardTitle>
          <CardDescription>
            Preencha os campos que você usa e copie a URL final. Campos vazios são ignorados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Destino</Label>
            <Select value={dest} onValueChange={(v) => setDest(v as DestKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vendas">{DEST_LABELS.vendas}</SelectItem>
                <SelectItem value="checkout">{DEST_LABELS.checkout}</SelectItem>
                <SelectItem value="obrigado">{DEST_LABELS.obrigado}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                ["source", "utm_source", "ex: facebook, google, instagram"],
                ["medium", "utm_medium", "ex: cpc, social, email"],
                ["campaign", "utm_campaign", "ex: black-friday-2026"],
                ["term", "utm_term", "ex: palavra-chave"],
                ["content", "utm_content", "ex: banner-topo"],
              ] as const
            ).map(([key, label, ph]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`utm-${key}`}>{label}</Label>
                <Input
                  id={`utm-${key}`}
                  placeholder={ph}
                  value={utm[key]}
                  onChange={(e) => setUtm((s) => ({ ...s, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">URL gerada</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <p className="min-w-0 flex-1 truncate text-sm">{builtUrl}</p>
              <Button size="sm" onClick={() => copy(builtUrl, "URL com UTM")}>
                <Copy className="mr-2 h-4 w-4" /> Copiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SnippetsCard />

      <KiwifyBridgeCard />
    </div>
  );
}

function SnippetsCard() {
  const { data: snippets, isLoading } = useTrackingSnippets();
  const update = useUpdateSnippet();
  const del = useDeleteSnippet();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TrackingSnippet | null>(null);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(s: TrackingSnippet) {
    setEditing(s);
    setOpen(true);
  }
  async function toggle(s: TrackingSnippet) {
    try {
      await update.mutateAsync({ id: s.id, values: { enabled: !s.enabled } });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar");
    }
  }
  async function remove(s: TrackingSnippet) {
    if (!confirm(`Excluir snippet "${s.name}"?`)) return;
    try {
      await del.mutateAsync(s.id);
      toast.success("Snippet excluído");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao excluir");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Code2 className="h-5 w-5" /> Códigos de rastreamento (head / body)
          </CardTitle>
          <CardDescription>
            Cole aqui os scripts que sua plataforma de UTMs pedir. Eles serão
            injetados automaticamente em todas as páginas.
          </CardDescription>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Adicionar snippet
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        )}
        {!isLoading && (!snippets || snippets.length === 0) && (
          <p className="text-sm text-muted-foreground">
            Nenhum snippet cadastrado. Clique em "Adicionar snippet" para começar.
          </p>
        )}
        {snippets?.map((s) => (
          <div
            key={s.id}
            className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{s.name}</span>
                <Badge variant="outline" className="text-xs">
                  {s.placement === "head" ? "<head>" : "<body>"}
                </Badge>
                {!s.enabled && (
                  <Badge variant="secondary" className="text-xs">
                    inativo
                  </Badge>
                )}
              </div>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {s.code.replace(/\s+/g, " ").slice(0, 120)}
                {s.code.length > 120 ? "…" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={s.enabled} onCheckedChange={() => toggle(s)} />
              <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => remove(s)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          ⚠️ Os códigos rodam em todas as páginas públicas. Só cole conteúdo de
          fontes confiáveis.
        </p>
      </CardContent>

      <TrackingSnippetDialog open={open} onOpenChange={setOpen} snippet={editing} />
    </Card>
  );
}

