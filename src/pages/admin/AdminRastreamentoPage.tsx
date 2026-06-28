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

type DestKey = "vendas" | "checkout" | "obrigado";

const DEST_PATHS: Record<DestKey, string> = {
  vendas: "/",
  checkout: "/planos",
  obrigado: "/dashboard?status=success",
};

const DEST_LABELS: Record<DestKey, string> = {
  vendas: "Página de vendas",
  checkout: "Checkout / planos",
  obrigado: "Página pós-pagamento",
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

  const urls = useMemo(
    () => ({
      vendas: `${origin}${DEST_PATHS.vendas}`,
      checkout: `${origin}${DEST_PATHS.checkout}`,
      obrigado: `${origin}${DEST_PATHS.obrigado}`,
    }),
    [origin],
  );

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
          <UrlRow label={DEST_LABELS.vendas} url={urls.vendas} />
          <UrlRow label={DEST_LABELS.checkout} url={urls.checkout} />
          <UrlRow label={DEST_LABELS.obrigado} url={urls.obrigado} />
          <p className="text-xs text-muted-foreground">
            A página pós-pagamento é o <code>/dashboard</code> com <code>?status=success</code> —
            esse parâmetro é adicionado automaticamente após a aprovação do pagamento e serve
            como gatilho de conversão.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integrações futuras</CardTitle>
          <CardDescription>
            Espaço reservado para postbacks, IDs de plataformas externas e webhooks de conversão.
            Avise quando quiser conectar a sua plataforma de UTMs que adicionamos os campos aqui.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
