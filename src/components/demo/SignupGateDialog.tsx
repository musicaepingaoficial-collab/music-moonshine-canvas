import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { useNavigate } from "react-router-dom";
import { Crown, Download, Music2, Lock } from "lucide-react";

const COPY: Record<string, { title: string; desc: string; icon: typeof Crown }> = {
  plays: {
    title: "Você ouviu suas 5 músicas grátis",
    desc: "Crie sua conta e assine um plano para ouvir e baixar tudo, sem limite.",
    icon: Music2,
  },
  download: {
    title: "Downloads são exclusivos para assinantes",
    desc: "Crie sua conta e assine para baixar músicas, PDFs e discografias completas.",
    icon: Download,
  },
  private: {
    title: "Essa área é exclusiva para assinantes",
    desc: "Crie sua conta para acessar favoritos, repertórios, downloads e muito mais.",
    icon: Lock,
  },
};

export function SignupGateDialog() {
  const { gate, closeGate, deactivateDemo } = useDemoMode();
  const navigate = useNavigate();
  const reason = gate.reason || "plays";
  const meta = COPY[reason] ?? COPY.plays;
  const Icon = meta.icon;

  const handleConvert = async (to: string) => {
    closeGate();
    // End the anonymous session before the checkout/login flow so the user
    // can sign up with a real email without colliding with the anon session.
    await deactivateDemo();
    navigate(to);
  };

  return (
    <Dialog open={gate.open} onOpenChange={(open) => !open && closeGate()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-xl">{meta.title}</DialogTitle>
          <DialogDescription className="text-center">{meta.desc}</DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 py-2 text-sm">
          <li className="flex items-center gap-2"><Crown className="h-4 w-4 text-primary" /> Acesso completo à biblioteca</li>
          <li className="flex items-center gap-2"><Crown className="h-4 w-4 text-primary" /> Downloads ilimitados</li>
          <li className="flex items-center gap-2"><Crown className="h-4 w-4 text-primary" /> Repertórios e PDFs inclusos</li>
        </ul>

        <div className="flex flex-col gap-2">
          <Button size="lg" className="w-full" onClick={() => handleConvert("/#planos")}>
            Ver planos e assinar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleConvert("/login")}>
            Já tenho conta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
