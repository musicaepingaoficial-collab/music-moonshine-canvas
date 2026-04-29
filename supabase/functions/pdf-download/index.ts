import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: { user }, error } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (error || !user) return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { pdf_id } = await req.json();
    if (!pdf_id) return new Response(JSON.stringify({ error: "pdf_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: hasAccess } = await supabase.rpc("has_pdf_access", { _user_id: user.id, _pdf_id: pdf_id });
    if (!hasAccess) return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: pdf } = await supabase.from("pdfs").select("file_path, title").eq("id", pdf_id).single();
    if (!pdf) return new Response(JSON.stringify({ error: "PDF não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: signed, error: signedErr } = await supabase.storage
      .from("pdfs")
      .createSignedUrl(pdf.file_path, 60, { download: `${pdf.title}.pdf` });
    if (signedErr || !signed) {
      console.error(signedErr);
      return new Response(JSON.stringify({ error: "Falha ao gerar link" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ url: signed.signedUrl }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pdf-download error", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
