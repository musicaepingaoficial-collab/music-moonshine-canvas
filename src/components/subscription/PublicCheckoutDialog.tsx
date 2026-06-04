import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2, ArrowRight, Eye, EyeOff, ArrowLeft,
  CreditCard, QrCode, Copy, ExternalLink, CheckCircle2, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import {
  formatCpf, formatWhatsApp, isValidCpf, onlyDigits, splitFullName,
} from "@/lib/validators";
import {
  processAnonymousCardPayment, createAnonymousPixPayment,
  checkEmailExists, claimPendingSubscription, pollPendingApproved,
  type PaymentResponse,
} from "@/services/paymentService";
import { trackEvent } from "@/lib/pixels";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: { slug: string; name: string; price: number } | null;
}

type Step = "form" | "payment" | "pix-wait" | "set-password";
type PayMethod = "card" | "pix";

export function PublicCheckoutDialog({ open, onOpenChange, plan }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Etapa 1
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Etapa 2
  const [payMethod, setPayMethod] = useState<PayMethod>("pix");
  const [pixData, setPixData] = useState<{
    qrCode?: string; qrCodeBase64?: string; ticketUrl?: string; paymentId?: number; purchaseEventId?: string;
  } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const cardFormRef = useRef<any>(null);

  // Etapa 3
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const reset = () => {
    setStep("form"); setSubmitting(false);
    setName(""); setCpf(""); setWhatsapp(""); setEmail("");
    setAcceptedTerms(false); setPayMethod("pix"); setPixData(null);
    setPendingId(null); setPassword(""); setConfirmPassword("");
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  // ---------- Etapa 1: validar dados e checar e-mail ----------
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    const trimmedName = name.trim().replace(/\s+/g, " ");
    if (!splitFullName(trimmedName)) return toast.error("Informe seu nome completo (nome e sobrenome).");
    if (!isValidCpf(cpf)) return toast.error("CPF inválido.");
    if (onlyDigits(whatsapp).length < 10) return toast.error("WhatsApp inválido.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("E-mail inválido.");
    if (!acceptedTerms) return toast.error("Aceite os Termos para continuar.");

    setSubmitting(true);
    try {
      const exists = await checkEmailExists(email.trim());
      if (exists) {
        toast.info("Este e-mail já tem conta. Vamos te levar para o login.");
        setTimeout(() => navigate(`/login?redirect=/planos?plano=${plan.slug}`), 1200);
        return;
      }
      setStep("payment");
      trackEvent("initiate_checkout", {
        value: plan.price, currency: "BRL",
        content_ids: [plan.slug], content_name: plan.name,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Etapa 2: cartão (Mercado Pago Brick) ----------
  useEffect(() => {
    if (step !== "payment" || payMethod !== "card") {
      try { cardFormRef.current?.unmount(); } catch {}
      cardFormRef.current = null;
      return;
    }
    const publicKey = (import.meta as any).env.VITE_MP_PUBLIC_KEY;
    if (!publicKey || !(window as any).MercadoPago) {
      toast.error("SDK do Mercado Pago não carregado");
      return;
    }
    const mp = new (window as any).MercadoPago(publicKey, { locale: "pt-BR" });
    try { cardFormRef.current?.unmount(); } catch {}

    const trimmedName = name.trim().replace(/\s+/g, " ");
    const cpfDigits = onlyDigits(cpf);

    cardFormRef.current = mp.cardForm({
      amount: plan!.price.toFixed(2),
      iframe: true,
      form: {
        id: "mp-checkout-form",
        cardNumber: { id: "mp-card-number", placeholder: "Número do cartão" },
        expirationDate: { id: "mp-expiration-date", placeholder: "MM/AA" },
        securityCode: { id: "mp-security-code", placeholder: "CVV" },
        cardholderName: { id: "mp-cardholder-name", placeholder: "Nome no cartão" },
        issuer: { id: "mp-issuer", placeholder: "Banco emissor" },
        installments: { id: "mp-installments", placeholder: "Parcelas" },
        identificationType: { id: "mp-identification-type", placeholder: "Tipo doc." },
        identificationNumber: { id: "mp-identification-number", placeholder: "CPF" },
        cardholderEmail: { id: "mp-cardholder-email", placeholder: "E-mail" },
      },
      callbacks: {
        onFormMounted: () => {
          try {
            const emailEl = document.getElementById("mp-cardholder-email") as HTMLInputElement | null;
            const nameEl = document.getElementById("mp-cardholder-name") as HTMLInputElement | null;
            const idNumEl = document.getElementById("mp-identification-number") as HTMLInputElement | null;
            if (emailEl && !emailEl.value) emailEl.value = email.trim();
            if (nameEl && !nameEl.value) nameEl.value = trimmedName;
            if (idNumEl && !idNumEl.value) idNumEl.value = cpfDigits;
          } catch {}
        },
        onSubmit: async (event: Event) => {
          event.preventDefault();
          setSubmitting(true);
          try {
            const formData = cardFormRef.current.getCardFormData();
            let deviceId = "";
            try {
              const mp2 = new (window as any).MercadoPago(publicKey);
              deviceId = await mp2.getDeviceSolution();
            } catch {}
            const result = await processAnonymousCardPayment({
              token: formData.token,
              issuer_id: formData.issuer_id,
              payment_method_id: formData.payment_method_id,
              transaction_amount: plan!.price,
              installments: formData.installments,
              plan: plan!.slug,
              device_id: deviceId,
              payer: {
                email: email.trim(),
                first_name: splitFullName(trimmedName)!.firstName,
                last_name: splitFullName(trimmedName)!.lastName,
                phone: whatsapp,
                identification: { type: "CPF", number: cpfDigits },
              },
            });
            
            // Generate a stable event_id for deduplication
            const purchaseEventId = `pur_${result.id}_${Date.now()}`;
            handlePaymentResult(result, purchaseEventId);
          } catch (err: any) {
            if (err.code === "email_exists") {
              toast.error("Este e-mail já tem conta. Faça login e volte para concluir.");
              setTimeout(() => navigate(`/login?redirect=/planos?plano=${plan!.slug}`), 1500);
            } else {
              toast.error(err.message || "Falha no pagamento");
            }
          } finally {
            setSubmitting(false);
          }
        },
      },
    });
    return () => { try { cardFormRef.current?.unmount(); } catch {} };
  }, [step, payMethod, plan, email, name, cpf, whatsapp, navigate]);

  // ---------- Etapa 2 (PIX) ----------
  const handleCreatePix = async () => {
    if (!plan) return;
    const trimmedName = name.trim().replace(/\s+/g, " ");
    const parts = splitFullName(trimmedName)!;
    setSubmitting(true);
    try {
      let deviceId = "";
      try {
        const mp = new (window as any).MercadoPago((import.meta as any).env.VITE_MP_PUBLIC_KEY);
        deviceId = await mp.getDeviceSolution();
      } catch {}
      const result = await createAnonymousPixPayment({
        plan: plan.slug,
        device_id: deviceId,
        payer: {
          email: email.trim(),
          first_name: parts.firstName,
          last_name: parts.lastName,
          phone: whatsapp,
          identification: { type: "CPF", number: onlyDigits(cpf) },
        },
      });
      // Generate a stable event_id for deduplication
      const purchaseEventId = `pur_${result.id}_${Date.now()}`;
      handlePaymentResult(result, purchaseEventId);
    } catch (err: any) {
      if (err.code === "email_exists") {
        toast.error("Este e-mail já tem conta. Faça login e volte para concluir.");
        setTimeout(() => navigate(`/login?redirect=/planos?plano=${plan!.slug}`), 1500);
      } else {
        toast.error(err.message || "Erro ao gerar PIX");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentResult = (result: PaymentResponse) => {
    if (result.pending_id) setPendingId(result.pending_id);
    if (result.status === "approved") {
      trackPurchase(result);
      setStep("set-password");
      return;
    }
    if (result.qr_code || result.qr_code_base64) {
      setPixData({
        qrCode: result.qr_code,
        qrCodeBase64: result.qr_code_base64,
        ticketUrl: result.ticket_url,
        paymentId: result.id,
      });
      setStep("pix-wait");
    } else {
      toast.info("Pagamento em processamento. Tente novamente em instantes.");
    }
  };

  const trackPurchase = (result: PaymentResponse) => {
    if (!plan) return;
    const txId = String(result.id);
    trackEvent("purchase", {
      event_id: txId,
      value: plan.price,
      currency: "BRL",
      transaction_id: txId,
      content_ids: [plan.slug],
      content_name: plan.name,
      email: email.trim(),
      phone: whatsapp,
    });
  };

  // ---------- Polling do PIX ----------
  useEffect(() => {
    if (step !== "pix-wait" || !pendingId) return;
    let active = true;
    const interval = setInterval(async () => {
      const res = await pollPendingApproved(pendingId);
      if (!active) return;
      if (res?.status === "approved") {
        clearInterval(interval);
        toast.success("Pagamento confirmado!");
        if (pixData?.paymentId) trackPurchase({ id: pixData.paymentId } as any, pixData.purchaseEventId);
        setStep("set-password");
      } else if (res?.status === "claimed") {
        clearInterval(interval);
        toast.info("Pagamento já finalizado. Faça login.");
        navigate("/login");
      }
    }, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [step, pendingId, pixData?.paymentId, navigate]);

  const handleCopyPix = async () => {
    if (!pixData?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      toast.success("Código PIX copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  // ---------- Etapa 3: definir senha e finalizar ----------
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres.");
    if (password !== confirmPassword) return toast.error("As senhas não coincidem.");
    if (!pendingId) return toast.error("Sessão expirada. Recarregue a página.");

    setSubmitting(true);
    try {
      const result = await claimPendingSubscription({ pending_id: pendingId, password });
      // login automático
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: result.email, password,
      });
      if (signInErr) {
        toast.success("Conta criada! Faça login para continuar.");
        navigate("/login");
        handleClose(false);
        return;
      }
      toast.success("Tudo pronto! Bem-vindo.");
      handleClose(false);
      navigate("/dashboard");
    } catch (err: any) {
      if (err.code === "already_claimed" || err.code === "email_exists") {
        toast.error(err.message);
        navigate("/login");
        handleClose(false);
      } else {
        toast.error(err.message || "Falha ao criar conta");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!plan) return null;

  const titles: Record<Step, string> = {
    "form": "Seus dados",
    "payment": "Pagamento",
    "pix-wait": "Aguardando pagamento",
    "set-password": "Crie sua senha",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titles[step]}</DialogTitle>
          <DialogDescription>
            Plano {plan.name} — R$ {plan.price.toFixed(2).replace(".", ",")}
          </DialogDescription>
        </DialogHeader>

        {/* ---------- ETAPA 1 ---------- */}
        {step === "form" && (
          <form onSubmit={handleSubmitForm} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pc-name">Nome completo</Label>
              <Input id="pc-name" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Nome e sobrenome" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-cpf">CPF</Label>
              <Input id="pc-cpf" inputMode="numeric" value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-wa">WhatsApp</Label>
              <Input id="pc-wa" type="tel" value={whatsapp}
                onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
                placeholder="(11) 99999-9999" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-email">E-mail</Label>
              <Input id="pc-email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com" required />
            </div>

            <div className="flex items-start gap-2 pt-1">
              <Checkbox id="pc-terms" checked={acceptedTerms}
                onCheckedChange={(v) => setAcceptedTerms(v === true)} className="mt-0.5" />
              <label htmlFor="pc-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                Li e aceito os{" "}
                <Link to="/termos" target="_blank" className="text-primary underline">Termos</Link>{" "}
                e a{" "}
                <Link to="/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</Link>.
              </label>
            </div>

            <Button type="submit" disabled={submitting || !acceptedTerms} className="w-full gap-2 mt-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Continuar para pagamento <ArrowRight className="h-4 w-4" /></>)}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              A senha será criada após o pagamento ser confirmado.
            </p>
          </form>
        )}

        {/* ---------- ETAPA 2 ---------- */}
        {step === "payment" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setStep("form")} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <p className="text-sm text-muted-foreground">Escolha como pagar</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant={payMethod === "pix" ? "default" : "outline"}
                onClick={() => setPayMethod("pix")} className="gap-2">
                <QrCode className="h-4 w-4" /> PIX
              </Button>
              <Button variant={payMethod === "card" ? "default" : "outline"}
                onClick={() => setPayMethod("card")} className="gap-2">
                <CreditCard className="h-4 w-4" /> Cartão
              </Button>
            </div>

            {payMethod === "pix" && (
              <Button onClick={handleCreatePix} disabled={submitting} className="w-full gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Gerar QR Code PIX</>}
              </Button>
            )}

            {payMethod === "card" && (
              <form id="mp-checkout-form" className="space-y-3">
                <div id="mp-card-number" className="h-10 rounded-md border border-border bg-secondary px-3" />
                <div className="grid grid-cols-2 gap-2">
                  <div id="mp-expiration-date" className="h-10 rounded-md border border-border bg-secondary px-3" />
                  <div id="mp-security-code" className="h-10 rounded-md border border-border bg-secondary px-3" />
                </div>
                <input id="mp-cardholder-name" className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm" placeholder="Nome no cartão" />
                <input id="mp-cardholder-email" type="email" className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm" placeholder="E-mail" />
                <div className="grid grid-cols-2 gap-2">
                  <select id="mp-identification-type" className="h-10 rounded-md border border-border bg-secondary px-3 text-sm" />
                  <input id="mp-identification-number" className="h-10 rounded-md border border-border bg-secondary px-3 text-sm" placeholder="CPF" />
                </div>
                <select id="mp-issuer" className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm" />
                <select id="mp-installments" className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm" />
                <Button type="submit" disabled={submitting} className="w-full gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Pagar R$ {plan.price.toFixed(2).replace(".", ",")}</>}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* ---------- AGUARDANDO PIX ---------- */}
        {step === "pix-wait" && pixData && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-primary animate-pulse" /> Aguardando pagamento via PIX
              </div>
              {pixData.qrCodeBase64 && (
                <div className="flex items-center justify-center">
                  <img src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code PIX"
                    className="h-48 w-48 rounded-lg border border-border bg-white p-2" />
                </div>
              )}
              {pixData.qrCode && (
                <div className="space-y-2">
                  <Label className="text-xs">Código copia e cola</Label>
                  <div className="flex items-center gap-2">
                    <input readOnly value={pixData.qrCode}
                      className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-xs" />
                    <Button variant="outline" size="sm" onClick={handleCopyPix} className="gap-1">
                      <Copy className="h-3.5 w-3.5" /> Copiar
                    </Button>
                  </div>
                </div>
              )}
              {pixData.ticketUrl && (
                <Button asChild variant="outline" className="w-full gap-2">
                  <a href={pixData.ticketUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" /> Abrir link do PIX
                  </a>
                </Button>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Assim que o pagamento for confirmado, você poderá criar sua senha.
              <br />Se você fechar esta tela, poderá voltar pelo link enviado para seu e-mail.
            </p>
          </div>
        )}

        {/* ---------- ETAPA 3 ---------- */}
        {step === "set-password" && (
          <form onSubmit={handleSetPassword} className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Pagamento confirmado! Crie sua senha para acessar.
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={email} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="set-pwd">Senha</Label>
              <div className="relative">
                <Input id="set-pwd" type={showPwd ? "text" : "password"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres" minLength={6} required />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="set-pwd2">Confirmar senha</Label>
              <Input id="set-pwd2" type={showPwd ? "text" : "password"}
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6} required />
            </div>
            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Criar conta e entrar</>}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
