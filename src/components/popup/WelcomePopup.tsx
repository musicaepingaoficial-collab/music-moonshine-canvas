import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Instagram, Link as LinkIcon, Crown, Megaphone } from "lucide-react";
import { useAuth, useProfile, useAssinatura } from "@/hooks/useUser";
import { useWelcomePopupSettings, type PopupLink, type WelcomePopup as WelcomePopupType } from "@/hooks/useWelcomePopup";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

function formatBRL(value: number) {
  return value.toFixed(2).replace(".", ",");
}

const ICON_MAP = {
  whatsapp: MessageCircle,
  telegram: Send,
  instagram: Instagram,
  link: LinkIcon,
} as const;

function dismissKey(version: number, userId: string, popupId: string) {
  return `welcome_popup_dismissed_v${version}_${userId}_${popupId}`;
}

function sessionDismissKey(version: number, userId: string, popupId: string) {
  return `welcome_popup_session_dismissed_v${version}_${userId}_${popupId}`;
}

export function WelcomePopup() {
  const { user } = useAuth();
  const { data: popups = [] } = useWelcomePopupSettings();
  const { data: profile } = useProfile(user?.id);
  const { data: assinatura } = useAssinatura(user?.id);
  const [activePopupIndex, setActivePopupIndex] = useState<number>(-1);
  const [open, setOpen] = useState(false);
  const eligiblePopupsRef = useRef<WelcomePopupType[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || popups.length === 0) return;

    const currentPlanSlug = (assinatura as any)?.plan;
    const isSubscriber =
      !!assinatura &&
      assinatura.status === "active" &&
      (!assinatura.expires_at || new Date(assinatura.expires_at) > new Date());

    const eligible = popups.filter((popup) => {
      if (!popup.active) return false;

      // 1. Verificar exclusão por plano
      if (currentPlanSlug && popup.exclude_plan_slugs?.includes(currentPlanSlug)) {
        return false;
      }

      // 2. Verificar inclusão por plano
      if (popup.include_plan_slugs?.length > 0) {
        if (!currentPlanSlug || !popup.include_plan_slugs.includes(currentPlanSlug)) {
          return false;
        }
      }

      let userEligible = false;
      if (isSubscriber) {
        userEligible = popup.show_to_subscribers;
      } else if (popup.show_to_new) {
        if (popup.new_user_days <= 0) {
          userEligible = true;
        } else if (profile?.created_at) {
          const ageMs = Date.now() - new Date(profile.created_at).getTime();
          const ageDays = ageMs / 86_400_000;
          userEligible = ageDays <= popup.new_user_days;
        } else {
          userEligible = true;
        }
      }

      if (!userEligible) return false;

      // Verificar se já foi visualizado
      const permanentKey = dismissKey(popup.version, user.id, popup.id);
      const sessionKey = sessionDismissKey(popup.version, user.id, popup.id);
      
      if (localStorage.getItem(permanentKey)) return false;
      if (sessionStorage.getItem(sessionKey)) return false;

      return true;
    });

    if (eligible.length > 0) {
      eligiblePopupsRef.current = eligible;
      const firstDelay = Math.max(0, Number((eligible[0] as any).delay_seconds ?? 0)) * 1000;
      const t = setTimeout(() => {
        setActivePopupIndex(0);
        setOpen(true);
      }, firstDelay);
      return () => clearTimeout(t);
    }
  }, [user, popups, profile, assinatura]);

  const showNextPopup = () => {
    setOpen(false);
    const nextIndex = activePopupIndex + 1;
    
    if (nextIndex < eligiblePopupsRef.current.length) {
      // Aguardar 5 segundos antes de mostrar o próximo
      setTimeout(() => {
        setActivePopupIndex(nextIndex);
        setOpen(true);
      }, 5000);
    }
  };

  const handlePermanentClose = () => {
    const currentPopup = eligiblePopupsRef.current[activePopupIndex];
    if (user && currentPopup) {
      localStorage.setItem(dismissKey(currentPopup.version, user.id, currentPopup.id), "1");
    }
    showNextPopup();
  };

  const handleSessionClose = () => {
    const currentPopup = eligiblePopupsRef.current[activePopupIndex];
    if (user && currentPopup) {
      sessionStorage.setItem(sessionDismissKey(currentPopup.version, user.id, currentPopup.id), "1");
    }
    showNextPopup();
  };

  const currentPopup = eligiblePopupsRef.current[activePopupIndex];

  const { data: planData } = useQuery({
    queryKey: ["popup-plan", currentPopup?.plan_slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("planos")
        .select("price")
        .eq("slug", currentPopup!.plan_slug!)
        .maybeSingle();
      return data;
    },
    enabled: !!currentPopup?.plan_slug,
    staleTime: 5 * 60 * 1000,
  });

  const { data: couponData } = useQuery({
    queryKey: ["popup-coupon", currentPopup?.discount_coupon],
    queryFn: async () => {
      const { data } = await supabase
        .from("cupons")
        .select("desconto_percentual")
        .eq("codigo", currentPopup!.discount_coupon!.toUpperCase())
        .eq("ativo", true)
        .maybeSingle();
      return data;
    },
    enabled: !!currentPopup?.discount_coupon,
    staleTime: 5 * 60 * 1000,
  });

  if (!currentPopup) return null;

  const basePrice = Number(planData?.price ?? 0);
  const discountPct = Number(couponData?.desconto_percentual ?? 0);
  const finalPrice = basePrice * (1 - discountPct / 100);

  return (
    <Dialog open={open} onOpenChange={(o) => (!o && handleSessionClose())}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
        {currentPopup.image_url && (
          <img
            src={currentPopup.image_url}
            alt={currentPopup.title}
            className="w-full h-48 object-cover"
          />
        )}
        <div className="p-6 space-y-5 bg-card">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground leading-tight">{currentPopup.title}</h2>
            {currentPopup.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {currentPopup.description}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {currentPopup.plan_slug && basePrice > 0 && (
              <div className="space-y-2">
                <div className="flex flex-col items-center">
                  {discountPct > 0 && (
                    <span className="text-[10px] uppercase font-bold text-muted-foreground line-through">
                      De R$ {formatBRL(basePrice)}
                    </span>
                  )}
                  <span className="text-sm font-bold text-emerald-500">
                    Por apenas R$ {formatBRL(finalPrice)}
                  </span>
                </div>
                <Button 
                  className="w-full h-14 gap-3 text-lg font-black shadow-lg shadow-primary/20 uppercase tracking-tighter"
                  onClick={() => {
                    handleSessionClose();
                    navigate(`/ofertas?plan=${currentPopup.plan_slug}${currentPopup.discount_coupon ? `&coupon=${currentPopup.discount_coupon}` : ""}`);
                  }}
                >
                  <Crown className="h-6 w-6" />
                  {currentPopup.cta_label || "Aproveitar Oferta Agora"}
                </Button>
              </div>
            )}

            {currentPopup.links.map((l: PopupLink, i: number) => {
              const Icon = ICON_MAP[l.icon ?? "link"];
              return (
                <Button
                  key={i}
                  asChild
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 border-primary/20 bg-primary/5 hover:bg-primary/10"
                >
                  <a href={l.url} target="_blank" rel="noopener noreferrer">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-bold">{l.label}</span>
                  </a>
                </Button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
            <Button onClick={handleSessionClose} variant="ghost" size="sm" className="text-[10px] uppercase font-bold tracking-widest h-8">
              Me avise mais tarde
            </Button>
            <Button onClick={handlePermanentClose} variant="ghost" size="sm" className="text-[10px] uppercase font-bold tracking-widest h-8 text-muted-foreground">
              Não mostrar novamente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
