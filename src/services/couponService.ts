import { supabase } from "@/integrations/supabase/client";

export async function validateCoupon(code: string) {
  const { data, error } = await supabase
    .from("cupons")
    .select("*")
    .eq("codigo", code.toUpperCase())
    .eq("ativo", true)
    .maybeSingle();

  if (error || !data) throw new Error("Cupom inválido ou expirado");

  if (data.data_expiracao && new Date(data.data_expiracao) < new Date()) {
    throw new Error("Cupom expirado");
  }

  if (data.uso_limite && data.uso_atual >= data.uso_limite) {
    throw new Error("Limite de uso atingido");
  }

  return data;
}
