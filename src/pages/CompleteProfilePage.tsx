import { useState } from "react";
import { Music2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useUser";
import { useQueryClient } from "@tanstack/react-query";

function formatWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const CompleteProfilePage = () => {
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ whatsapp } as any)
        .eq("id", user.id);

      if (error) throw error;

      await queryClient.refetchQueries({ queryKey: ["profile", user.id] });

      // Check if user already has an active subscription
      const { data: activeSub } = await supabase
        .from("assinaturas")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (activeSub) {
        navigate("/dashboard");
      } else {
        navigate("/planos");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
            <Music2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Quase lá!</h1>
          <p className="text-center text-sm text-muted-foreground">
            Para continuar, informe seu número de WhatsApp
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">WhatsApp</label>
            <Input
              type="tel"
              placeholder="(11) 99999-9999"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
              className="border-border/50 bg-secondary placeholder:text-muted-foreground/50"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !whatsapp.trim()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default CompleteProfilePage;
