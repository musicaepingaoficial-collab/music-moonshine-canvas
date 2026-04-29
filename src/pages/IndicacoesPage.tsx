import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Gift, Copy, Check, Share2, Crown, Users } from "lucide-react";
import { useAfiliado, useIndicacoes, useGenerateAffiliateLink } from "@/hooks/useAfiliados";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const IndicacoesPage = () => {
  const { data: afiliado, isLoading } = useAfiliado();
  const { data: indicacoes } = useIndicacoes();
  const generate = useGenerateAffiliateLink();
  const [copied, setCopied] = useState(false);

  const list = (indicacoes ?? []) as Array<{ id: string; status: string; created_at: string }>;
  const rewarded = list.filter((i) => i.status === "rewarded").length;
  const pending = list.filter((i) => i.status === "pending").length;
  const goal = 10;
  const progress = Math.min(100, (rewarded / goal) * 100);
  const isLifetime = rewarded >= goal;

  const link = useMemo(() => {
    if (!afiliado?.code) return "";
    return `${window.location.origin}/login?ref=${afiliado.code}`;
  }, [afiliado?.code]);

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!link) return;
    const text = `Conheça o Repertório Música e Pinga! Assine usando meu link e bora curtir 🎵\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <Banner
        title="Indique e ganhe"
        subtitle="A cada amigo que assinar qualquer plano, você ganha 1 mês grátis. Aos 10 → acesso vitalício!"
      />

      {/* Cards de status */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Indicações</p>
              <p className="text-2xl font-bold">{list.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Premiadas</p>
              <p className="text-2xl font-bold">{rewarded}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Para vitalício</p>
              <p className="text-2xl font-bold">
                {isLifetime ? "✓" : `${Math.max(0, goal - rewarded)} restantes`}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progresso */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Progresso até o vitalício</h3>
          <span className="text-sm font-semibold tabular-nums">{rewarded}/{goal}</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {isLifetime && (
          <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            🎉 Você desbloqueou acesso vitalício!
          </p>
        )}
      </Card>

      {/* Link de afiliado */}
      <Card className="p-5">
        <h3 className="font-semibold">Seu link de indicação</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Compartilhe este link. Quando o amigo se cadastrar e assinar qualquer plano, você ganha automaticamente.
        </p>

        {!afiliado && (
          <Button
            className="mt-4"
            onClick={() => generate.mutate()}
            disabled={generate.isPending || isLoading}
          >
            {generate.isPending ? "Gerando..." : "Gerar meu link"}
          </Button>
        )}

        {afiliado && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                readOnly
                value={link}
                className="flex-1 rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm font-mono"
              />
              <Button onClick={handleCopy} variant="outline" className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
              <Button onClick={handleShare} className="gap-2">
                <Share2 className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Seu código: <span className="font-mono font-semibold">{afiliado.code}</span>
            </p>
          </div>
        )}
      </Card>

      {/* Histórico */}
      <Card className="p-5">
        <h3 className="font-semibold">Histórico de indicações</h3>
        {list.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Você ainda não tem indicações. Comece compartilhando seu link!
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {list.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">
                    Indicação #{i.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(i.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {i.status === "rewarded" ? (
                  <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
                    Premiada
                  </Badge>
                ) : (
                  <Badge variant="outline">Pendente</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
        {pending > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {pending} pendente{pending > 1 ? "s" : ""} — recompensa é liberada quando o amigo assina um plano.
          </p>
        )}
      </Card>
    </div>
  );
};

export default IndicacoesPage;
