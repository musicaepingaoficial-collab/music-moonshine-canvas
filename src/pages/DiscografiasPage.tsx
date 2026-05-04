import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Disc, ExternalLink, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
  });

  const filteredDiscografias = discografias?.filter(disco => 
    disco.artista_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {isLoading ? (
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
