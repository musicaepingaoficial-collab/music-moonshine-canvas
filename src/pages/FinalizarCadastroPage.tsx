import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { claimPendingSubscription, pollPendingApproved } from "@/services/paymentService";
import { CONSENT_VERSION } from "@/hooks/useCookieConsent";
import logo from "@/assets/logo.jpeg";

export default function FinalizarCadastroPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);


  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    // verificar via claim em modo check
    (async () => {
      const ANON_KEY = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/claim-pending-subscription`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ claim_token: token, check_only: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus(data.status);
        setEmail(data.email || "");
      } else {
        setStatus("not_found");
      }
      setLoading(false);
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
      return toast.error("A senha precisa ter ao menos 8 caracteres, incluindo letra e número.");
    if (password !== confirmPassword) return toast.error("As senhas não coincidem.");
    if (!acceptedTerms) return toast.error("Aceite os Termos e a Política de Privacidade.");
    if (!token) return;

    setSubmitting(true);
    try {
      const result = await claimPendingSubscription({ claim_token: token, password });
      const { error } = await supabase.auth.signInWithPassword({ email: result.email, password });
      if (error) {
        toast.success("Conta criada! Faça login.");
        navigate("/login");
        return;
      }
      // Log consentimento
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
        await supabase.from("consent_logs").insert([
          { user_id: user.id, consent_type: "terms", granted: true, version: CONSENT_VERSION, user_agent: ua },
          { user_id: user.id, consent_type: "privacy", granted: true, version: CONSENT_VERSION, user_agent: ua },
        ]);
      }
      toast.success("Tudo pronto!");
      navigate("/dashboard");
    } catch (err: any) {
      if (err.code === "already_claimed") {
        toast.info("Esta conta já foi finalizada. Faça login.");
        navigate("/login");
      } else {
        toast.error(err.message || "Falha ao finalizar cadastro");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="Logo" className="h-16 w-16 rounded-2xl object-cover" />
          <h1 className="text-xl font-bold text-foreground">Finalizar cadastro</h1>
        </div>

        {!token || status === "not_found" ? (
          <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground text-center">
            Link inválido ou expirado.
          </div>
        ) : status === "claimed" ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">Esta conta já foi finalizada.</p>
            <Button onClick={() => navigate("/login")} className="w-full">Ir para login</Button>
          </div>
        ) : status !== "approved" ? (
          <div className="rounded-md border border-border bg-card p-4 text-sm text-center">
            Pagamento ainda não confirmado. Aguarde alguns instantes e recarregue a página.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Pagamento confirmado! Crie sua senha.
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={email} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-pwd">Senha</Label>
              <div className="relative">
                <Input id="fc-pwd" type={showPwd ? "text" : "password"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  minLength={6} required />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-pwd2">Confirmar senha</Label>
              <Input id="fc-pwd2" type={showPwd ? "text" : "password"}
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6} required />
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(v === true)} className="mt-0.5" />
              <span>
                Li e aceito os{" "}
                <Link to="/termos" target="_blank" className="text-primary underline">Termos</Link>
                {" "}e a{" "}
                <Link to="/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</Link>.
              </span>
            </label>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar senha e entrar"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
