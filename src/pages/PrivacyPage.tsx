import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpeg";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Repertório Música e Pinga" className="h-9 w-9 rounded-lg object-cover" />
            <span className="font-semibold text-sm sm:text-base">Repertório Música e Pinga</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

        <div className="prose prose-invert max-w-none space-y-6 text-sm sm:text-base leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">1. Quem somos</h2>
            <p>
              O <strong>Repertório Música e Pinga</strong> é uma plataforma digital que oferece acesso a um acervo
              de músicas em formato MP3, organizadas por gênero e estilo, mediante assinatura. Esta política descreve
              como coletamos, utilizamos e protegemos suas informações pessoais, em conformidade com a LGPD
              (Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">2. Dados que coletamos</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dados de cadastro:</strong> nome completo, e-mail, WhatsApp, CPF e senha.</li>
              <li><strong>Dados de pagamento:</strong> processados de forma segura pelo Mercado Pago — não armazenamos dados completos do cartão.</li>
              <li><strong>Dados de uso:</strong> histórico de downloads, favoritos, repertórios criados e acessos.</li>
              <li><strong>Dados técnicos:</strong> endereço IP, navegador, sistema operacional e cookies.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">3. Como utilizamos seus dados</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Criar e manter sua conta de acesso à plataforma.</li>
              <li>Processar pagamentos e ativar sua assinatura.</li>
              <li>Enviar comunicações sobre sua conta, atualizações e suporte.</li>
              <li>Personalizar sua experiência (favoritos, repertórios, recomendações).</li>
              <li>Cumprir obrigações legais e fiscais.</li>
              <li>Prevenir fraudes e garantir a segurança da plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">4. Compartilhamento de dados</h2>
            <p>Compartilhamos dados apenas com:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Mercado Pago</strong> — para processamento de pagamentos.</li>
              <li><strong>Supabase</strong> — para hospedagem do banco de dados e autenticação.</li>
              <li><strong>Google Drive</strong> — para armazenamento dos arquivos de áudio.</li>
              <li>Autoridades públicas, quando exigido por lei.</li>
            </ul>
            <p>Não vendemos seus dados a terceiros.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">5. Cookies e tecnologias de rastreamento</h2>
            <p>
              Utilizamos cookies essenciais para o funcionamento da plataforma (sessão, preferências) e cookies de
              análise/marketing (Google Analytics, Meta Pixel, TikTok Pixel) para entender o uso e melhorar nossos
              serviços. Você pode gerenciar cookies pelo banner exibido na primeira visita ou pelas configurações do
              seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">6. Seus direitos (LGPD)</h2>
            <p>Você pode, a qualquer momento:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Confirmar a existência de tratamento dos seus dados.</li>
              <li>Acessar e corrigir seus dados.</li>
              <li>Solicitar a anonimização ou exclusão dos dados.</li>
              <li>Solicitar a portabilidade dos dados.</li>
              <li>Revogar o consentimento.</li>
            </ul>
            <p>
              Para exercer esses direitos, entre em contato pelo WhatsApp ou pelo e-mail informado em nosso site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">7. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito
              (HTTPS), controles de acesso e armazenamento em provedores certificados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">8. Retenção</h2>
            <p>
              Mantemos seus dados pelo tempo necessário para prestar o serviço e cumprir obrigações legais. Após o
              encerramento da conta, dados financeiros podem ser mantidos por até 5 anos por exigência fiscal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">9. Alterações</h2>
            <p>
              Podemos atualizar esta política periodicamente. A versão mais recente estará sempre disponível nesta
              página, com a data de atualização no topo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">10. Contato</h2>
            <p>
              Dúvidas sobre privacidade? Entre em contato pelo WhatsApp disponível na plataforma ou pelo e-mail
              cadastrado no rodapé do site.
            </p>
          </section>
        </div>

        <div className="mt-12 flex gap-3">
          <Link to="/termos">
            <Button variant="outline">Ver Termos de Uso</Button>
          </Link>
          <Link to="/">
            <Button>Voltar para o início</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
