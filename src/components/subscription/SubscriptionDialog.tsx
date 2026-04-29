import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2 } from "lucide-react";
import { useQueryClient as _unused } from "@tanstack/react-query";
import { CheckoutForm } from "./CheckoutForm";

interface Plano {
  id: string;
  name: string;
  slug: string;
  price: number;
  duration_days: number | null;
  description: string | null;
}

interface SubscriptionDialogProps {
  open: boolean;
  onTrialStarted: () => void;
}

export function SubscriptionDialog({ open, onTrialStarted }: SubscriptionDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plano | null>(null);
  const [startingTrial, setStartingTrial] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: planos, isLoading } = useQuery<Plano[]>({
    queryKey: ["planos"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("planos" as any) as any)
        .select("*")
        .eq("active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Plano[];
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const handleStartTrial = async () => {
    if (!user) return;
    setStartingTrial(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-trial", {
        method: "POST",
      });
      if (error) throw new Error((data as any)?.error || error.message || "Erro ao iniciar teste grátis");
      if (data && (data as any).error) throw new Error((data as any).error);

      toast.success("Teste grátis de 1 dia ativado!");
      onTrialStarted();
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar teste grátis");
    } finally {
      setStartingTrial(false);
    }
  };

  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["assinatura"] });
    onTrialStarted();
  };

  const getDurationLabel = (days: number | null) => {
    if (days === null) return "Acesso vitalício";
    if (days === 30) return "30 dias";
    if (days === 180) return "6 meses";
    return `${days} dias`;
  };

  const isHighlighted = (slug: string) => slug === "vitalicio";

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-2xl [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {selectedPlan ? (
          <CheckoutForm
            planSlug={selectedPlan.slug}
            planName={selectedPlan.name}
            planPrice={selectedPlan.price}
            onBack={() => setSelectedPlan(null)}
            onSuccess={handlePaymentSuccess}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Escolha seu plano</DialogTitle>
              <DialogDescription className="text-center">
                Assine para ter acesso completo ou inicie um teste grátis de 1 dia.
              </DialogDescription>
            </DialogHeader>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {planos?.map((plano) => {
                    const highlighted = isHighlighted(plano.slug);
                    return (
                      <div
                        key={plano.id}
                        className={`relative flex flex-col rounded-xl border p-4 transition-all ${
                          highlighted
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                            : "border-border bg-card"
                        }`}
                      >
                        {highlighted && (
                          <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gap-1 bg-primary text-primary-foreground text-[10px]">
                            <Crown className="h-3 w-3" />
                            Melhor oferta
                          </Badge>
                        )}
                        <h3 className="font-bold text-foreground">{plano.name}</h3>
                        <p className="text-xs text-muted-foreground">{getDurationLabel(plano.duration_days)}</p>
                        <div className="mt-2">
                          <span className="text-2xl font-extrabold text-foreground">
                            R$ {plano.price.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                        <ul className="mt-3 space-y-1.5 flex-1">
                          <li className="flex items-center gap-1.5 text-xs text-foreground">
                            <Check className="h-3.5 w-3.5 text-primary" />
                            Downloads ilimitados
                          </li>
                          <li className="flex items-center gap-1.5 text-xs text-foreground">
                            <Check className="h-3.5 w-3.5 text-primary" />
                            Baixar pastas e repertórios
                          </li>
                        </ul>
                        <Button
                          className="mt-4 w-full"
                          size="sm"
                          variant={highlighted ? "default" : "outline"}
                          disabled={startingTrial}
                          onClick={() => setSelectedPlan(plano)}
                        >
                          Assinar
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2 border-dashed"
                  disabled={startingTrial}
                  onClick={handleStartTrial}
                >
                  {startingTrial ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Iniciar teste grátis (1 dia)
                    </>
                  )}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  O teste grátis permite download de 1 música por vez. Sem download de pastas ou repertórios completos.
                </p>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
