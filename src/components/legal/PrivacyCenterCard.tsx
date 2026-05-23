import { useState } from "react";
import { Shield, Cookie, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openPreferences } from "@/hooks/useCookieConsent";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export function PrivacyCenterCard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-user-data");
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Dados exportados", description: "Seu arquivo foi baixado com sucesso." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Falha ao exportar dados", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== "DELETAR MINHA CONTA") {
      toast({ title: "Confirmação inválida", description: "Digite exatamente: DELETAR MINHA CONTA", variant: "destructive" });
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-user-account", {
        body: { confirm: "DELETAR MINHA CONTA" },
      });
      if (error) throw error;
      await supabase.auth.signOut();
      toast({ title: "Conta excluída", description: "Sua conta foi anonimizada e encerrada." });
      navigate("/", { replace: true });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Falha ao excluir conta", variant: "destructive" });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="rounded-xl bg-card p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="rounded-lg bg-primary/20 p-2">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Privacidade (LGPD)</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Exerça seus direitos: gerencie cookies, exporte ou exclua seus dados.
      </p>

      <div className="space-y-2">
        <Button variant="outline" className="w-full justify-start gap-2" onClick={openPreferences}>
          <Cookie className="h-4 w-4" /> Gerenciar cookies
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar meus dados
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4" /> Excluir minha conta
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua conta será encerrada e seus dados pessoais anonimizados. Histórico financeiro
              pode ser mantido por até 5 anos por exigência fiscal, em forma anonimizada.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-del" className="text-xs">
              Digite <strong>DELETAR MINHA CONTA</strong> para confirmar:
            </Label>
            <Input
              id="confirm-del"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETAR MINHA CONTA"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
