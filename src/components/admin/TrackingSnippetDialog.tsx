import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useCreateSnippet,
  useUpdateSnippet,
  type TrackingSnippet,
} from "@/hooks/useTrackingSnippets";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snippet?: TrackingSnippet | null;
}

export function TrackingSnippetDialog({ open, onOpenChange, snippet }: Props) {
  const create = useCreateSnippet();
  const update = useUpdateSnippet();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [placement, setPlacement] = useState<"head" | "body_start">("head");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (open) {
      setName(snippet?.name ?? "");
      setCode(snippet?.code ?? "");
      setPlacement((snippet?.placement as "head" | "body_start") ?? "head");
      setEnabled(snippet?.enabled ?? true);
    }
  }, [open, snippet]);

  const saving = create.isPending || update.isPending;

  async function handleSave() {
    if (!name.trim() || !code.trim()) {
      toast.error("Preencha nome e código");
      return;
    }
    try {
      if (snippet) {
        await update.mutateAsync({
          id: snippet.id,
          values: { name: name.trim(), code, placement, enabled },
        });
        toast.success("Snippet atualizado");
      } else {
        await create.mutateAsync({
          name: name.trim(),
          code,
          placement,
          enabled,
          sort_order: 0,
        });
        toast.success("Snippet criado");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{snippet ? "Editar snippet" : "Novo snippet"}</DialogTitle>
          <DialogDescription>
            Cole o código fornecido pela plataforma (Utmify, RedTrack, Hyros, etc.).
            Inclua as tags <code>&lt;script&gt;</code> ou <code>&lt;noscript&gt;</code>{" "}
            completas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="snip-name">Nome (referência interna)</Label>
            <Input
              id="snip-name"
              placeholder="ex: Utmify pageview"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Posição</Label>
              <Select
                value={placement}
                onValueChange={(v) => setPlacement(v as "head" | "body_start")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="head">&lt;head&gt; (recomendado)</SelectItem>
                  <SelectItem value="body_start">Início do &lt;body&gt;</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2">
                <Switch id="snip-enabled" checked={enabled} onCheckedChange={setEnabled} />
                <Label htmlFor="snip-enabled">Ativo</Label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="snip-code">Código</Label>
            <Textarea
              id="snip-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`<script>\n  // seu código aqui\n</script>`}
              className="min-h-[220px] font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              ⚠️ Cole apenas códigos de fontes confiáveis. Eles serão executados em
              todas as páginas do site.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
