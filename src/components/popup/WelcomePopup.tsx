import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Instagram, Link as LinkIcon, X } from "lucide-react";
import { useAuth, useProfile, useAssinatura } from "@/hooks/useUser";
import { useWelcomePopupSettings, type PopupLink } from "@/hooks/useWelcomePopup";

const ICON_MAP = {
  whatsapp: MessageCircle,
  telegram: Send,
  instagram: Instagram,
  link: LinkIcon,
} as const;

function dismissKey(version: number, userId: string) {
  return `welcome_popup_dismissed_v${version}_${userId}`;
}

export function WelcomePopup() {
  const { user } = useAuth();
  const { data: popup } = useWelcomePopupSettings();
  const { data: profile } = useProfile(user?.id);
  const { data: assinatura } = useAssinatura(user?.id);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || !popup || !popup.active) return;

    const isSubscriber =
      !!assinatura &&
      assinatura.status === "active" &&
      (!assinatura.expires_at || new Date(assinatura.expires_at) > new Date());

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

    const key = dismissKey(popup.version, user.id);
    if (localStorage.getItem(key)) return;

    setOpen(true);
  }, [user, popup, profile, assinatura]);

  const handleClose = () => {
    if (user && popup) {
      localStorage.setItem(dismissKey(popup.version, user.id), "1");
    }
    setOpen(false);
  };

  if (!popup) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
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

          {popup.links.length > 0 && (
            <div className="space-y-2">
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
          )}

          <Button onClick={handleClose} variant="ghost" className="w-full gap-2">
            <X className="h-4 w-4" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
