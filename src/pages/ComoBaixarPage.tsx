import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Video, Info, Laptop, Smartphone, Monitor, Usb, Tablet, CheckCircle2, FileArchive, FolderOpen, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ComoBaixarPage() {
  const { data: tutoriais, isLoading } = useQuery({
    queryKey: ["tutoriais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutoriais")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const tutorialPassos = {
    pc: [
      {
        titulo: "1. Baixar no Computador",
        instrucao: "Escolha o repertório ou músicas e clique em 'Baixar'. O arquivo será salvo na sua pasta 'Downloads'. Se baixar um repertório completo, ele virá como um arquivo compactado (.zip).",
        img: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&q=80&w=800",
      },
      {
        titulo: "2. Extrair Arquivos (ZIP)",
        instrucao: "Clique com o botão direito no arquivo .zip baixado e selecione 'Extrair Tudo...' ou 'Extrair aqui'. Isso criará uma pasta normal com todas as suas músicas prontas para uso.",
        img: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=800",
        extra: "Dica: O Windows e o Mac já fazem isso nativamente, não precisa instalar programas extras."
      },
      {
        titulo: "3. Conectar e Transferir",
        instrucao: "Insira o pendrive. Abra a pasta extraída, selecione as músicas e arraste-as para a unidade do pendrive no Explorador de Arquivos.",
        img: "https://images.unsplash.com/photo-1622534517331-89315570220a?auto=format&fit=crop&q=80&w=800",
      }
    ],
    android: [
      {
        titulo: "1. Baixar no Android",
        instrucao: "Clique no botão de download. Acompanhe a barra de notificações. O arquivo (geralmente .zip) estará na pasta 'Downloads'.",
        img: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbab?auto=format&fit=crop&q=80&w=800",
      },
      {
        titulo: "2. Extrair no Celular",
        instrucao: "Abra o app 'Files' (do Google) ou 'Meus Arquivos' (Samsung). Toque no arquivo .zip e escolha 'Extrair'. O celular criará uma pasta com as músicas.",
        img: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=800",
        extra: "Se o seu celular for antigo, você pode precisar do app 'ZArchiver' da Play Store."
      },
      {
        titulo: "3. Mover para o Pendrive (OTG)",
        instrucao: "Conecte o pendrive via adaptador OTG. No gerenciador de arquivos, selecione a pasta extraída e use a opção 'Mover' para o 'Armazenamento USB'.",
        img: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=800",
      }
    ],
    ios: [
      {
        titulo: "1. Baixar no iPhone/iPad",
        instrucao: "Toque em baixar e confirme no Safari. O download fica salvo no iCloud Drive ou 'No Meu iPhone', dentro da pasta Downloads.",
        img: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&q=80&w=800",
      },
      {
        titulo: "2. Extrair no App Arquivos",
        instrucao: "Abra o app 'Arquivos' (Files). Localize o arquivo .zip. Basta dar UM TOQUE sobre ele e o iOS criará automaticamente uma pasta com o conteúdo extraído.",
        img: "https://images.unsplash.com/photo-1523206489230-c012cdd4cc2a?auto=format&fit=crop&q=80&w=800",
        extra: "Prático: O iPhone já extrai arquivos ZIP nativamente desde o iOS 13."
      },
      {
        titulo: "3. Transferir via Adaptador",
        instrucao: "Conecte o pendrive com o adaptador apropriado. No app Arquivos, selecione a pasta das músicas, toque em 'Mover' e selecione o seu pendrive na lista de locais.",
        img: "https://images.unsplash.com/photo-1556656793-062ff98782ee?auto=format&fit=crop&q=80&w=800",
      }
    ]
  };

  const SkeletonPlaceholder = () => (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <Card key={i} className="overflow-hidden border-border/50">
          <CardHeader>
            <div className="h-7 w-1/3 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video w-full rounded-lg bg-muted animate-pulse" />
            <div className="h-20 w-full bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Download className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Como Baixar</h1>
          <p className="text-muted-foreground">Tutorial completo para baixar e transferir suas músicas</p>
        </div>
      </div>

      <Tabs defaultValue="escrito" className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
          <TabsTrigger value="escrito" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Passo a Passo
          </TabsTrigger>
          <TabsTrigger value="tutoriais" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Vídeo Aulas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tutoriais">
          {isLoading ? (
            <SkeletonPlaceholder />
          ) : tutoriais && tutoriais.length > 0 ? (
            <div className="grid gap-8">
              {tutoriais.map((tutorial) => (
                <Card key={tutorial.id} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Video className="h-5 w-5 text-primary" />
                      {tutorial.titulo}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {tutorial.video_url && (
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted group border border-border/50">
                        {getYoutubeId(tutorial.video_url) ? (
                          <iframe
                            className="absolute inset-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${getYoutubeId(tutorial.video_url)}`}
                            title={tutorial.titulo}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                            <Video className="h-10 w-10 opacity-20" />
                            <a 
                              href={tutorial.video_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline font-medium"
                            >
                              Assistir vídeo externo
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {tutorial.conteudo && (
                      <div className="prose prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded-lg">
                        {tutorial.conteudo}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 py-12 bg-transparent">
              <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-muted/50 rounded-full">
                  <Video className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-medium">Nenhum vídeo tutorial encontrado</p>
                  <p className="text-muted-foreground">Aguarde, em breve novos vídeos serão adicionados.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="escrito" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 flex flex-col items-center text-center space-y-2">
                <Download className="h-8 w-8 text-primary" />
                <h3 className="font-bold">1. Baixar</h3>
                <p className="text-xs text-muted-foreground">Baixe as músicas ou o ZIP do repertório</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 flex flex-col items-center text-center space-y-2">
                <FileArchive className="h-8 w-8 text-primary" />
                <h3 className="font-bold">2. Extrair</h3>
                <p className="text-xs text-muted-foreground">Sempre extraia os arquivos .zip antes de usar</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 flex flex-col items-center text-center space-y-2">
                <Usb className="h-8 w-8 text-primary" />
                <h3 className="font-bold">3. Transferir</h3>
                <p className="text-xs text-muted-foreground">Mova a pasta para o seu pendrive</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                Guia Passo a Passo por Dispositivo
              </CardTitle>
              <CardDescription>
                Siga as etapas abaixo para garantir que suas músicas toquem perfeitamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pc" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 bg-muted/30">
                  <TabsTrigger value="pc" className="flex items-center gap-2">
                    <Laptop className="h-4 w-4" />
                    PC / Notebook
                  </TabsTrigger>
                  <TabsTrigger value="android" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Android
                  </TabsTrigger>
                  <TabsTrigger value="ios" className="flex items-center gap-2">
                    <Tablet className="h-4 w-4" />
                    iPhone / iPad
                  </TabsTrigger>
                </TabsList>

                {(Object.entries(tutorialPassos) as [keyof typeof tutorialPassos, any[]][]).map(([key, passos]) => (
                  <TabsContent key={key} value={key} className="space-y-6 mt-4">
                    <Accordion type="single" collapsible defaultValue="passo-0" className="w-full">
                      {passos.map((passo, index) => (
                        <AccordionItem key={index} value={`passo-${index}`} className="border-border/50">
                          <AccordionTrigger className="hover:no-underline hover:bg-muted/30 px-4 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                                {index + 1}
                              </span>
                              <span className="text-base font-semibold">{passo.titulo}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4 px-4 pb-6">
                            <div className="grid md:grid-cols-2 gap-6 items-center">
                              <div className="space-y-4">
                                <p className="text-muted-foreground text-lg leading-relaxed">
                                  {passo.instrucao}
                                </p>
                                {passo.extra && (
                                  <div className="flex items-start gap-2 text-sm text-amber-500/90 bg-amber-500/5 p-3 rounded-md border border-amber-500/10">
                                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>{passo.extra}</span>
                                  </div>
                                )}
                                <div className="flex items-start gap-2 text-sm text-primary/80 bg-primary/5 p-3 rounded-md border border-primary/10">
                                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                                  <span>Concluído este passo? Siga para o próximo.</span>
                                </div>
                              </div>
                              <div className="relative aspect-video rounded-xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/5">
                                <img 
                                  src={passo.img} 
                                  alt={passo.titulo}
                                  className="object-cover w-full h-full transition-transform duration-500 hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className="p-3 bg-primary/10 rounded-full">
              <Monitor className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-lg">Ainda com dúvidas?</h4>
              <p className="text-muted-foreground">Assista aos vídeos na segunda aba ou entre em contato com nosso suporte.</p>
            </div>
            <a 
              href="https://wa.me/5500000000000" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              Suporte WhatsApp
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}