import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { CheckoutForm } from "@/components/subscription/CheckoutForm";
import {
  formatCpf,
  formatWhatsApp,
  isValidCpf,
  onlyDigits,
  splitFullName,
} from "@/lib/validators";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: { slug: string; name: string; price: number } | null;
}

type Step = "form" | "payment";

export function PublicCheckoutDialog({ open, onOpenChange, plan }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const reset = () => {
    setStep("form");
    setSubmitting(false);
    setName("");
    setCpf("");
    setWhatsapp("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setAcceptedTerms(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    const trimmedName = name.trim().replace(/\s+/g, " ");
    if (!splitFullName(trimmedName)) {
      toast.error("Informe seu nome completo (nome e sobrenome).");
      return;
    }
    if (!isValidCpf(cpf)) {
      toast.error("CPF inválido.");
      return;
    }
    if (onlyDigits(whatsapp).length < 10) {
      toast.error("WhatsApp inválido.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("E-mail inválido.");
      return;
    }
    if (password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }

    setSubmitting(true);

    try {
      // 1) Criar conta
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: trimmedName,
            full_name: trimmedName,
            whatsapp,
            cpf: onlyDigits(cpf),
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (signUpError) {
        const msg = signUpError.message?.toLowerCase() || "";
        if (msg.includes("registered") || msg.includes("already")) {
          toast.error("Este e-mail já tem cadastro. Faça login para comprar.");
        } else {
          toast.error(signUpError.message);
        }
        setSubmitting(false);
        return;
      }

      // 2) Login imediato (requer "Confirm email" desativado no Supabase)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        toast.error(
          "Conta criada, mas não foi possível fazer login automático. Verifique seu e-mail ou tente entrar manualmente."
        );
        setSubmitting(false);
        return;
      }

      // 3) Avançar para pagamento
      setStep("payment");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    toast.success("Pagamento confirmado! Redirecionando...");
    handleClose(false);
    navigate("/dashboard");
  };

  const handleBackToForm = () => {
    // Já temos conta criada — só fechamos
    handleClose(false);
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? "Seus dados" : "Pagamento"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? `Plano ${plan.name} — R$ ${plan.price.toFixed(2).replace(".", ",")}`
              : "Conclua o pagamento para liberar o acesso."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <form onSubmit={handleContinue} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pc-name">Nome completo</Label>
              <Input
                id="pc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome e sobrenome"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-cpf">CPF</Label>
              <Input
                id="pc-cpf"
                inputMode="numeric"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-wa">WhatsApp</Label>
              <Input
                id="pc-wa"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-email">E-mail</Label>
              <Input
                id="pc-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-pwd">Senha</Label>
              <div className="relative">
                <Input
                  id="pc-pwd"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-pwd2">Confirmar senha</Label>
              <Input
                id="pc-pwd2"
                type={showPwd ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="pc-terms"
                checked={acceptedTerms}
                onCheckedChange={(v) => setAcceptedTerms(v === true)}
                className="mt-0.5"
              />
              <label htmlFor="pc-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                Li e aceito os{" "}
                <Link to="/termos" target="_blank" className="text-primary underline hover:no-underline">
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link to="/privacidade" target="_blank" className="text-primary underline hover:no-underline">
                  Política de Privacidade
                </Link>
                .
              </label>
            </div>

            <Button type="submit" disabled={submitting || !acceptedTerms} className="w-full gap-2 mt-2">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Continuar para pagamento
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              Ao continuar, você cria sua conta e segue para o pagamento seguro.
            </p>
          </form>
        ) : (
          <CheckoutForm
            planSlug={plan.slug}
            planName={plan.name}
            planPrice={plan.price}
            onBack={handleBackToForm}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
