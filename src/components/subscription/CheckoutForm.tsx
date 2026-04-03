import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, ArrowLeft, CheckCircle2, XCircle, Clock, QrCode, Copy, ExternalLink } from "lucide-react";
import { createPixPayment, getSubscriptionStatus, processTransparentPayment } from "@/services/paymentService";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useUser";

interface CheckoutFormProps {
  planSlug: string;
  planName: string;
  planPrice: number;
  onBack: () => void;
  onSuccess: () => void;
}

type PaymentStatus = "idle" | "processing" | "approved" | "pending" | "rejected";
type PaymentMethod = "card" | "pix";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const formatCpf = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "";
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
};

const isValidCpf = (value: string) => {
  const cpf = onlyDigits(value);
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (base: string, factor: number) => {
    let total = 0;
    for (const digit of base) {
      total += Number(digit) * factor--;
    }
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const digit1 = calcDigit(cpf.slice(0, 9), 10);
  const digit2 = calcDigit(cpf.slice(0, 10), 11);

  return digit1 === Number(cpf[9]) && digit2 === Number(cpf[10]);
};

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

export function CheckoutForm({ planSlug, planName, planPrice, onBack, onSuccess }: CheckoutFormProps) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [pixEmail, setPixEmail] = useState("");
  const [pixFullName, setPixFullName] = useState("");
  const [pixCpf, setPixCpf] = useState("");
  const [pixData, setPixData] = useState<{
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    paymentId?: number;
  } | null>(null);
  const [pixProcessing, setPixProcessing] = useState(false);
  const cardFormRef = useRef<any>(null);
  const { user } = useAuth();
  const metadataName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    "";

  useEffect(() => {
    if (!pixEmail && user?.email) {
      setPixEmail(user.email);
    }

    if (!pixFullName && metadataName.trim()) {
      setPixFullName(metadataName.trim());
    }
  }, [metadataName, pixEmail, pixFullName, user?.email]);

  useEffect(() => {
    if (paymentMethod !== "card") {
      try { cardFormRef.current?.unmount(); } catch {}
      cardFormRef.current = null;
      return;
    }

    const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
    if (!publicKey || !window.MercadoPago) {
      toast.error("SDK do Mercado Pago não carregado");
      return;
    }

    const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });

    try { cardFormRef.current?.unmount(); } catch {}
    cardFormRef.current = mp.cardForm({
      amount: planPrice.toFixed(2),
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
        onFormMounted: (error: any) => {
          if (error) console.warn("CardForm mount error:", error);
        },
        onSubmit: async (event: Event) => {
          event.preventDefault();
          setStatus("processing");
          setErrorMsg("");

          try {
            const formData = cardFormRef.current.getCardFormData();
            const result = await processTransparentPayment({
              token: formData.token,
              issuer_id: formData.issuer_id,
              payment_method_id: formData.payment_method_id,
              transaction_amount: planPrice,
              installments: formData.installments,
              plan: planSlug,
              payer: {
                email: formData.payer.email,
                identification: formData.payer.identification,
              },
            });

            if (result.status === "approved") {
              setStatus("approved");
              toast.success("Pagamento aprovado! Acesso liberado.");
              setTimeout(() => onSuccess(), 2000);
            } else if (result.status === "in_process" || result.status === "pending") {
              setStatus("pending");
            } else {
              setStatus("rejected");
              setErrorMsg(result.status_detail || "Pagamento recusado. Tente outro cartão.");
            }
          } catch (err: any) {
            setStatus("rejected");
            setErrorMsg(err.message || "Erro ao processar pagamento");
          }
        },
        onFetching: () => {
          return () => {};
        },
      },
    });

    return () => {
      try { cardFormRef.current?.unmount(); } catch {}
    };
  }, [paymentMethod, planPrice, planSlug]);

  const handleSelectMethod = (method: PaymentMethod) => {
    if (method === paymentMethod) return;
    setPaymentMethod(method);
    setStatus("idle");
    setErrorMsg("");
    setPixData(null);
  };

  const handleCreatePix = async () => {
    const email = pixEmail.trim();
    const fullName = pixFullName.trim().replace(/\s+/g, " ");
    const cpf = onlyDigits(pixCpf);
    const nameParts = splitFullName(fullName);

    if (!email) {
      toast.error("Informe um e-mail valido para o Pix");
      return;
    }

    if (!nameParts) {
      toast.error("Informe o nome completo para o Pix");
      return;
    }

    if (!isValidCpf(cpf)) {
      toast.error("Informe um CPF valido para o Pix");
      return;
    }

    setPixProcessing(true);
    setStatus("processing");
    setErrorMsg("");

    try {
      const result = await createPixPayment({
        plan: planSlug,
        payer: {
          email,
          first_name: nameParts.firstName,
          last_name: nameParts.lastName,
          identification: {
            type: "CPF",
            number: cpf,
          },
        },
      });

      if (result.status === "approved") {
        setStatus("approved");
        toast.success("Pagamento aprovado! Acesso liberado.");
        setTimeout(() => onSuccess(), 2000);
        return;
      }

      setPixData({
        qrCode: result.qr_code,
        qrCodeBase64: result.qr_code_base64,
        ticketUrl: result.ticket_url,
        paymentId: result.id,
      });
      setStatus("pending");
    } catch (err: any) {
      setStatus("rejected");
      setErrorMsg(err.message || "Erro ao criar pagamento Pix");
    } finally {
      setPixProcessing(false);
    }
  };

  const handleCopyPix = async () => {
    if (!pixData?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      toast.success("CÃ³digo Pix copiado");
    } catch {
      toast.error("NÃ£o foi possÃ­vel copiar o cÃ³digo");
    }
  };

  const handleCheckPixPayment = async () => {
    try {
      const sub = await getSubscriptionStatus();
      if (sub) {
        toast.success("Pagamento confirmado! Acesso liberado.");
        onSuccess();
      } else {
        toast("Pagamento ainda nÃ£o confirmado.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao verificar pagamento");
    }
  };

  if (status === "approved") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h3 className="text-xl font-bold text-foreground">Pagamento aprovado!</h3>
        <p className="text-sm text-muted-foreground">Seu acesso foi liberado.</p>
      </div>
    );
  }

  if (paymentMethod === "pix" && pixData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h3 className="font-bold text-foreground">{planName}</h3>
            <p className="text-sm text-muted-foreground">
              R$ {planPrice.toFixed(2).replace(".", ",")}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <QrCode className="h-4 w-4 text-primary" />
            Pagamento via Pix
          </div>

          {pixData.qrCodeBase64 ? (
            <div className="flex items-center justify-center">
              <img
                src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                alt="QR Code Pix"
                className="h-48 w-48 rounded-lg border border-border bg-white p-2"
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Use o código abaixo para pagar via Pix.</p>
          )}

          {pixData.qrCode && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Código Pix (copia e cola)</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={pixData.qrCode}
                  className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-xs text-foreground"
                />
                <Button variant="outline" size="sm" onClick={handleCopyPix} className="gap-1">
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </Button>
              </div>
            </div>
          )}

          {pixData.ticketUrl && (
            <Button
              asChild
              variant="outline"
              className="w-full gap-2"
            >
              <a href={pixData.ticketUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Abrir link do Pix
              </a>
            </Button>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} className="flex-1">
              Voltar
            </Button>
            <Button onClick={handleCheckPixPayment} className="flex-1">
              Já paguei
            </Button>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          Após o pagamento, a liberação pode levar alguns minutos.
        </p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Clock className="h-16 w-16 text-yellow-500" />
        <h3 className="text-xl font-bold text-foreground">Pagamento em análise</h3>
        <p className="text-sm text-muted-foreground text-center">
          Seu pagamento está sendo processado. Você receberá acesso assim que for confirmado.
        </p>
        <Button variant="outline" onClick={onSuccess}>Continuar</Button>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <XCircle className="h-16 w-16 text-destructive" />
        <h3 className="text-xl font-bold text-foreground">Pagamento recusado</h3>
        <p className="text-sm text-muted-foreground text-center">{errorMsg}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Voltar</Button>
          <Button onClick={() => { setStatus("idle"); setErrorMsg(""); }}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="font-bold text-foreground">{planName}</h3>
          <p className="text-sm text-muted-foreground">
            R$ {planPrice.toFixed(2).replace(".", ",")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={paymentMethod === "card" ? "default" : "outline"}
          onClick={() => handleSelectMethod("card")}
          className="gap-2"
        >
          <CreditCard className="h-4 w-4" />
          CartÃ£o
        </Button>
        <Button
          type="button"
          variant={paymentMethod === "pix" ? "default" : "outline"}
          onClick={() => handleSelectMethod("pix")}
          className="gap-2"
        >
          <QrCode className="h-4 w-4" />
          Pix
        </Button>
      </div>

      {paymentMethod === "card" ? (
      <form id="mp-checkout-form" className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">E-mail</label>
          <input id="mp-cardholder-email" type="email"
            className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Número do cartão</label>
          <div id="mp-card-number" className="h-10 rounded-md border border-border bg-secondary" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Validade</label>
            <div id="mp-expiration-date" className="h-10 rounded-md border border-border bg-secondary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">CVV</label>
            <div id="mp-security-code" className="h-10 rounded-md border border-border bg-secondary" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nome no cartão</label>
          <input id="mp-cardholder-name" type="text"
            className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Documento</label>
            <select id="mp-identification-type"
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Número</label>
            <input id="mp-identification-number" type="text"
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Parcelas</label>
          <select id="mp-installments"
            className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        {/* Hidden fields required by cardForm */}
        <select id="mp-issuer" className="hidden" />

        <Button
          type="submit"
          className="w-full gap-2"
          disabled={status === "processing"}
        >
          {status === "processing" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Pagar R$ {planPrice.toFixed(2).replace(".", ",")}
            </>
          )}
        </Button>
      </form>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome completo (titular do Pix)</label>
            <input
              type="text"
              value={pixFullName}
              onChange={(e) => setPixFullName(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Nome e sobrenome"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">CPF do titular</label>
            <input
              type="text"
              inputMode="numeric"
              value={pixCpf}
              onChange={(e) => setPixCpf(formatCpf(e.target.value))}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="000.000.000-00"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">E-mail para receber o comprovante</label>
            <input
              type="email"
              value={pixEmail}
              onChange={(e) => setPixEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="seu@email.com"
            />
          </div>
          <Button
            type="button"
            className="w-full gap-2"
            onClick={handleCreatePix}
            disabled={pixProcessing}
          >
            {pixProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <QrCode className="h-4 w-4" />
                Gerar QR Code Pix
              </>
            )}
          </Button>
        </div>
      )}

      <p className="text-center text-[10px] text-muted-foreground">
        Pagamento seguro processado pelo Mercado Pago
      </p>
    </div>
  );
}


