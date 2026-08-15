# Plano: Recuperação de Vendas via WhatsApp com QR Code PIX

Este plano descreve a implementação de uma funcionalidade na aba de recuperação de vendas (Super Admin) que permite gerar um QR Code PIX dinâmico para facilitar o pagamento direto pelo cliente durante o atendimento manual via WhatsApp.

## Alterações de Banco de Dados

- Criar uma nova política de RLS para permitir que administradores consultem logs de recuperação e perfis de forma otimizada para esta funcionalidade.
- (Opcional) Adicionar metadados ao `whatsapp_recovery_log` para registrar quando um QR Code foi gerado.

## Backend (Edge Functions)

### 1. Atualização da `create-payment`
- Garantir que a função suporte a criação de pagamentos PIX para usuários existentes (não anônimos) solicitados por um administrador.
- Retornar o `qr_code` e `qr_code_base64` do Mercado Pago.

### 2. Nova Função `admin-generate-recovery-pix`
- Criar uma Edge Function dedicada para administradores gerarem um link/QR Code de pagamento sem que o usuário precise estar logado no momento.
- Esta função chamará o Mercado Pago e retornará os dados do PIX.

## Frontend (Admin)

### 1. `WhatsAppRecoveryDialog.tsx`
- Adicionar uma seção "Gerar Pagamento PIX".
- Permitir que o admin escolha o plano (Mensal, Anual, etc.).
- Botão "Gerar QR Code".
- Exibir o QR Code na tela e permitir copiar a "Chave Copia e Cola".
- Botão "Enviar no WhatsApp com Link/PIX" que anexa automaticamente a chave PIX ou o link de checkout à mensagem.

### 2. `AdminRecuperacaoPage.tsx`
- Melhorar a visualização dos destinatários para mostrar rapidamente se o usuário já tem um pagamento pendente ou se um QR Code foi gerado recentemente.

## Detalhes Técnicos
- O QR Code será gerado via integração direta com a API do Mercado Pago (v1/payments) usando o `payment_method_id: 'pix'`.
- O link de checkout gerado poderá conter UTMs para rastrear que a venda veio da recuperação manual.
