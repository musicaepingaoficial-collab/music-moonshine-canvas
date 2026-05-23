// Rate-limit ad-hoc por janela fixa.
// Observação: o backend não tem primitivo oficial de rate-limit; esta é uma
// implementação simples baseada em uma tabela `rate_limits`.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
}

export async function rateLimit(
  client: SupabaseClient,
  key: string,
  windowSec: number,
  maxRequests: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const bucket = new Date(Math.floor(now.getTime() / (windowSec * 1000)) * windowSec * 1000).toISOString();

  // Tenta inserir; se já existe incrementa.
  const { data: existing } = await client
    .from("rate_limits")
    .select("count")
    .eq("key", key)
    .eq("window_start", bucket)
    .maybeSingle();

  if (!existing) {
    await client.from("rate_limits").insert({ key, window_start: bucket, count: 1 });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  const newCount = (existing.count as number) + 1;
  await client
    .from("rate_limits")
    .update({ count: newCount })
    .eq("key", key)
    .eq("window_start", bucket);

  return { allowed: newCount <= maxRequests, remaining: Math.max(0, maxRequests - newCount) };
}

export function makeServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}
