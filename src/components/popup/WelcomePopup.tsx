import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Instagram, Link as LinkIcon, X, Crown } from "lucide-react";
import { useAuth, useProfile, useAssinatura } from "@/hooks/useUser";
import { useWelcomePopupSettings, type PopupLink } from "@/hooks/useWelcomePopup";
import { useNavigate } from "react-router-dom";

const ICON_MAP = {
  whatsapp: MessageCircle,
  telegram: Send,
  instagram: Instagram,
  link: LinkIcon,
} as const;

function dismissKey(version: number, userId: string) {
  return `welcome_popup_dismissed_v${version}_${userId}`;
}

function sessionDismissKey(version: number, userId: string) {
  return `welcome_popup_session_dismissed_v${version}_${userId}`;
}

export function WelcomePopup() {
  const { user } = useAuth();
  const { data: popup } = useWelcomePopupSettings();
  const { data: profile } = useProfile(user?.id);
  const { data: assinatura } = useAssinatura(user?.id);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const currentPlanSlug = (assinatura as any)?.plan;
    const isSubscriber =
      !!assinatura &&
      assinatura.status === "active" &&
      (!assinatura.expires_at || new Date(assinatura.expires_at) > new Date());

    // 1. Verificar exclusão por plano (ex: quem já tem Vitalício não vê promo de Vitalício)
    if (currentPlanSlug && popup.exclude_plan_slugs?.includes(currentPlanSlug)) {
      return;
    }

    // 2. Verificar inclusão por plano (se houver, apenas estes verão)
    if (popup.include_plan_slugs?.length > 0) {
      if (!currentPlanSlug || !popup.include_plan_slugs.includes(currentPlanSlug)) {
        return;
      }
    }

    let eligible = false;
    if (isSubscriber) {
      eligible = popup.show_to_subscribers;
    } else if (popup.show_to_new) {
      if (popup.new_user_days <= 0) {
        eligible = true;
      } else if (profile?.created_at) {
        const ageMs = Date.now() - new Date(profile.created_at).getTime();
        const ageDays = ageMs / 86_400_000;
        eligible = ageDays <= popup.new_user_days;
      } else {
        eligible = true;
      }
    }
    if (!eligible) return;

    const permanentKey = dismissKey(popup.version, user.id);
    const sessionKey = sessionDismissKey(popup.version, user.id);
    
    if (localStorage.getItem(permanentKey)) return;
    if (sessionStorage.getItem(sessionKey)) return;

    setOpen(true);
  }, [user, popup, profile, assinatura]);

  const handlePermanentClose = () => {
    if (user && popup) {
      localStorage.setItem(dismissKey(popup.version, user.id), "1");
    }
    setOpen(false);
  };

  const handleSessionClose = () => {
    if (user && popup) {
      sessionStorage.setItem(sessionDismissKey(popup.version, user.id), "1");
    }
    setOpen(false);
  };

  if (!popup) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleSessionClose())}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {popup.image_url && (
          <img
            src={popup.image_url}
            alt={popup.title}
            className="w-full h-44 object-cover"
          />
        )}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{popup.title}</h2>
            {popup.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {popup.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            {popup.plan_slug && (
              <Button 
                className="w-full h-12 gap-2 text-base font-bold shadow-lg shadow-primary/20"
                onClick={() => {
                  handleSessionClose();
                  navigate(`/ofertas?plan=${popup.plan_slug}${popup.discount_coupon ? `&coupon=${popup.discount_coupon}` : ""}`);
                }}
              >
                <Crown className="h-5 w-5" />
                {popup.cta_label || "Assinar Agora"}
              </Button>
            )}

            {popup.links.map((l: PopupLink, i: number) => {
              const Icon = ICON_MAP[l.icon ?? "link"];
              return (
                <Button
                  key={i}
                  asChild
                  variant="outline"
                  className="w-full justify-start gap-2 h-12"
                >
                  <a href={l.url} target="_blank" rel="noopener noreferrer">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-medium">{l.label}</span>
                  </a>
                </Button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            <Button onClick={handleSessionClose} variant="ghost" size="sm" className="text-xs">
              Me avise mais tarde
            </Button>
            <Button onClick={handlePermanentClose} variant="ghost" size="sm" className="text-xs text-muted-foreground">
              Não mostrar novamente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
