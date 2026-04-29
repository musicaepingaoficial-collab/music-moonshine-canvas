import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useUser";

export interface Pdf {
  id: string;
  title: string;
  description: string | null;
  author: string | null;
  cover_url: string | null;
  file_path: string;
  file_size: number;
  access_type: "paid" | "subscriber_bonus";
  price: number;
  active: boolean;
  created_at: string;
}

export function usePdfs(opts: { adminMode?: boolean } = {}) {
  return useQuery({
    queryKey: ["pdfs", opts.adminMode ? "admin" : "public"],
    queryFn: async () => {
      const q = supabase.from("pdfs").select("*").order("created_at", { ascending: false });
      if (!opts.adminMode) q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Pdf[];
    },
  });
}

export function useMyPdfPurchases() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pdf-purchases", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdf_purchases")
        .select("pdf_id, status")
        .eq("user_id", user!.id)
        .eq("status", "approved");
      if (error) throw error;
      return new Set((data ?? []).map((p) => p.pdf_id));
    },
  });
}

export function useActiveSubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["active-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("assinaturas")
        .select("id, expires_at")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return false;
      return !data.expires_at || new Date(data.expires_at) > new Date();
    },
  });
}
