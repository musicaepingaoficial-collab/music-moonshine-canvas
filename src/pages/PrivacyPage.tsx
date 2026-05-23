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
        <p className="text-sm text-muted-foreground mb-10">
          Versão 1.1 — Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>

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
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">2. Encarregado de Proteção de Dados (DPO)</h2>
            <p>
              Para tratar de assuntos relacionados aos seus dados pessoais, entre em contato com nosso
              Encarregado pelo e-mail: <a href="mailto:privacidade@musicaepinga.com.br" className="text-primary underline">privacidade@musicaepinga.com.br</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">3. Dados que coletamos</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dados de cadastro:</strong> nome completo, e-mail, WhatsApp, CPF e senha.</li>
              <li><strong>Dados de pagamento:</strong> processados de forma segura pelo Mercado Pago — não armazenamos dados completos do cartão.</li>
              <li><strong>Dados de uso:</strong> histórico de downloads, favoritos, repertórios criados e acessos.</li>
              <li><strong>Dados técnicos:</strong> endereço IP, navegador (user-agent), sistema operacional e cookies.</li>
              <li><strong>Sessões ativas:</strong> registramos seu user-agent para limitar a uma sessão por conta e prevenir compartilhamento indevido.</li>
              <li><strong>Registros de consentimento:</strong> guardamos prova da sua aceitação de cookies, termos e política de privacidade.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">4. Como utilizamos seus dados</h2>
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
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">5. Compartilhamento de dados (subprocessadores)</h2>
            <p>Compartilhamos dados apenas com os seguintes parceiros, todos sob obrigação contratual de sigilo:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Mercado Pago</strong> — processamento de pagamentos.</li>
              <li><strong>Supabase</strong> — hospedagem do banco de dados, autenticação e armazenamento.</li>
              <li><strong>Google Drive</strong> — armazenamento dos arquivos de áudio.</li>
              <li><strong>Meta (Facebook/Instagram)</strong> — pixels de marketing e CAPI.</li>
              <li><strong>Google (Analytics e Ads)</strong> — análise de uso e remarketing.</li>
              <li><strong>TikTok</strong> — pixel de marketing.</li>
              <li><strong>Kwai</strong> — pixel de marketing.</li>
              <li>Autoridades públicas, quando exigido por lei.</li>
            </ul>
            <p>Não vendemos seus dados a terceiros.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">6. Cookies e tecnologias de rastreamento</h2>
            <p>
              Utilizamos cookies essenciais (sessão, segurança), de análise (Google Analytics) e de marketing
              (Meta Pixel, TikTok Pixel, Kwai Pixel, Google Ads). Você pode aceitar, recusar ou personalizar
              suas escolhas a qualquer momento pelo botão <strong>"Gerenciar cookies"</strong> no rodapé ou na
              Central de Privacidade dentro da sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">7. Seus direitos (LGPD)</h2>
            <p>Você pode, a qualquer momento:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Confirmar a existência de tratamento dos seus dados.</li>
              <li>Acessar e corrigir seus dados.</li>
              <li>Solicitar a anonimização ou exclusão dos dados.</li>
              <li>Solicitar a portabilidade (exportação) dos dados.</li>
              <li>Revogar o consentimento.</li>
            </ul>
            <p>
              Para exercer esses direitos use a <strong>Central de Privacidade</strong> em
              {" "}<Link to="/conta" className="text-primary underline">/conta</Link>, onde você pode gerenciar cookies,
              exportar seus dados em JSON e solicitar a exclusão da conta. Também pode entrar em contato pelo
              e-mail <a href="mailto:privacidade@musicaepinga.com.br" className="text-primary underline">privacidade@musicaepinga.com.br</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">8. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito
              (HTTPS), controles de acesso (RLS), autenticação forte e armazenamento em provedores certificados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">9. Retenção</h2>
            <p>
              Mantemos seus dados pelo tempo necessário para prestar o serviço e cumprir obrigações legais.
              Quando você exclui sua conta, seus dados pessoais são <strong>imediatamente anonimizados</strong>.
              O <strong>histórico financeiro (assinaturas e pagamentos)</strong> é mantido em formato anonimizado por
              até <strong>5 anos</strong> por exigência fiscal (art. 173 do CTN).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">10. Alterações</h2>
            <p>
              Podemos atualizar esta política periodicamente. A versão mais recente estará sempre disponível nesta
              página, com a data de atualização no topo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">11. Contato</h2>
            <p>
              Dúvidas sobre privacidade? E-mail do DPO:
              {" "}<a href="mailto:privacidade@musicaepinga.com.br" className="text-primary underline">privacidade@musicaepinga.com.br</a>.
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
