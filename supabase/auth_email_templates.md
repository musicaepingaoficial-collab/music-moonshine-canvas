# Templates de E-mail para Supabase Auth

Copie o código HTML abaixo para cada seção correspondente no seu Dashboard do Supabase (**Auth -> Email Templates**).

---

## 1. Confirmar Cadastro (Confirm Signup)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu e-mail</title>
  <style>
    body { margin: 0; padding: 0; background-color: #121212; font-family: 'Inter', sans-serif; color: #f2f2f2; }
    .container { max-width: 600px; margin: 40px auto; background-color: #1a1a1a; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a2a; }
    .header { padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981, #059669); }
    .header h1 { margin: 0; font-size: 24px; color: white; text-transform: uppercase; letter-spacing: 2px; }
    .content { padding: 40px 30px; line-height: 1.6; }
    .content h2 { color: #10b981; margin-top: 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #2a2a2a; }
    .button { display: inline-block; padding: 14px 28px; background-color: #10b981; color: white !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .link-alt { color: #10b981; word-break: break-all; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>MÚSICA E PINGA</h1></div>
    <div class="content">
      <h2>Bem-vindo ao Música e Pinga!</h2>
      <p>Olá,</p>
      <p>Ficamos felizes em ter você conosco. Para começar a aproveitar todos os recursos, por favor confirme seu e-mail clicando no botão abaixo:</p>
      <a href="{{ .ConfirmationURL }}" class="button">Confirmar E-mail</a>
      <p>Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
      <p class="link-alt">{{ .ConfirmationURL }}</p>
    </div>
    <div class="footer">&copy; 2026 Música e Pinga. Todos os direitos reservados.</div>
  </div>
</body>
</html>
```

---

## 2. Redefinir Senha (Reset Password)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir sua senha</title>
  <style>
    /* Mesmos estilos acima */
    body { margin: 0; padding: 0; background-color: #121212; font-family: 'Inter', sans-serif; color: #f2f2f2; }
    .container { max-width: 600px; margin: 40px auto; background-color: #1a1a1a; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a2a; }
    .header { padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981, #059669); }
    .header h1 { margin: 0; font-size: 24px; color: white; text-transform: uppercase; letter-spacing: 2px; }
    .content { padding: 40px 30px; line-height: 1.6; }
    .content h2 { color: #10b981; margin-top: 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #2a2a2a; }
    .button { display: inline-block; padding: 14px 28px; background-color: #10b981; color: white !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .link-alt { color: #10b981; word-break: break-all; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>MÚSICA E PINGA</h1></div>
    <div class="content">
      <h2>Redefinição de Senha</h2>
      <p>Olá,</p>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
      <p>Clique no botão abaixo para escolher uma nova senha:</p>
      <a href="{{ .ConfirmationURL }}" class="button">Redefinir Senha</a>
      <p>Se você não solicitou isso, pode ignorar este e-mail com segurança.</p>
      <p class="link-alt">{{ .ConfirmationURL }}</p>
    </div>
    <div class="footer">&copy; 2026 Música e Pinga. Todos os direitos reservados.</div>
  </div>
</body>
</html>
```

---

## 3. Link Mágico (Magic Link)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seu link de acesso</title>
  <style>
    /* Mesmos estilos acima */
    body { margin: 0; padding: 0; background-color: #121212; font-family: 'Inter', sans-serif; color: #f2f2f2; }
    .container { max-width: 600px; margin: 40px auto; background-color: #1a1a1a; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a2a; }
    .header { padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981, #059669); }
    .header h1 { margin: 0; font-size: 24px; color: white; text-transform: uppercase; letter-spacing: 2px; }
    .content { padding: 40px 30px; line-height: 1.6; }
    .content h2 { color: #10b981; margin-top: 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #2a2a2a; }
    .button { display: inline-block; padding: 14px 28px; background-color: #10b981; color: white !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .link-alt { color: #10b981; word-break: break-all; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>MÚSICA E PINGA</h1></div>
    <div class="content">
      <h2>Entrar no Música e Pinga</h2>
      <p>Olá,</p>
      <p>Clique no botão abaixo para entrar na sua conta:</p>
      <a href="{{ .ConfirmationURL }}" class="button">Entrar Agora</a>
      <p>Se o link não funcionar, use: <br><span class="link-alt">{{ .ConfirmationURL }}</span></p>
    </div>
    <div class="footer">&copy; 2026 Música e Pinga. Todos os direitos reservados.</div>
  </div>
</body>
</html>
```

---

## 4. Mensagens SMS (SMS Templates)

Para as mensagens de texto (SMS), você pode usar um formato simples e direto:

**Confirmação de Código (SMS OTP):**
`Música e Pinga: Seu código de confirmação é {{ .Token }}.`

---

## Como configurar no Supabase:

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard).
2. Vá em **Authentication** -> **Email Templates**.
3. Escolha o template (Confirm Signup, Reset Password, etc).
4. Desmarque a opção "Enable default template" (se houver) e cole o HTML acima no campo **Body**.
5. Salve as alterações.

