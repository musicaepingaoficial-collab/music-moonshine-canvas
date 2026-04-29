## Visão geral

Adicionar uma nova seção "PDFs" ao app, onde o super admin cadastra arquivos com capa, e cada PDF pode ser:
- **Pago avulso** — usuário compra individualmente via PIX (Mercado Pago, fluxo atual)
- **Bônus** — liberado automaticamente para quem tem assinatura ativa

O painel principal mostra todos os PDFs disponíveis; o usuário vê "Baixar" se já tem acesso, "Comprar" se for pago avulso, ou "Disponível para assinantes" caso contrário.

---

## Banco de dados (migration)

### Tabela `pdfs`
Campos de domínio:
- `title`, `description`, `author`
- `cover_url` (URL da capa no Storage)
- `file_path` (caminho do PDF no bucket privado)
- `file_size`
- `access_type` — enum `'paid' | 'subscriber_bonus'`
- `price` (numeric, usado quando `access_type='paid'`)
- `active` (bool, controla visibilidade no painel)
- `created_at`

### Tabela `pdf_purchases`
Registra cada compra avulsa aprovada:
- `user_id`, `pdf_id`
- `amount`, `payment_id` (id do Mercado Pago)
- `status` (`'pending' | 'approved'`)
- `created_at`
- Único: `(user_id, pdf_id)` quando `status='approved'`

### RLS
- `pdfs`: leitura para qualquer autenticado quando `active=true`; admin gerencia tudo.
- `pdf_purchases`: usuário lê só as próprias; admin lê todas; insert pelo edge function (service role).

### Storage
- Bucket **público** `pdf-covers` (capas).
- Bucket **privado** `pdfs` (arquivos). Download só via signed URL gerada pelo edge function após validar acesso.

---

## Função de checagem de acesso

Função SQL `has_pdf_access(_user_id uuid, _pdf_id uuid) returns boolean` (security definer):
- `true` se PDF é `subscriber_bonus` E usuário tem assinatura ativa em `assinaturas`
- `true` se PDF é `paid` E existe `pdf_purchases` com `status='approved'` para esse usuário
- Admin sempre `true`

---

## Edge Functions

### `create-pdf-payment` (nova)
- Recebe `pdf_id`, dados do pagador (CPF, email)
- Busca o PDF, valida que é `paid`
- Cria pagamento PIX no Mercado Pago com `external_reference = "pdf:<userId>:<pdfId>"`
- Insere `pdf_purchases` com `status='pending'`
- Retorna QR code PIX

### `payment-webhook` (atualizar)
- Detectar prefixo `pdf:` no `external_reference`
- Se for compra de PDF: marcar `pdf_purchases` como `approved` e disparar notificação push admin (reaproveita `send-admin-push` com tipo `purchase`)
- Caso contrário, segue o fluxo atual de assinaturas

### `pdf-download` (nova)
- Recebe `pdf_id`
- Valida JWT do usuário
- Chama `has_pdf_access`
- Se autorizado, gera signed URL temporária (60s) do bucket privado `pdfs` e devolve

---

## Frontend

### Admin (`/admin/pdfs`)
Nova entrada no `AdminSidebar`. Página com:
- Lista de PDFs com capa, título, tipo de acesso, preço, ativo
- Botão "Adicionar PDF" abre dialog:
  - Upload da capa (bucket `pdf-covers`)
  - Upload do arquivo PDF (bucket `pdfs`)
  - Título, descrição, autor
  - Radio: "Pago avulso" (mostra campo de preço) ou "Bônus para assinantes"
  - Toggle ativo
- Editar/excluir PDF existente (apaga arquivos do storage também)

### Usuário — painel principal
- Novo card "PDFs" no `DashboardPage` (e nova rota `/pdfs` com a lista completa)
- Cada PDF mostra: capa, título, autor, preço/badge
  - Badge "Bônus" para assinantes que têm acesso
  - Badge "Comprado" se já pagou
  - Botão "Baixar" se tem acesso → chama `pdf-download` e abre o signed URL
  - Botão "Comprar R$ X" se for `paid` sem acesso → abre modal de checkout PIX (reaproveita o componente atual de pagamento)
  - Mensagem "Exclusivo para assinantes" + CTA "Ver planos" se for `subscriber_bonus` sem assinatura

### Componentes a reutilizar
- Modal/fluxo PIX já usado em `/ofertas` (assinaturas) → generalizar para aceitar tipo de produto

---

## Detalhes técnicos

```text
Compra avulsa de PDF:
  Cliente → create-pdf-payment → Mercado Pago (PIX)
                                    ↓ webhook
                              payment-webhook
                                    ↓
                           pdf_purchases.status = approved
                                    ↓
                              send-admin-push

Download:
  Cliente → pdf-download → has_pdf_access?
                              ↓ sim
                         signed URL (60s)
                              ↓
                       cliente baixa direto do Storage
```

- `external_reference` ganha prefixo (`plan:` para assinaturas, `pdf:` para PDFs) para o webhook diferenciar — exige pequena adaptação na função atual de assinaturas para emitir esse prefixo também.
- O bucket de PDFs é privado: nenhum link direto é exposto ao cliente.
- `pdf-download` aplica rate-limit simples por user_id (último download há menos de 2s = 429) para evitar abuso.

---

## Etapas de implementação

1. Migration: tipos, tabelas `pdfs` e `pdf_purchases`, RLS, função `has_pdf_access`, buckets de storage com policies.
2. Atualizar `payment-webhook` para distinguir `plan:` vs `pdf:`.
3. Criar edge functions `create-pdf-payment` e `pdf-download`.
4. Página admin `/admin/pdfs` com upload e CRUD.
5. Página de usuário `/pdfs` + card no Dashboard.
6. Componente de checkout PIX genérico reutilizado para PDFs.
7. Notificação push admin em compra aprovada de PDF.
