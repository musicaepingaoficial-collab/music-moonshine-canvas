import { Banner } from "@/components/ui/Banner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MusicGridSkeleton } from "@/components/ui/Skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tag, Crown, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckoutForm } from "@/components/subscription/CheckoutForm";
import { useNavigate } from "react-router-dom";

interface Plano {
  id: string;
  name: string;
  slug: string;
  price: number;
  duration_days: number | null;
  active: boolean;
  description: string | null;
  created_at: string;
}

const OfertasPage = () => {
  const [selectedPlan, setSelectedPlan] = useState<Plano | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: planos, isLoading } = useQuery<Plano[]>({
    queryKey: ["planos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planos")
        .select("*")
        .eq("active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Plano[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["assinatura"] });
    setSelectedPlan(null);
    navigate("/dashboard");
  };

  const getDurationLabel = (days: number | null) => {
    if (days === null) return "Acesso vitalício";
    if (days === 30) return "30 dias";
    if (days === 180) return "6 meses";
    return `${days} dias`;
  };

  const isHighlighted = (slug: string) => slug === "vitalicio";

  return (
    <div className="space-y-8">
      <Banner title="Planos de Assinatura" subtitle="Escolha o plano ideal para você e tenha acesso completo." />

      {isLoading && <MusicGridSkeleton count={3} />}

      {!isLoading && (planos?.length ?? 0) === 0 && (
        <EmptyState icon={Tag} title="Nenhum plano disponível." description="Novos planos serão adicionados em breve!" />
      )}

      {!isLoading && (planos?.length ?? 0) > 0 && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto"
        >
          {planos!.map((plano) => {
            const highlighted = isHighlighted(plano.slug);
            return (
              <motion.div
                key={plano.id}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  highlighted
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-card"
                }`}
              >
                {highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1 bg-primary text-primary-foreground">
                    <Crown className="h-3 w-3" />
                    Melhor custo-benefício
                  </Badge>
                )}

                <h3 className="text-xl font-bold text-foreground">{plano.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{getDurationLabel(plano.duration_days)}</p>

                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-foreground">
                    R$ {plano.price.toFixed(2).replace(".", ",")}
                  </span>
                </div>

                {plano.description && (
                  <p className="mt-3 text-sm text-muted-foreground">{plano.description}</p>
                )}

                <ul className="mt-4 space-y-2 flex-1">
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Acesso completo à biblioteca
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Downloads ilimitados
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    Repertórios personalizados
                  </li>
                </ul>

                <Button
                  className="mt-6 w-full"
                  variant={highlighted ? "default" : "outline"}
                  onClick={() => setSelectedPlan(plano)}
                >
                  Assinar agora
                </Button>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent className="max-w-md">
          {selectedPlan && (
            <CheckoutForm
              planSlug={selectedPlan.slug}
              planName={selectedPlan.name}
              planPrice={selectedPlan.price}
              onBack={() => setSelectedPlan(null)}
              onSuccess={handlePaymentSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfertasPage;
