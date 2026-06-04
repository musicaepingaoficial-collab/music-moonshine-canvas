// Carrega o SDK do Mercado Pago sob demanda (apenas quando o checkout abre).
// Mantém a landing leve — o script só é baixado quando realmente necessário.

let promise: Promise<void> | null = null;

export function loadMercadoPagoSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).MercadoPago) return Promise.resolve();
  if (promise) return promise;

  promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://sdk.mercadopago.com/js/v2"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar Mercado Pago SDK")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      promise = null;
      reject(new Error("Falha ao carregar Mercado Pago SDK"));
    };
    document.head.appendChild(s);
  });

  return promise;
}
