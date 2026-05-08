import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Usando uma API de terceiros ou um serviço de relay, 
    // mas como o usuário quer SMTP da Hostinger e estamos em Deno Edge Functions,
    // a melhor forma sem bibliotecas complexas é usar uma API de envio ou Resend.
    // No entanto, para SMTP puro em Deno, costumamos usar a biblioteca 'smtp' do deno.land/x.
    
    // Para simplificar e garantir funcionamento, vou sugerir o uso de uma biblioteca compatível.
    // Mas note: Supabase Edge Functions têm limitações com sockets diretos (SMTP).
    // Geralmente recomenda-se Resend ou similar.
    
    // Se o usuário INSISTE em SMTP Hostinger, vamos tentar usar o port 465/587.
    // Infelizmente, Deno Deploy (onde rodam as functions) não suporta sockets TCP arbitrários facilmente sem bibliotecas específicas.
    
    // VOU USAR A BIBLIOTECA SmtpClient para Deno.
    const { SmtpClient } = await import("https://deno.land/x/smtp@v0.7.0/mod.ts");
    const client = new SmtpClient();

    await client.connectTLS({
      hostname: SMTP_HOST,
      port: parseInt(SMTP_PORT),
      username: SMTP_USER,
      password: SMTP_PASS,
    });

    await client.send({
      from: SMTP_FROM!,
      to: to,
      subject: subject,
      content: html,
      html: html,
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
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
