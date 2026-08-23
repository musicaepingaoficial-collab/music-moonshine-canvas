# Briefing completo do sistema para agentes de IA (vendas + suporte)

Objetivo: gerar documentação de referência, dentro do próprio projeto, para alimentar dois agentes de IA externos (um de vendas de assinaturas e um de suporte ao cliente), com informação verificada do sistema real.

## O que será criado

Três arquivos markdown novos em `docs/` (nenhum código de aplicação é alterado):

1. `docs/briefing-sistema.md` — briefing mestre do produto e da plataforma.
2. `docs/agente-vendas.md` — prompt de sistema pronto para colar no agente de vendas.
3. `docs/agente-suporte.md` — prompt de sistema pronto para colar no agente de suporte.

## Conteúdo do briefing mestre

- **Identidade do produto**: Repertório Música e Pinga — painel online de repertórios/packs de músicas (MP3, com capa, organizado por estilo), streaming com player integrado, download faixa a faixa ou pack completo, PWA instalável, PDFs, discografias.
- **Público**: DJs, donos de paredão/som automotivo, produtores de evento, criadores de conteúdo.
- **Planos e preços** (fonte: tabela `planos`): Mensal R$ 34,90, Anual R$ 97,00, Trimestral R$ 54,90, Vitalício R$ 197,00, Discografias R$ 29,90. Página de vendas exibe apenas Mensal e Anual (ancoragem: "de R$ 418,80 por R$ 97"). Regras: `duration_days` define validade; vitalício sem expiração e prevalece sobre outros planos ativos.
- **Fluxo de teste grátis**: conta criada com `trial_user`, limite de 5 músicas (`demo_play_log`), aviso em 3/5 plays e gate de assinatura com os 2 planos ao esgotar.
- **Pagamento**: Mercado Pago, cobrança avulsa (não recorrente) — PIX, cartão e boleto; PIX/cartão liberam acesso na hora. Renovação é manual, com pop-ups de aviso em 7/5/3/1 dias antes do vencimento.
- **Jornada e URLs**: `/` (vendas), `/?checkout=<slug>` (checkout direto), `/login?intent=trial`, `/planos`, `/dashboard?status=success`, `/biblioteca`, `/repertorios`, `/pdfs`, `/discografias`, `/indicacoes`, `/instalar`.
- **Afiliados/indicações**: código de afiliado, rastreio de cliques, conversões e comissão por percentual.
- **FAQ oficial** (copiada da página de vendas): player antes de baixar, funciona no celular, entrega de acesso por e-mail, formas de pagamento, qualidade MP3, packs completos, garantia de 7 dias, uso em pendrive.
- **Objeções e respostas** para vendas (preço, "já pago outros sites", medo de golpe, dúvida se tem o estilo dele, garantia).
- **Base de suporte**: problemas comuns e solução — não consigo entrar / redefinir senha, pagamento aprovado sem acesso, PIX pago e não liberou, download não inicia, música parou no celular com tela bloqueada (PWA), instalar o app, trocar plano, cancelar/reembolso (7 dias), perfil incompleto (WhatsApp/CPF), limite de sessão simultânea.
- **Limites e políticas do agente**: nunca prometer conteúdo que não existe, nunca inventar preço/cupom, não pedir dados de cartão, encaminhar para humano em reembolso/problema financeiro, tom informal-profissional em PT-BR.

## Conteúdo dos prompts dos agentes

**Agente de vendas**: papel, objetivo (levar ao checkout dos 2 planos), roteiro de qualificação (o que você toca / com que frequência precisa de música nova), argumentação por perfil, ancoragem de preço, quebra de objeções, CTA com link de checkout direto, regras do que nunca dizer, e critério de handoff para suporte.

**Agente de suporte**: papel, árvore de triagem (acesso, pagamento, download, player/PWA, plano/cobrança, LGPD/dados), respostas padrão, quais dados pedir ao usuário (e-mail cadastrado, ID do pagamento), quando escalar para humano, e regras de segurança (não pedir senha, não pedir cartão).

## Detalhes técnicos

- Fatos de planos/preços vêm da tabela `planos`; textos de FAQ e provas sociais de `src/pages/LandingPage.tsx`; regras de liberação de acesso de `supabase/functions/create-payment` e `payment-webhook`; limite do teste de `DemoModeContext` + `demo_play_log`.
- Cada seção do briefing marca explicitamente o que é regra automatizada do sistema e o que depende de ação manual do admin, para o agente não prometer o que o sistema não faz.
- Nenhuma migração, função ou componente será modificado.
