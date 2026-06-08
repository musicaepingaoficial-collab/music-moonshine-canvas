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
      className={`mb-3 rounded-lg pl-3 pr-10 sm:pr-12 py-2 flex items-center gap-2 text-xs sm:text-sm font-medium border ${
        isExpired
          ? "bg-red-50 text-red-700 border-red-200"
          : isCritical
          ? "bg-red-50 text-red-600 border-red-200"
          : "bg-orange-50 text-orange-700 border-orange-200"
      }`}
      aria-live="polite"
    >
      <Clock className={`h-4 w-4 shrink-0 ${isCritical && !isExpired ? "animate-pulse" : ""}`} />
      {isExpired ? (
        <span className="truncate">Tempo esgotado — recarregue para tentar novamente</span>
      ) : (
        <span className="truncate">
          Seu desconto expira em{" "}
          <span className="font-mono font-bold tabular-nums">{fmt(remaining)}</span>
        </span>
      )}
    </div>
  );
}
