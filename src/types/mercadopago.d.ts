declare class MercadoPago {
  constructor(publicKey: string, options?: { locale?: string });
  cardForm(options: {
    amount: string;
    iframe?: boolean;
    form: {
      id: string;
      cardNumber: { id: string; placeholder?: string; style?: Record<string, string> };
      expirationDate: { id: string; placeholder?: string; style?: Record<string, string> };
      securityCode: { id: string; placeholder?: string; style?: Record<string, string> };
      cardholderName: { id: string; placeholder?: string };
      issuer: { id: string; placeholder?: string };
      installments: { id: string; placeholder?: string };
      identificationType: { id: string; placeholder?: string };
      identificationNumber: { id: string; placeholder?: string };
      cardholderEmail: { id: string; placeholder?: string };
    };
    callbacks: {
      onFormMounted: (error?: any) => void;
      onSubmit: (event: Event) => void;
      onFetching: (resource: string) => (() => void);
      onError?: (error: any) => void;
      onValidityChange?: (error: any, field: string) => void;
      onReady?: () => void;
    };
  }): {
    getCardFormData: () => {
      token: string;
      issuer_id: string;
      payment_method_id: string;
      transaction_amount: number;
      installments: number;
      payer: {
        email: string;
        identification: { type: string; number: string };
      };
    };
    unmount: () => void;
    submit: () => void;
  };
}

interface Window {
  MercadoPago: typeof MercadoPago;
}
