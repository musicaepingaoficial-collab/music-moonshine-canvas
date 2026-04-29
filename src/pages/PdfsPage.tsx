import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Download, Loader2, Lock, Sparkles, ShoppingCart, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePdfs, useMyPdfPurchases, useActiveSubscription, type Pdf } from "@/hooks/usePdfs";
import { useAuth } from "@/hooks/useUser";

export default function PdfsPage() {
  const { user } = useAuth();
  const { data: pdfs, isLoading } = usePdfs();
  const { data: purchased } = useMyPdfPurchases();
  const { data: hasSub } = useActiveSubscription();
  const qc = useQueryClient();

  const [downloading, setDownloading] = useState<string | null>(null);
  const [buyPdf, setBuyPdf] = useState<Pdf | null>(null);
  const [payerName, setPayerName] = useState("");
  const [payerCpf, setPayerCpf] = useState("");
  const [paying, setPaying] = useState(false);
  const [pix, setPix] = useState<{ qr: string; code: string; payment_id: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const hasAccess = (p: Pdf) =>
    (p.access_type === "subscriber_bonus" && hasSub) ||
    (p.access_type === "paid" && purchased?.has(p.id));

  const handleDownload = async (p: Pdf) => {
    setDownloading(p.id);
    try {
      const { data, error } = await supabase.functions.invoke("pdf-download", { body: { pdf_id: p.id } });
      if (error) throw error;
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Falha ao baixar");
    } finally {
      setDownloading(null);
    }
  };

  const startPurchase = (p: Pdf) => {
    setBuyPdf(p);
    setPix(null);
    setPayerName("");
    setPayerCpf("");
  };

  const handlePay = async () => {
    if (!buyPdf) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pdf-payment", {
        body: {
          pdf_id: buyPdf.id,
          payer: {
            email: user?.email,
            full_name: payerName,
            identification: { type: "CPF", number: payerCpf },
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPix({ qr: data.qr_code_base64, code: data.qr_code, payment_id: String(data.payment_id) });
      // poll status a cada 4s, max 5 min
      const start = Date.now();
      const iv = setInterval(async () => {
        if (Date.now() - start > 5 * 60 * 1000) {
          clearInterval(iv);
          return;
        }
        const { data: rows } = await supabase
          .from("pdf_purchases")
          .select("status")
          .eq("payment_id", String(data.payment_id))
          .maybeSingle();
        if (rows?.status === "approved") {
          clearInterval(iv);
          toast.success("Pagamento aprovado!");
          qc.invalidateQueries({ queryKey: ["pdf-purchases"] });
          setBuyPdf(null);
          setPix(null);
        }
      }, 4000);
    } catch (e: any) {
      toast.error(e.message || "Erro no pagamento");
    } finally {
      setPaying(false);
    }
  };

  const copyCode = async () => {
    if (!pix?.code) return;
    await navigator.clipboard.writeText(pix.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">PDFs</h1>
        <p className="text-sm text-muted-foreground">Materiais exclusivos para download</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !pdfs?.length ? (
        <Card className="p-10 text-center text-muted-foreground">Nenhum PDF disponível.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pdfs.map((p) => {
            const access = hasAccess(p);
            return (
              <Card key={p.id} className="overflow-hidden flex flex-col">
                <div className="aspect-[3/4] bg-muted relative">
                  {p.cover_url ? (
                    <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <FileText className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                  {p.access_type === "subscriber_bonus" && (
                    <Badge className="absolute top-2 left-2 bg-primary"><Sparkles className="h-3 w-3 mr-1" />Bônus</Badge>
                  )}
                  {access && p.access_type === "paid" && (
                    <Badge className="absolute top-2 left-2 bg-green-600"><Check className="h-3 w-3 mr-1" />Comprado</Badge>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <h3 className="font-semibold line-clamp-1">{p.title}</h3>
                  {p.author && <p className="text-xs text-muted-foreground">{p.author}</p>}
                  <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{p.description}</p>
                  <div className="pt-2">
                    {access ? (
                      <Button size="sm" className="w-full" disabled={downloading === p.id} onClick={() => handleDownload(p)}>
                        {downloading === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                        Baixar
                      </Button>
                    ) : p.access_type === "paid" ? (
                      <Button size="sm" className="w-full" onClick={() => startPurchase(p)}>
                        <ShoppingCart className="h-4 w-4 mr-1" /> Comprar R$ {Number(p.price).toFixed(2)}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full" asChild>
                        <Link to="/ofertas"><Lock className="h-4 w-4 mr-1" /> Exclusivo assinantes</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!buyPdf} onOpenChange={(v) => { if (!v) { setBuyPdf(null); setPix(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Comprar: {buyPdf?.title}</DialogTitle>
          </DialogHeader>
          {!pix ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><strong>R$ {Number(buyPdf?.price ?? 0).toFixed(2)}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Forma</span><span>PIX</span></div>
              </div>
              <div>
                <Label>Nome completo</Label>
                <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Como aparece no documento" />
              </div>
              <div>
                <Label>CPF</Label>
                <Input value={payerCpf} onChange={(e) => setPayerCpf(e.target.value)} placeholder="000.000.000-00" />
              </div>
              <Button className="w-full" onClick={handlePay} disabled={paying || !payerName || !payerCpf}>
                {paying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Gerar PIX
              </Button>
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">Escaneie o QR code ou copie o código:</p>
              {pix.qr && (
                <img src={`data:image/png;base64,${pix.qr}`} alt="QR PIX" className="mx-auto w-56 h-56 border rounded" />
              )}
              <div className="flex gap-2">
                <Input readOnly value={pix.code} className="text-xs" />
                <Button size="sm" variant="outline" onClick={copyCode}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Aguardando pagamento... a página atualiza sozinha.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
