import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  planSlug: string;
  /** Duração em segundos. Padrão: 5 minutos. */
  seconds?: number;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

export function CheckoutUrgencyBar({ planSlug, seconds = 300 }: Props) {
  const storageKey = `checkout_deadline_${planSlug}`;

  const [remaining, setRemaining] = useState<number>(() => {
    if (typeof window === "undefined") return seconds;
    const saved = Number(sessionStorage.getItem(storageKey));
    if (saved && saved > Date.now()) {
      return Math.max(0, Math.round((saved - Date.now()) / 1000));
    }
    const deadline = Date.now() + seconds * 1000;
    sessionStorage.setItem(storageKey, String(deadline));
    return seconds;
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      const deadline = Number(sessionStorage.getItem(storageKey)) || 0;
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [storageKey]);

  const isCritical = remaining <= 60;
  const isExpired = remaining <= 0;

  return (
    <div
      className={`relative mb-4 rounded-xl pl-3 pr-10 sm:pr-12 py-2.5 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium border backdrop-blur-sm overflow-hidden ${
        isExpired
          ? "bg-destructive/15 text-destructive border-destructive/30"
          : isCritical
          ? "bg-destructive/10 text-destructive border-destructive/25"
          : "bg-primary/10 text-primary border-primary/25"
      }`}
      aria-live="polite"
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 opacity-60 ${
          isExpired || isCritical
            ? "bg-[radial-gradient(ellipse_at_center,hsl(var(--destructive)/0.18),transparent_70%)]"
            : "bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.18),transparent_70%)]"
        }`}
      />
      <Clock className={`relative h-4 w-4 shrink-0 ${isCritical && !isExpired ? "animate-pulse" : ""}`} />
      {isExpired ? (
        <span className="relative truncate text-center">Tempo esgotado — recarregue para tentar novamente</span>
      ) : (
        <span className="relative truncate text-center">
          Seu desconto expira em{" "}
          <span className="font-mono font-bold tabular-nums tracking-tight">{fmt(remaining)}</span>
        </span>
      )}
    </div>
  );
}
