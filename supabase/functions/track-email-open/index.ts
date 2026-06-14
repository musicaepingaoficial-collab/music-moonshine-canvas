// Tracking pixel 1x1 para abertura de emails da campanha de recuperação.
// Pública (sem JWT). Registra evento em recovery_email_events e marca opened_at.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// PNG transparente 1x1
const PIXEL = Uint8Array.from(atob(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
), c => c.charCodeAt(0));

const PIXEL_HEADERS = {
  "Content-Type": "image/png",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
};

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const lid = url.searchParams.get("lid");
    if (lid) {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
      const ua = req.headers.get("user-agent") ?? null;
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

      // não bloquear a resposta do pixel
      supabase.from("recovery_email_events").insert({
        log_id: lid, event_type: "open", user_agent: ua, ip,
      }).then(() => {});

      supabase.from("recovery_campaign_log")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", lid)
        .is("opened_at", null)
        .then(() => {});
    }
  } catch (e) {
    console.error("track-email-open", e);
  }
  return new Response(PIXEL, { headers: PIXEL_HEADERS, status: 200 });
});
