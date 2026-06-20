## Auditoria das mudanças de hoje (pré-produção)

Revi cada arquivo tocado hoje. Achei **3 bugs reais**, **2 problemas de UX** e **1 fragilidade na migration**. Lista priorizada — corrigir os "Bugs" antes do deploy; UX pode ir depois.

---

### Bug 1 — `ResetUserSubscriptionCard`: "Voltar ao teste grátis" não devolve ao demo

`src/components/admin/ResetUserSubscriptionCard.tsx` (mutation `resetToTrial`) cancela a assinatura e apaga `demo_play_log`, mas **não desloga** o usuário. Como o guard novo (`DemoOrProtectedRoute`) redireciona qualquer usuário **logado** sem assinatura para `/planos`, o alvo do reset cai em `/planos` em vez de voltar ao teste grátis (que exige sessão anônima).

**Fix:** ajustar o copy/UX do botão para refletir o comportamento real ("Cancelar e enviar para /planos") OU adicionar uma instrução clara ao admin de que o usuário precisará deslogar e reentrar pelo link `?demo=1` para voltar ao demo. Alterar a `AlertDialogDescription` para deixar isso explícito.

---

### Bug 2 — Expirado preso em /ofertas vê banner de demo confuso

Com o novo guard, um usuário **logado expirado** pode visitar `/ofertas` (rota permitida). Mas `DemoModeContext.isDemoUser` retorna `true` para "logado sem assinatura", então:
- O `DemoBanner` mostra "Modo demonstração — faltam X músicas" (errado, ele não é demo).
- O `DemoWarningDialog` pode abrir ao tocar uma música em `/ofertas` (não vai tocar nada lá, mas a flag fica setada).

**Fix:** em `src/contexts/DemoModeContext.tsx`, restringir `isDemoUser` a **apenas** usuário anônimo:

```ts
const isDemoUser =
  !!(user as any)?.is_anonymous ||
  (user as any)?.app_metadata?.demo_user === true ||
  (user as any)?.user_metadata?.demo_user === true;
// remover a condição `(!isLoadingAssinatura && !assinatura)` que classificava
// expirados como demo
```

O guard já cuida dos expirados redirecionando para `/planos`, então não precisa mais dessa classificação no contexto.

---

### Bug 3 — `DemoOrProtectedRoute` lista `/conta` como permitida, mas `/conta` está sob `ProtectedRoute`

`src/components/auth/DemoOrProtectedRoute.tsx` linha 94 inclui `/conta` em `ALLOWED`, porém `/conta` está registrada sob `<ProtectedRoute />` em `App.tsx`. O item é inerte hoje, mas se a rota mudar de guard a regra silenciosamente diverge.

**Fix:** remover `/conta` do array `ALLOWED` (ou movê-lo para `ProtectedRoute` se houver caso de uso real para expirados acessarem a conta — que aliás existe: ele precisa poder ver/cancelar). Recomendo mover a checagem para também acontecer em `ProtectedRoute` para consistência, mas pelo menos remover daqui agora.

---

### UX 1 — `SignupGateDialog`: assinatura demo permanece ativa após escolher plano

Removemos `deactivateDemo()` do `handlePick` (intencional, para não cair no /login). Mas agora, enquanto o usuário preenche o `PublicCheckoutDialog`, a sessão demo continua ativa em background e ainda conta plays via `demo_play_log`. Se o usuário fechar o checkout sem pagar, ele volta ao app já em demo e pode continuar. Isso é o comportamento desejado, **porém**: depois de pagar, o `PublicCheckoutDialog.setSession` substitui a sessão anônima — confirmar que a edge function `create-payment`/webhook está vinculando os dados ao novo `user_id` e não ao anônimo.

**Ação:** revisar `supabase/functions/create-payment/index.ts` para garantir que ao receber `payment_method: card` (aprovação instantânea) o `user_id` da nova `assinatura` é o da conta real recém-criada, não o do anônimo. Não exige mudança se já está correto — só validar.

---

### UX 2 — `DemoWarningDialog` pode disparar fora do contexto de "ouvindo"

O dialog dispara assim que `playsUsed >= 3` no efeito, independente do que o usuário está fazendo (ele pode ter fechado o player, estar navegando categorias). Isso é normalmente aceitável, mas em mobile com modal em cima de modal pode ficar estranho. Recomendo manter (já tem `sessionStorage` para não repetir) e monitorar.

---

### Migration — `20260620133334_*.sql` está incompleta

O arquivo gerado contém **apenas** uma `CREATE POLICY` em `public.demo_play_log` (admin manage). Não há `CREATE TABLE` nem `GRANT`, e a tabela `demo_play_log` já existia antes. Não viola a regra de GRANTs (não cria tabela), mas é uma policy órfã — verificar se as RLS antigas continuam intactas. Risco baixo, mas como vai para produção:

**Ação:** rodar `supabase--read_query` para listar policies atuais de `demo_play_log` e confirmar que (a) a nova policy foi de fato adicionada e (b) as duas policies originais (`Users can read/update own demo log`) continuam ativas, senão o usuário demo deixa de gravar plays.

---

### Checklist final antes do deploy

1. Fix Bug 1: editar copy do `resetToTrial`.
2. Fix Bug 2: remover `!assinatura` da definição de `isDemoUser` em `DemoModeContext`.
3. Fix Bug 3: remover `/conta` de `ALLOWED` no `DemoOrProtectedRoute`.
4. Validar UX 1 inspecionando `create-payment` edge function.
5. Validar migration via `SELECT polname FROM pg_policy WHERE polrelid = 'public.demo_play_log'::regclass`.
6. Smoke test manual:
   - Login normal com sub ativa → entra em `/dashboard`.
   - Admin cancela essa sub → próxima troca de aba do user → cai em `/planos`.
   - Usuário anônimo (`?demo=1`) → 3 plays dispara `DemoWarningDialog` uma vez; 5 plays dispara `SignupGateDialog`.
   - Clicar plano no gate → checkout abre; fechar mantém na mesma tela em demo (não vai pro /login).
   - Admin "Excluir histórico" → user é redirecionado a `/planos` na próxima ação.

## Arquivos a editar (se aprovado)

- `src/components/admin/ResetUserSubscriptionCard.tsx` — texto do dialog.
- `src/contexts/DemoModeContext.tsx` — definição de `isDemoUser`.
- `src/components/auth/DemoOrProtectedRoute.tsx` — array `ALLOWED`.

## Fora do escopo desta auditoria

Não vou refatorar `create-payment` nem alterar a migration — apenas validar. Se a validação acusar problema, abro um plano separado.
