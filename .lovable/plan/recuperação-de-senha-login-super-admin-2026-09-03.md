# Recuperação de senha: login + super admin

## 1. Tela de login
- Adicionar link discreto "Esqueceu a senha?" em `src/pages/LoginPage.tsx`, abaixo do campo Senha, alinhado à direita, visível apenas no modo login (não no cadastro).
- Ao clicar, abre um diálogo "Recuperar senha" com campo de e-mail (pré-preenchido com o que já foi digitado), botão "Enviar link" e estado de carregamento.
- Envia o e-mail de recuperação via Supabase Auth com redirecionamento para `/reset-password` (página já existe e funciona).
- Mensagem de sucesso neutra ("Se existir uma conta com este e-mail, enviamos o link") para não revelar se o e-mail está cadastrado.
- Validação: e-mail obrigatório e em formato válido antes de enviar.

## 2. Super admin
- Em `src/pages/admin/AdminUserDetailsPage.tsx`: botão "Enviar e-mail de redefinição de senha" na área de ações do usuário, com confirmação e toast de resultado.
- Em `src/pages/admin/AdminUsuariosPage.tsx`: mesma ação disponível na linha/menu de cada usuário, usando o e-mail já listado.
- O link enviado leva o usuário para `/reset-password` do app.

## Detalhes técnicos
- Usa `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + "/reset-password" })` — não requer edge function nova nem service role.
- Novo componente compartilhado `src/components/auth/ForgotPasswordDialog.tsx`, reaproveitado no login; no admin será um botão direto com `AlertDialog` de confirmação.
- Nenhuma mudança de banco de dados.
- Observação: o Supabase aplica limite de envio de e-mails por hora; se estourar, o toast mostrará o erro de rate limit.
