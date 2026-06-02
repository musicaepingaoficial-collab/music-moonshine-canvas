# Análise: o PWA está notificando vendas ao admin?

## Resposta curta

**Sim, a arquitetura está implementada e funcional**, mas com **3 pontos frágeis** que podem fazer notificações deixarem de chegar em produção sem você perceber. Hoje há **2 inscrições push de admin ativas no banco**, **2 admins** e **0 linhas em `admin_notification_prefs`** (o que é OK — o código assume `true` por padrão).

Não foi possível confirmar entregas reais porque **não há nenhum log recente** da função `send-admin-push` nem do `payment-webhook` no Supabase — ou nenhuma venda passou pelo webhook recentemente, ou a retenção de logs já expirou.

---

## O que JÁ funciona (verificado no código)

### 1. Service Worker (`src/sw.ts`)
- Listener `push` → mostra `Notification` com título, body, ícone, tag e url.
- Listener `notificationclick` → foca aba existente ou abre nova em `payload.url`.
- Funciona em background (PWA instalado fechado, celular bloqueado).

### 2. Inscrição (`src/pages/admin/AdminNotificacoesPage.tsx` + `src/lib/webpush.ts`)
- Admin habilita push → cria `PushSubscription` com VAPID e grava em `admin_push_subscriptions`.
- Toggles individuais `notify_purchase` e `notify_pix_generated` salvos em `admin_notification_prefs`.
- Botão "Enviar teste" chama `send-admin-push` com `type: "test"`.

### 3. Envio (`supabase/functions/send-admin-push/index.ts`)
- Busca todos os admins (`user_roles.role='admin'`).
- Filtra pelas prefs do tipo (default `true` quando não há linha).
- Lê inscrições e dispara com `web-push` + VAPID.
- Remove inscrições expiradas (404/410).

### 4. Disparos em eventos de venda
Já mapeados no código:

| Evento | Arquivo | Tipo | Título |
|---|---|---|---|
| Pix de assinatura gerado | `create-payment/index.ts` | `pix_generated` | 🟢 Pix gerado |
| Pix de PDF gerado | `create-pdf-payment/index.ts` | `pix_generated` | 🧾 Pix gerado (PDF) |
| Assinatura aprovada (usuário logado) | `payment-webhook/index.ts` L435 | `purchase` | 💰 Compra aprovada |
| Assinatura aprovada (pré-cadastro/anônimo) | `payment-webhook/index.ts` L94 | `purchase` | 💰 Pagamento aprovado (pré-cadastro) |
| PDF avulso aprovado | `payment-webhook/index.ts` L176 | `purchase` | 📕 PDF vendido |
| Módulo Discografias | `payment-webhook/index.ts` L225 | `purchase` | 📀 Módulo Discografias vendido |

---

## Pontos frágeis encontrados (3)

### Problema 1 — Botão "Teste" usa `type: "test"` que não existe
Em `send-admin-push`, o `PREF_BY_TYPE` só tem `purchase` e `pix_generated`. Quando chega `type: "test"`, o `prefField` fica `undefined` e o filtro de prefs é pulado — **funciona por acaso**. Não é bug grave, mas se um dia alguém adicionar lógica que exija o tipo estar no mapa, o teste para de funcionar. **Solução:** adicionar `test: null` ou tratar explicitamente.

### Problema 2 — Notificação só é disparada em PIX e em `payment.approved`
- **Cartão recusado/pendente:** não notifica nada. O admin não fica sabendo de tentativas falhas.
- **Boleto/outros métodos:** se o MP não mandar `payment.approved` no webhook, o disparo nunca acontece.
- **Reembolso/cancelamento:** sem notificação.

### Problema 3 — Falhas no `send-admin-push` são silenciosas
Todos os `fetch(...send-admin-push)` no webhook estão dentro de `try/catch` que só faz `console.error`. Se a função estiver fora do ar, com VAPID errado, ou o admin tiver bloqueado notifications, **você não tem nenhuma visibilidade**. Não há tabela de log como existe agora para `meta_capi_logs`.

Também: hoje **0 logs aparecem** no Supabase para `send-admin-push` e `payment-webhook` — pode ser só retenção, mas vale confirmar com uma venda de teste.

---

## Plano de correção (4 etapas pequenas)

### Etapa 1 — Tornar o teste robusto
- Em `send-admin-push`, aceitar `type: "test"` explicitamente sem exigir entrada em `PREF_BY_TYPE`.
- Adicionar `console.log` de início/fim com contadores (`adminIds.length`, `allowedAdmins.length`, `subs.length`, `sent`, `removed`) para diagnóstico futuro nos logs.

### Etapa 2 — Cobertura de eventos de venda
- Notificar também quando `payment.status === "rejected"` no webhook (título "❌ Pagamento recusado").
- Notificar reembolso (`refunded`/`charged_back`) com tipo novo `purchase_refunded` (adicionar pref correspondente).
- Garantir que toda criação de cobrança (não só PIX) gere `pix_generated` ou um `checkout_started` novo, para você ver intenção de compra mesmo no cartão.

### Etapa 3 — Auditoria de envio
- Criar tabela `admin_push_logs` (event_name, type, sent, removed, total_subs, error, created_at) com RLS admin-only.
- Em `send-admin-push`, inserir 1 linha por chamada com o resultado.
- Adicionar visualização simples no `AdminNotificacoesPage` ("Últimos 20 envios") para o admin auditar.

### Etapa 4 — Health-check + UI
- Card no painel mostrando: nº de admins inscritos, quantos com push ligado, último envio bem-sucedido, último erro.
- Botão "Verificar saúde" que dispara teste e checa retorno `sent > 0`.
- Aviso visível quando `Notification.permission === "denied"` no dispositivo.

---

## Detalhes técnicos

**Banco hoje:**
- `admin_push_subscriptions`: 2 linhas
- `admin_notification_prefs`: 0 linhas (defaults aplicados)
- `user_roles` admin: 2

**Migration nova (Etapa 3):**
```sql
CREATE TABLE public.admin_push_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  title text,
  total_subs int,
  sent int,
  removed int,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_push_logs TO authenticated;
GRANT ALL ON public.admin_push_logs TO service_role;
ALTER TABLE public.admin_push_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read push logs" ON public.admin_push_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE INDEX ON public.admin_push_logs (created_at DESC);
```

**Não vou tocar em:**
- `src/sw.ts` (já está correto)
- Lógica de pagamento (só adicionar disparos extras)
- VAPID / inscrição (já funciona)

---

## Como confirmar agora, sem código novo

1. Painel Admin → **Notificações Admin** → "Enviar teste". Deve chegar push em < 5s.
2. Se chegar: o pipeline está vivo, basta aplicar Etapa 2+3 para cobertura e visibilidade.
3. Se NÃO chegar: abrir DevTools → Application → Service Workers; e Supabase → logs de `send-admin-push` para ver o erro real.

Quer que eu execute as 4 etapas, ou prefere começar só pela Etapa 1+3 (teste robusto + auditoria) que dá visibilidade imediata sem mudar fluxo de venda?
