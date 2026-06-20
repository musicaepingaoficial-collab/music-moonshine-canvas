import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.webp";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/pixels";
import { CONSENT_VERSION } from "@/hooks/useCookieConsent";
import { registerPendingReferral } from "@/lib/referrals";


function formatWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Captura código de indicação na URL: /login?ref=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const intent = params.get("intent");
    
    if (ref) {
      localStorage.setItem("referral_code", ref);
      setIsSignUp(true);
    }

    if (intent === "trial") {
      setIsSignUp(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp && password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (isSignUp && !acceptedTerms) {
      toast({
        title: "Aceite necessário",
        description: "Você precisa aceitar os Termos e a Política de Privacidade.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const params = new URLSearchParams(window.location.search);
        const intent = params.get("intent");
        const isTrial = intent === "trial";
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, whatsapp, ...(isTrial ? { trial_user: true } : {}) },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        // Log consentimento de termos e privacidade
        if (data.user?.id) {
          const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
          await supabase.from("consent_logs").insert([
            { user_id: data.user.id, consent_type: "terms", granted: true, version: CONSENT_VERSION, user_agent: ua },
            { user_id: data.user.id, consent_type: "privacy", granted: true, version: CONSENT_VERSION, user_agent: ua },
          ]);
        }
        trackEvent("complete_registration", {
          content_name: "signup",
          email,
          phone: whatsapp,
          external_id: data.user?.id,
        });
        if (data.session) {
          await registerPendingReferral();
          const params = new URLSearchParams(window.location.search);
          const intent = params.get("intent");
          if (intent === "trial") {
            navigate("/dashboard");
          } else {
            // Redirect to dashboard by default instead of plans to allow the free plays
            navigate("/dashboard");
          }
        } else {
          toast({
            title: "Conta criada!",
            description: "Verifique seu email para confirmar o cadastro.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await registerPendingReferral();
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");
        const intent = params.get("intent");
        
        if (intent === "trial") {
          navigate("/dashboard", { replace: true });
        } else {
          navigate(redirect || "/dashboard", { replace: true });
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message === "Invalid login credentials"
          ? "Email ou senha inválidos"
          : error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary/80 hover:bg-primary/10 gap-2"
          onClick={() => navigate("/")}
        >
          <span className="hidden sm:inline">Conhecer mais sobre o Repertório Música e Pinga</span>
          <span className="sm:hidden">Conhecer mais</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="flex flex-col items-center gap-3">
          <img
            src={logo}
            alt="Repertório Música e Pinga"
            className="h-20 w-20 rounded-2xl object-cover shadow-lg shadow-primary/20"
          />
          <h1 className="text-2xl font-bold text-foreground">Música e Pinga</h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Crie sua conta" : "Faça login para continuar"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome</label>
              <Input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-border/50 bg-secondary placeholder:text-muted-foreground/50"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-border/50 bg-secondary placeholder:text-muted-foreground/50"
              required
            />
          </div>
          {isSignUp && (
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
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-border/50 bg-secondary pr-10 placeholder:text-muted-foreground/50"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isSignUp && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirmar Senha</label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border-border/50 bg-secondary placeholder:text-muted-foreground/50"
                required
                minLength={6}
              />
            </div>
          )}
          {isSignUp && (
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={acceptedTerms}
                onCheckedChange={(v) => setAcceptedTerms(v === true)}
                className="mt-0.5"
              />
              <span>
                Li e aceito os{" "}
                <Link to="/termos" target="_blank" className="text-primary underline">Termos de Uso</Link>
                {" "}e a{" "}
                <Link to="/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</Link>.
              </span>
            </label>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignUp ? "Criar conta" : "Entrar"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {isSignUp ? "Já tem conta? " : "Não tem conta? "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:underline"
          >
            {isSignUp ? "Fazer login" : "Criar conta"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
