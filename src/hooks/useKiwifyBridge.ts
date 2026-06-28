import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface KiwifyBridgeConfig {
  id: string;
  enabled: boolean;
  destination_url: string | null;
  product_id: string | null;
  product_name: string | null;
  secret_token: string | null;
  forward_pending: boolean;
  forward_refused: boolean;
  updated_at: string;
}

export interface KiwifyBridgeLog {
  id: string;
  mp_payment_id: string | null;
  mp_status: string | null;
  kiwify_status: string | null;
  destination_url: string | null;
  request_payload: any;
  response_status: number | null;
  response_body: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

const CFG = "kiwify_bridge_config";
const LOGS = "kiwify_bridge_logs";

export function useKiwifyBridgeConfig() {
  return useQuery<KiwifyBridgeConfig | null>({
    queryKey: ["kiwify-bridge", "config"],
    queryFn: async () => {
      const { data, error } = await (supabase.from(CFG as any) as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as KiwifyBridgeConfig) ?? null;
    },
  });
}

export function useUpdateKiwifyBridgeConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; values: Partial<KiwifyBridgeConfig> }) => {
      const { error } = await (supabase.from(CFG as any) as any)
        .update(input.values)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kiwify-bridge"] }),
  });
}

export function useKiwifyBridgeLogs(limit = 20) {
  return useQuery<KiwifyBridgeLog[]>({
    queryKey: ["kiwify-bridge", "logs", limit],
    queryFn: async () => {
      const { data, error } = await (supabase.from(LOGS as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as KiwifyBridgeLog[];
    },
    refetchInterval: 10_000,
  });
}
