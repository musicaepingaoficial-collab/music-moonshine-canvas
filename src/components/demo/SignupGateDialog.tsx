import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/pixels";
import {
  Crown,
  Download,
  Music2,
  Lock,
  Check,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const PublicCheckoutDialog = lazy(() =>
  import("@/components/subscription/PublicCheckoutDialog").then((m) => ({
    default: m.PublicCheckoutDialog,
  })),
);

type Step = "pitch" | "planos";

interface PitchCopy {
  title: string;
  desc: string;
  icon: typeof Crown;
}

const COPY: Record<string, PitchCopy> = {
  plays: {
    title: "Sua demonstração acabou 🎵",
    desc: "Você já ouviu suas 5 músicas grátis. Destrave o catálogo completo e baixe sem limite.",
    icon: Music2,
  },
  download: {
    title: "Quase lá! Downloads são para assinantes",
    desc: "Crie sua conta e assine para baixar músicas, PDFs e discografias completas.",
    icon: Download,
  },
  private: {
    title: "Essa área é exclusiva para assinantes",
    desc: "Favoritos, repertórios, downloads e muito mais te esperam do outro lado.",
    icon: Lock,
  },
};

const BENEFITS = [
  "+100 mil músicas",
  "Download faixa a faixa",
  "Packs completos",
  "Pesquisa inteligente",
  "Atualizações mensais",
  "Formato MP3",
];

interface Plano {
  id: string;
  slug: string;
  name: string;
  price: number;
  description: string | null;
  duration_days: number | null;
}

export function SignupGateDialog() {
  const { gate, closeGate, deactivateDemo } = useDemoMode();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("pitch");
  const [checkoutPlan, setCheckoutPlan] = useState<{
    slug: string;
    name: string;
    price: number;
  } | null>(null);

  const reason = gate.reason || "plays";
  const meta = COPY[reason] ?? COPY.plays;
  const Icon = meta.icon;

  // Reset step whenever the gate opens
  useEffect(() => {
    if (gate.open) setStep("pitch");
  }, [gate.open]);

  const { data: planos } = useQuery<Plano[]>({
    queryKey: ["gate-planos"],
    queryFn: async () => {
      const { data } = await (supabase.from("planos" as any) as any)
        .select("id, slug, name, price, description, duration_days")
        .in("slug", ["mensal", "anual"])
        .eq("active", true);
      return ((data ?? []) as Plano[]).sort((a, b) =>
        a.slug === "mensal" ? -1 : 1,
      );
    },
    enabled: gate.open,
    staleTime: 5 * 60 * 1000,
  });

  const handlePick = async (p: Plano) => {
    trackEvent("add_to_cart", {
      value: Number(p.price),
      currency: "BRL",
      content_ids: [p.slug],
      content_name: p.name,
    });
    setCheckoutPlan({ slug: p.slug, name: p.name, price: Number(p.price) });
    closeGate();
    // Não deslogar a sessão demo aqui — se o usuário fechar o checkout,
    // ele permanece na tela onde estava em vez de cair em /login.
    // A sessão demo é substituída automaticamente pela conta real após o pagamento.
  };

  const handleGoLogin = async () => {
    closeGate();
    await deactivateDemo();
    navigate("/login");
  };

  return (
    <>
      <Dialog open={gate.open} onOpenChange={(open) => !open && closeGate()}>
        <DialogContent className="max-w-md sm:max-w-2xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto bg-card/95 backdrop-blur border-border/60">
          {step === "pitch" ? (
            <>
              <DialogHeader>
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-glow">
                  <Icon className="h-8 w-8" />
                </div>
                <DialogTitle className="text-center text-xl sm:text-2xl font-black tracking-tight">
                  {meta.title}
                </DialogTitle>
                <DialogDescription className="text-center text-sm sm:text-base leading-relaxed">
                  {meta.desc}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                <p className="text-sm sm:text-base text-foreground leading-relaxed">
                  Destrave <span className="font-bold text-primary">+100 mil músicas</span>,{" "}
                  <span className="font-bold text-primary">packs completos</span> e{" "}
                  <span className="font-bold text-primary">downloads ilimitados</span> por menos de{" "}
                  <span className="font-bold text-primary">R$ 0,27 por dia</span> no plano anual.
                </p>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2 text-sm">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Acesso à biblioteca completa</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Downloads ilimitados</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Repertórios e PDFs inclusos</li>
                <li className="flex items-center gap-2"><Crown className="h-4 w-4 text-primary shrink-0" /> Discografias completas</li>
              </ul>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                7 dias de garantia incondicional
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  size="lg"
                  onClick={() => setStep("planos")}
                  className="w-full h-12 text-base font-black bg-gradient-cta text-primary-foreground shadow-glow hover:opacity-95"
                >
                  QUERO ASSINAR AGORA
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleGoLogin}>
                  Já tenho conta
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("pitch")}
                    className="h-8 px-2 -ml-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <DialogTitle className="text-base sm:text-lg font-bold">
                    Escolha seu plano
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs sm:text-sm">
                  Acesso liberado em segundos após a confirmação.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {(planos ?? []).map((p) => {
                  const isAnual = p.slug === "anual";
                  const periodLabel = isAnual ? "/ ano" : "/ mês";
                  const subtitle = isAnual
                    ? "Acesso completo por 1 ano"
                    : "Acesso completo por 30 dias";
                  return (
                    <div
                      key={p.id}
                      className={`relative flex flex-col rounded-xl p-4 sm:p-5 bg-card/80 backdrop-blur border ${
                        isAnual
                          ? "border-primary border-2 ring-2 ring-primary/40 shadow-glow-lg animate-glow-pulse"
                          : "border-border/60"
                      }`}
                    >
                      {isAnual && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-cta text-primary-foreground text-[10px] sm:text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full flex items-center gap-1 shadow-glow whitespace-nowrap">
                          <Crown className="h-3 w-3" />
                          Mais Vendido
                        </div>
                      )}

                      <h3 className="text-base sm:text-lg font-black uppercase tracking-wide mt-1">
                        {p.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 mb-3 min-h-[28px]">
                        {subtitle}
                      </p>

                      <div className="mb-3">
                        {isAnual && (
                          <div className="text-[11px] sm:text-xs text-muted-foreground">
                            De <span className="line-through">R$ 418,80</span> por
                          </div>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="text-[11px] sm:text-xs text-muted-foreground">R$</span>
                          <span
                            className={`font-black ${
                              isAnual ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
                            }`}
                          >
                            {Number(p.price).toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                        <span className="text-[11px] sm:text-xs text-muted-foreground">
                          {periodLabel}
                        </span>
                      </div>

                      <ul className="space-y-1.5 text-xs sm:text-sm flex-1 mb-4">
                        {BENEFITS.map((b) => (
                          <li key={b} className="flex gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </li>
                        ))}
                        {isAnual && (
                          <li className="flex gap-2 font-semibold text-primary">
                            <Crown className="h-4 w-4 shrink-0 mt-0.5" />
                            Discografias inclusas
                          </li>
                        )}
                      </ul>

                      <Button
                        onClick={() => handlePick(p)}
                        className={`mt-auto w-full font-bold ${
                          isAnual
                            ? "h-12 text-base font-black bg-gradient-cta text-primary-foreground shadow-glow hover:opacity-95"
                            : "h-11 bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/40"
                        }`}
                      >
                        QUERO ESTE PLANO
                      </Button>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-center text-[11px] sm:text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Pagamento seguro • Pix ou Cartão • Liberação instantânea
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>

      {checkoutPlan && (
        <Suspense fallback={null}>
          <PublicCheckoutDialog
            open={!!checkoutPlan}
            onOpenChange={(o) => !o && setCheckoutPlan(null)}
            plan={checkoutPlan}
          />
        </Suspense>
      )}
    </>
  );
}
