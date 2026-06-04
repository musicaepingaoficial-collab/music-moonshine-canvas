import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  /** Seconds to count down from. Default 10 minutes. */
  seconds?: number;
  /** Optional callback when timer hits zero. */
  onExpire?: () => void;
}

export const PixCountdown = ({ seconds = 600, onExpire }: Props) => {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining, onExpire]);

  const m = Math.floor(remaining / 60).toString().padStart(2, "0");
  const s = (remaining % 60).toString().padStart(2, "0");
  const expired = remaining <= 0;
  const urgent = remaining > 0 && remaining <= 120;

  return (
    <div
      className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium border ${
        expired
          ? "bg-destructive/10 border-destructive/30 text-destructive"
          : urgent
          ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
          : "bg-primary/10 border-primary/20 text-primary"
      }`}
    >
      <Clock className="h-4 w-4" />
      {expired ? (
        <span>PIX expirado — gere um novo para concluir a compra</span>
      ) : (
        <span>
          Pague em até <span className="font-bold tabular-nums">{m}:{s}</span> para garantir sua compra
        </span>
      )}
    </div>
  );
};

export default PixCountdown;
