import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Share2, MoreVertical, Plus, Check, Smartphone, Monitor, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePWAInstall } from "@/hooks/usePWAInstall";

function Step({ n, icon, children }: { n: number; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
        {n}
      </div>
      <div className="flex-1 text-sm text-foreground/90 pt-0.5 flex items-center gap-2 flex-wrap">
        {children}
        {icon}
      </div>
    </li>
  );
}

export default function InstalarPage() {
  const { platform, installed, canPrompt, promptInstall } = usePWAInstall();
  const [tab, setTab] = useState<string>("android");

  useEffect(() => {
    if (platform === "ios") setTab("ios");
    else if (platform === "android") setTab("android");
    else if (platform === "desktop") setTab("desktop");
  }, [platform]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Link>
        </Button>

        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Instalar o app</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tenha acesso rápido direto da tela inicial, com experiência de app nativo.
        </p>

        {installed ? (
          <Card className="mt-6 p-4 flex items-center gap-3 border-primary/40 bg-primary/5">
            <Check className="h-5 w-5 text-primary" />
            <p className="text-sm">App já instalado neste dispositivo. 🎉</p>
          </Card>
        ) : canPrompt ? (
          <Card className="mt-6 p-4 flex items-center justify-between gap-3 border-primary/40 bg-primary/5">
            <div className="text-sm">
              <p className="font-semibold">Instalação rápida disponível</p>
              <p className="text-muted-foreground text-xs">Toque em instalar para abrir o prompt do navegador.</p>
            </div>
            <Button size="sm" onClick={promptInstall} className="gap-1.5">
              <Download className="h-4 w-4" /> Instalar
            </Button>
          </Card>
        ) : null}

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="ios" className="gap-1.5">
              <Apple className="h-4 w-4" /> iPhone
            </TabsTrigger>
            <TabsTrigger value="android" className="gap-1.5">
              <Smartphone className="h-4 w-4" /> Android
            </TabsTrigger>
            <TabsTrigger value="desktop" className="gap-1.5">
              <Monitor className="h-4 w-4" /> PC
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ios" className="mt-4">
            <Card className="p-5">
              <h2 className="font-semibold mb-3">No iPhone ou iPad (Safari)</h2>
              <ol className="space-y-3">
                <Step n={1}>Abra este site no <strong>Safari</strong> (não funciona no Chrome para iOS).</Step>
                <Step n={2} icon={<Share2 className="h-4 w-4 text-primary" />}>
                  Toque no ícone de <strong>Compartilhar</strong> na barra inferior.
                </Step>
                <Step n={3} icon={<Plus className="h-4 w-4 text-primary" />}>
                  Role e toque em <strong>"Adicionar à Tela de Início"</strong>.
                </Step>
                <Step n={4}>Confirme tocando em <strong>Adicionar</strong> no canto superior direito.</Step>
                <Step n={5}>Pronto! O ícone aparece na sua tela inicial.</Step>
              </ol>
            </Card>
          </TabsContent>

          <TabsContent value="android" className="mt-4">
            <Card className="p-5">
              <h2 className="font-semibold mb-3">No Android (Chrome)</h2>
              <ol className="space-y-3">
                {canPrompt ? (
                  <>
                    <Step n={1}>Toque no botão abaixo para abrir o instalador do Chrome.</Step>
                    <li className="ml-10">
                      <Button size="sm" onClick={promptInstall} className="gap-1.5">
                        <Download className="h-4 w-4" /> Instalar agora
                      </Button>
                    </li>
                    <Step n={2}>Confirme tocando em <strong>Instalar</strong>.</Step>
                  </>
                ) : (
                  <>
                    <Step n={1} icon={<MoreVertical className="h-4 w-4 text-primary" />}>
                      Toque no menu (<strong>3 pontinhos</strong>) no canto superior direito do Chrome.
                    </Step>
                    <Step n={2}>
                      Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                    </Step>
                    <Step n={3}>Confirme tocando em <strong>Instalar</strong>.</Step>
                  </>
                )}
                <Step n={canPrompt ? 3 : 4}>O ícone aparece na sua tela inicial e na gaveta de apps.</Step>
              </ol>
            </Card>
          </TabsContent>

          <TabsContent value="desktop" className="mt-4">
            <Card className="p-5">
              <h2 className="font-semibold mb-3">No computador (Chrome, Edge ou Brave)</h2>
              <ol className="space-y-3">
                {canPrompt ? (
                  <>
                    <Step n={1}>Clique no botão abaixo para instalar.</Step>
                    <li className="ml-10">
                      <Button size="sm" onClick={promptInstall} className="gap-1.5">
                        <Download className="h-4 w-4" /> Instalar agora
                      </Button>
                    </li>
                  </>
                ) : (
                  <>
                    <Step n={1}>
                      Procure o ícone de <strong>instalação</strong> (monitor com seta) na barra de endereço, à direita.
                    </Step>
                    <Step n={2}>
                      Ou abra o menu do navegador e clique em <strong>"Instalar app"</strong>.
                    </Step>
                    <Step n={3}>Confirme clicando em <strong>Instalar</strong>.</Step>
                  </>
                )}
                <Step n={canPrompt ? 2 : 4}>O app abre em janela própria e fica disponível no menu Iniciar / Launchpad.</Step>
              </ol>
              <p className="text-xs text-muted-foreground mt-4">
                Safari no Mac não suporta instalação de PWA. Use Chrome, Edge ou Brave.
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-6 p-4 bg-muted/40">
          <h3 className="text-sm font-semibold mb-1">Por que instalar?</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
            <li>Abertura rápida pelo ícone na tela inicial</li>
            <li>Notificações em tempo real</li>
            <li>Funciona em tela cheia, sem barras do navegador</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
