import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Check, Phone } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useUser";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: { id: string; name: string | null; whatsapp: string | null } | null;
}

interface Template {
  id: string;
  title: string;
  body: string;
  order_index: number;
}

function applyPlaceholders(body: string, name: string | null) {
  const fullName = (name || "").trim();
  const firstName = fullName.split(" ")[0] || "amigo";
  const planosUrl = `${window.location.origin}/#planos`;
  return body
    .replace(/\{primeiro_nome\}/g, firstName)
    .replace(/\{nome\}/g, fullName || firstName)
    .replace(/\{link_planos\}/g, planosUrl);
}

export function WhatsAppRecoveryDialog({ open, onOpenChange, user }: Props) {
  const { user: currentAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const { data: templates, isLoading } = useQuery({
    queryKey: ["whatsapp-recovery-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_recovery_templates")
        .select("id, title, body, order_index")
        .eq("active", true)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Template[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (open && templates && templates.length && !selectedId) {
      const first = templates[0];
      setSelectedId(first.id);
      setMessage(applyPlaceholders(first.body, user?.name ?? null));
    }
    if (!open) {
      setSelectedId(null);
      setMessage("");
    }
  }, [open, templates, user, selectedId]);

  const phone = useMemo(() => user?.whatsapp?.replace(/\D/g, "") ?? "", [user]);

  const logMutation = useMutation({
    mutationFn: async ({ openWa }: { openWa: boolean }) => {
      if (!user || !currentAdmin) throw new Error("Sessão inválida.");
      const { error } = await supabase.from("whatsapp_recovery_log").insert({
        user_id: user.id,
        sent_by: currentAdmin.id,
        template_id: selectedId,
        message,
      });
      if (error) throw error;
      if (openWa) {
        if (!phone) throw new Error("Usuário sem WhatsApp.");
        window.open(
          `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`,
          "_blank"
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-recovery-log"] });
      toast.success("Envio registrado.");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao registrar envio."),
  });

  const pickTemplate = (t: Template) => {
    setSelectedId(t.id);
    setMessage(applyPlaceholders(t.body, user?.name ?? null));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Mensagem de recuperação
          </DialogTitle>
          <DialogDescription className="text-xs flex items-center gap-2">
            <span>Para: <strong>{user?.name || "—"}</strong></span>
            {phone ? (
              <Badge variant="secondary" className="gap-1">
                <Phone className="h-3 w-3" /> {user?.whatsapp}
              </Badge>
            ) : (
              <Badge variant="destructive">Sem WhatsApp</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground mb-2">
              Escolha um modelo
            </p>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid gap-2">
                {(templates ?? []).map((t) => {
                  const active = selectedId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pickTemplate(t)}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm">{t.title}</span>
                        {active && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {t.body}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedId && (
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground mb-2">
                Mensagem (edite antes de enviar)
              </p>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground text-right mt-1">
                {message.length} caracteres
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            disabled={!selectedId || logMutation.isPending}
            onClick={() => logMutation.mutate({ openWa: false })}
          >
            Apenas marcar como enviado
          </Button>
          <Button
            disabled={!selectedId || !phone || !message.trim() || logMutation.isPending}
            onClick={() => logMutation.mutate({ openWa: true })}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Abrir no WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
