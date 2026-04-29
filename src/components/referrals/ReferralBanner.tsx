import { useNavigate } from "react-router-dom";
import { Gift, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useUser";
import { useIndicacoes } from "@/hooks/useAfiliados";

export function ReferralBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: indicacoes } = useIndicacoes();

  if (!user) return null;

  const list = (indicacoes ?? []) as Array<{ status: string }>;
  const rewarded = list.filter((i) => i.status === "rewarded").length;
  const goal = 10;
  const remaining = Math.max(0, goal - rewarded);
  const progress = Math.min(100, (rewarded / goal) * 100);
  const isLifetime = rewarded >= goal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 sm:p-6 shadow-lg shadow-primary/5"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Indique amigos e ganhe 1 mês grátis
              </h3>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLifetime
                ? "Parabéns! Você desbloqueou acesso vitalício 🎉"
                : `Cada amigo que assinar = +30 dias para você. Faltam ${remaining} para o acesso vitalício.`}
            </p>

            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-primary/10 sm:max-w-xs">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground tabular-nums">
                {rewarded}/{goal}
              </span>
            </div>
          </div>
        </div>

        <Button
          onClick={() => navigate("/indicacoes")}
          className="shrink-0 gap-2"
        >
          Ver meu link
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
