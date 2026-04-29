## Objetivo

Permitir comprar direto pela landing page: o usuário escolhe um plano, preenche **nome completo, CPF, WhatsApp, e-mail e senha** no checkout, paga (Pix ou cartão) e — após confirmação — entra automaticamente no painel.

## Fluxo desejado

```
Landing → [Comprar plano X] 
  → Modal Checkout (passo 1: dados + senha)
  → (passo 2: pagamento Pix/Cartão)
  → Pagamento confirmado
  → Login automático
  → /dashboard
```

## Mudanças

### 1. Botões de plano na LandingPage
Hoje os botões "Comprar agora" levam para `/login`. Trocar por um botão que abre um **modal de checkout público** com o plano escolhido (slug + price + name).

### 2. Novo componente `PublicCheckoutDialog`
Dialog em duas etapas:

**Etapa 1 — Dados do cadastro (sempre visível primeiro):**
- Nome completo (obrigatório, 2+ palavras)
- CPF (validado, 11 dígitos)
- WhatsApp (formato BR, mesmo formato do LoginPage)
- E-mail (validado)
- Senha (mín. 6 caracteres)
- Confirmar senha

Validação client-side com zod. Botão "Continuar para pagamento" → cria a conta via `supabase.auth.signUp` com `data: { name, whatsapp, cpf }` e `emailRedirectTo: window.location.origin`. Se o e-mail já existir, mostra erro pedindo para fazer login.

Após signUp bem-sucedido, faz **signIn imediato com email/senha** (a confirmação de e-mail no Supabase pode estar desativada; se estiver ativada, mostraremos aviso e bloquearemos — recomendamos desativar "Confirm email" no painel para o fluxo funcionar 100%).

**Etapa 2 — Pagamento:**
Reaproveitar lógica do `CheckoutForm.tsx` existente (Pix + Cartão Mercado Pago), agora com o usuário já autenticado e os dados já pré-preenchidos (nome, CPF, e-mail).

### 3. Login automático após pagamento confirmado
- **Pix**: o `CheckoutForm` já faz polling via `getSubscriptionStatus`. Quando o status retornar ativo, redirecionar para `/dashboard` (usuário já está logado da etapa 1).
- **Cartão aprovado**: mesmo redirect.
- **Pix pendente**: mostrar tela "aguardando pagamento" com QR code; o usuário fica logado, e ao confirmar é levado ao dashboard. Como fallback, polling a cada 5s no `assinaturas` por até ~10 min.

### 4. Banco de dados
Adicionar coluna `cpf TEXT` em `public.profiles` (nullable, único parcial onde não-nulo). Atualizar `handle_new_user()` para gravar `cpf` a partir de `raw_user_meta_data->>'cpf'`.

### 5. Página `/login`
Mantida para quem já é cliente (botão "Já sou cliente" na landing). Sem mudanças funcionais.

## Detalhes técnicos

- **Autenticação**: `supabase.auth.signUp({ email, password, options: { data: { name, whatsapp, cpf }, emailRedirectTo: window.location.origin } })`. Se o projeto exigir confirmação de e-mail, o usuário não conseguirá logar imediatamente — aviso na UI orientando a desativar "Confirm email" no Supabase Auth para login automático funcionar.
- **Validação de CPF**: reutilizar `isValidCpf` já existente em `CheckoutForm.tsx` (extrair para `src/lib/validators.ts`).
- **Persistência do CPF**: gravado em `profiles.cpf` via trigger `handle_new_user`, e usado no checkout do Mercado Pago (Pix exige CPF do titular).
- **Webhook**: o `payment-webhook` já ativa a assinatura quando o MP confirma. Sem mudanças.
- **Pixels de conversão**: disparar evento `complete_registration` após signUp e `purchase` após confirmação — os pixels já existem (`src/lib/pixels.ts`).

## Arquivos

**Criar**
- `src/components/subscription/PublicCheckoutDialog.tsx` — modal 2 etapas
- `src/lib/validators.ts` — `isValidCpf`, `formatCpf`, `formatWhatsApp` extraídos

**Editar**
- `src/pages/LandingPage.tsx` — substituir `<Link to="/login">` dos planos por botão que abre `PublicCheckoutDialog` com o plano escolhido
- `src/components/subscription/CheckoutForm.tsx` — pré-preencher Pix com dados do signUp; redirecionar para `/dashboard` no `onSuccess`

**Migration**
- `ALTER TABLE profiles ADD COLUMN cpf TEXT`
- Atualizar função `handle_new_user` para incluir cpf

## Importante (aviso ao usuário)

Para o **login automático após cadastro** funcionar, o Supabase precisa estar com **"Confirm email" desativado** em Authentication → Providers → Email. Caso contrário, o usuário precisará confirmar o e-mail antes de pagar. Recomendo desativar essa opção.
