import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpeg";

export default function TermsPage() {
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
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

        <div className="prose prose-invert max-w-none space-y-6 text-sm sm:text-base leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">1. Aceitação</h2>
            <p>
              Ao criar uma conta, contratar um plano ou utilizar a plataforma <strong>Repertório Música e Pinga</strong>,
              você declara ter lido, compreendido e concordado integralmente com estes Termos de Uso e com nossa
              Política de Privacidade. Caso não concorde, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">2. Descrição do serviço</h2>
            <p>
              Oferecemos acesso, mediante assinatura, a um acervo digital de músicas em MP3 organizado em playlists
              por gênero, com recursos de busca, favoritos, repertórios pessoais e download. O conteúdo é destinado
              exclusivamente para uso pessoal e profissional do assinante (DJs, animadores, eventos), respeitada a
              legislação de direitos autorais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">3. Cadastro e conta</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>O usuário deve ser maior de 18 anos ou ter autorização do responsável legal.</li>
              <li>Os dados informados devem ser verdadeiros, completos e atualizados.</li>
              <li>A conta é pessoal e intransferível. O compartilhamento de login e senha é proibido.</li>
              <li>O usuário é responsável por toda atividade realizada com sua conta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">4. Planos, pagamento e renovação</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Os planos disponíveis (mensal, semestral, anual e vitalício) e seus preços estão descritos na página de planos.</li>
              <li>O pagamento é processado pelo Mercado Pago, via cartão ou Pix.</li>
              <li>Após a confirmação do pagamento, o acesso é liberado imediatamente.</li>
              <li>Planos recorrentes podem ser cancelados a qualquer momento e o acesso permanece ativo até o fim do período pago.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">5. Garantia de 7 dias</h2>
            <p>
              Você tem <strong>7 (sete) dias</strong>, contados da confirmação do pagamento, para solicitar o
              reembolso integral, sem necessidade de justificativa, conforme o art. 49 do Código de Defesa do
              Consumidor. Após esse prazo, não haverá devolução proporcional do valor pago.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">6. Uso permitido e proibido</h2>
            <p>É <strong>permitido</strong>:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Baixar músicas para uso pessoal e profissional em apresentações.</li>
              <li>Criar repertórios e playlists para sua organização.</li>
            </ul>
            <p>É <strong>proibido</strong>:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Revender, distribuir, sublicenciar ou compartilhar publicamente o conteúdo da plataforma.</li>
              <li>Compartilhar a conta com terceiros.</li>
              <li>Usar robôs, scripts ou meios automatizados para baixar o acervo em massa.</li>
              <li>Realizar engenharia reversa, copiar ou tentar burlar mecanismos de segurança.</li>
              <li>Utilizar o conteúdo para fins ilícitos.</li>
            </ul>
            <p>O descumprimento pode levar ao bloqueio imediato da conta, sem reembolso.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">7. Direitos autorais</h2>
            <p>
              As músicas pertencem aos seus respectivos titulares. A plataforma fornece o acesso ao acervo apenas como
              ferramenta de organização e reprodução; o usuário é responsável por obter as autorizações necessárias
              (ECAD e demais entidades) quando o uso público das músicas em eventos exigir tais licenças.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">8. Disponibilidade e manutenção</h2>
            <p>
              Empenhamo-nos em manter a plataforma online 24/7, mas eventuais interrupções para manutenção,
              atualizações ou por causas externas (provedores, falhas de internet) podem ocorrer e não geram direito
              a reembolso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">9. Limitação de responsabilidade</h2>
            <p>
              Não nos responsabilizamos por danos indiretos, lucros cessantes ou pelo uso inadequado do conteúdo pelo
              assinante. Nossa responsabilidade total é limitada ao valor pago pelo plano vigente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">10. Encerramento</h2>
            <p>
              Você pode encerrar sua conta a qualquer momento. Reservamo-nos o direito de suspender ou encerrar
              contas que violem estes termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">11. Alterações dos termos</h2>
            <p>
              Podemos atualizar estes Termos a qualquer momento. Mudanças relevantes serão comunicadas pelo e-mail
              cadastrado ou no painel. O uso contínuo após a alteração implica aceitação das novas condições.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">12. Foro</h2>
            <p>
              Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de domicílio do
              consumidor para dirimir quaisquer controvérsias.
            </p>
          </section>
        </div>

        <div className="mt-12 flex gap-3">
          <Link to="/privacidade">
            <Button variant="outline">Ver Política de Privacidade</Button>
          </Link>
          <Link to="/">
            <Button>Voltar para o início</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
