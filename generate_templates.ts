import { emailTemplate } from "./supabase/functions/_shared/templates.ts";

const templates = {
  confirm_signup: {
    title: "Confirme seu e-mail",
    content: `
      <h2>Bem-vindo ao Música e Pinga!</h2>
      <p>Olá,</p>
      <p>Ficamos felizes em ter você conosco. Para começar a aproveitar todos os recursos, por favor confirme seu e-mail clicando no botão abaixo:</p>
      <a href="{{ .ConfirmationURL }}" class="button">Confirmar E-mail</a>
      <p>Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
      <p class="link-alt">{{ .ConfirmationURL }}</p>
    `
  },
  reset_password: {
    title: "Redefinir sua senha",
    content: `
      <h2>Redefinição de Senha</h2>
      <p>Olá,</p>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta no Música e Pinga.</p>
      <p>Clique no botão abaixo para escolher uma nova senha:</p>
      <a href="{{ .ConfirmationURL }}" class="button">Redefinir Senha</a>
      <p>Se você não solicitou a redefinição, pode ignorar este e-mail com segurança.</p>
      <p>O link expirará em breve por motivos de segurança.</p>
    `
  },
  magic_link: {
    title: "Seu link de acesso",
    content: `
      <h2>Entrar no Música e Pinga</h2>
      <p>Olá,</p>
      <p>Você solicitou um link para entrar na sua conta sem senha.</p>
      <p>Clique no botão abaixo para acessar o site agora:</p>
      <a href="{{ .ConfirmationURL }}" class="button">Entrar Agora</a>
      <p>Se o botão acima não funcionar, use o link abaixo:</p>
      <p class="link-alt">{{ .ConfirmationURL }}</p>
    `
  },
  change_email: {
    title: "Confirme a alteração de e-mail",
    content: `
      <h2>Alteração de E-mail</h2>
      <p>Olá,</p>
      <p>Você solicitou a alteração do seu endereço de e-mail no Música e Pinga.</p>
      <p>Para confirmar esta mudança, clique no botão abaixo:</p>
      <a href="{{ .ConfirmationURL }}" class="button">Confirmar Novo E-mail</a>
      <p>Se você não solicitou esta alteração, entre em contato com nosso suporte imediatamente.</p>
    `
  },
  invite: {
    title: "Você foi convidado!",
    content: `
      <h2>Convite Música e Pinga</h2>
      <p>Olá,</p>
      <p>Você foi convidado para participar do Música e Pinga.</p>
      <p>Clique no botão abaixo para aceitar o convite e criar sua conta:</p>
      <a href="{{ .ConfirmationURL }}" class="button">Aceitar Convite</a>
    `
  }
};

console.log("# TEMPLATES DE E-MAIL PARA O SUPABASE DASHBOARD\n");
console.log("Copie o código HTML abaixo para cada seção em: Auth -> Email Templates no seu Dashboard do Supabase.\n");

for (const [key, template] of Object.entries(templates)) {
  console.log(`## ${template.title} (${key})`);
  console.log("```html");
  console.log(emailTemplate(template.content, template.title).trim());
  console.log("```\n");
}
