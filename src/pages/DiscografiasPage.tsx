import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Disc, ExternalLink, Search, Lock, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasActiveSubscription } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { CheckoutForm } from "@/components/subscription/CheckoutForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface DiscografiaLink {
  label: string;
  url: string;
}

interface Discografia {
  id: string;
  artista_nome: string;
  imagem_url: string | null;
  links: any;
  ordem: number;
}

export default function DiscografiasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { hasDiscografiasAccess, isLoading: accessLoading, user } = useHasActiveSubscription();
  const { data: settings } = useSiteSettings();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handlePaymentSuccess = () => {
    toast.success("Pagamento confirmado! Módulo liberado.");
    setIsCheckoutOpen(false);
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    window.location.reload();
  };

  const { data: discografias, isLoading } = useQuery({
    queryKey: ["discografias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discografias")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as Discografia[];
    },
    enabled: hasDiscografiasAccess === true, // Only fetch if user has access
  });

  const filteredDiscografias = discografias?.filter(disco => 
    disco.artista_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!accessLoading && hasDiscografiasAccess === false) {
    return (
      <div className="container mx-auto py-20 px-4 max-w-2xl text-center">
        <div className="bg-card border border-border/50 rounded-3xl p-8 md:p-12 shadow-xl backdrop-blur-sm">
          <div className="bg-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Módulo Bloqueado</h1>
          <p className="text-muted-foreground text-lg mb-8">
            As discografias completas estão disponíveis exclusivamente para usuários com plano 
            <span className="font-bold text-foreground"> Vitalício</span> ou que adquiriram o módulo separadamente.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/ofertas")}>
              Ver Planos Vitalícios
            </Button>
            <Button 
              variant="default" 
              className="bg-green-600 hover:bg-green-700 text-white"
              size="lg" 
              onClick={() => setIsCheckoutOpen(true)}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {settings?.discografias_valor && settings.discografias_valor > 0 
                ? `Comprar por R$ ${settings.discografias_valor.toFixed(2).replace('.', ',')}`
                : "Adquirir Módulo"}
            </Button>
          </div>
        </div>

        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pagamento do Módulo</DialogTitle>
              <DialogDescription>
                Conclua o pagamento de R$ {settings?.discografias_valor?.toFixed(2).replace('.', ',')} para liberar o acesso vitalício às discografias.
              </DialogDescription>
            </DialogHeader>
            <CheckoutForm 
              planSlug="discografias"
              planName="Módulo Discografias"
              planPrice={settings?.discografias_valor || 0}
              onBack={() => setIsCheckoutOpen(false)}
              onSuccess={handlePaymentSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Disc className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Discografias</h1>
            <p className="text-muted-foreground">Baixe álbuns completos de seus artistas favoritos</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar artista..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {(isLoading || accessLoading) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden border-border/50">
              <div className="aspect-square bg-muted animate-pulse" />
              <CardHeader>
                <Skeleton className="h-6 w-2/3" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDiscografias && filteredDiscografias.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDiscografias.map((disco) => (
            <Card key={disco.id} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm group hover:border-primary/50 transition-all duration-300">
              <div className="aspect-square relative overflow-hidden bg-muted">
                {disco.imagem_url ? (
                  <img 
                    src={disco.imagem_url} 
                    alt={disco.artista_nome}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Disc className="h-20 w-20 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-bold text-white truncate">{disco.artista_nome}</h3>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Download className="h-4 w-4" /> Links Disponíveis
                </p>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                  {(disco.links as DiscografiaLink[])?.length > 0 ? (
                    (disco.links as DiscografiaLink[]).map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors text-sm font-medium"
                      >
                        <span className="truncate">{link.label}</span>
                        <ExternalLink className="h-4 w-4 shrink-0" />
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhum link cadastrado.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-card/30 rounded-2xl border-2 border-dashed">
          <div className="p-4 bg-muted rounded-full">
            <Disc className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-medium">Nenhuma discografia encontrada</p>
            <p className="text-muted-foreground">Tente buscar por outro termo ou aguarde novos cadastros.</p>
          </div>
        </div>
      )}
    </div>
  );
}