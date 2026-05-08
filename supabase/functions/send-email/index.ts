import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html } = await req.json() as EmailPayload;

    const SMTP_HOST = Deno.env.get("SMTP_HOST");
    const SMTP_PORT = Deno.env.get("SMTP_PORT");
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");
    const SMTP_FROM = Deno.env.get("SMTP_FROM") || SMTP_USER;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      console.error("Configurações SMTP ausentes");
      throw new Error("SMTP configuration is missing");
    }

    // Configuração do nodemailer
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT),
      secure: parseInt(SMTP_PORT) === 465, // true para 465, false para outros (como 587)
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      // Configurações extras para evitar problemas de certificado em alguns servidores
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log(`Tentando enviar e-mail para ${to} via ${SMTP_HOST}:${SMTP_PORT}`);

    const info = await transporter.sendMail({
      from: `"Música e Pinga" <${SMTP_FROM}>`,
      to,
      subject,
      html,
    });

    console.log("E-mail enviado com sucesso:", info.messageId);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro ao enviar e-mail:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
