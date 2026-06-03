import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PopupLink {
  label: string;
  url: string;
  icon?: "whatsapp" | "telegram" | "instagram" | "link";
}

export interface WelcomePopup {
  id: string;
  active: boolean;
  title: string;
  description: string;
  image_url: string | null;
  links: PopupLink[];
  show_to_new: boolean;
  show_to_subscribers: boolean;
  new_user_days: number;
  version: number;
  updated_at: string;
  plan_slug: string | null;
  discount_coupon: string | null;
  cta_label: string | null;
  exclude_plan_slugs: string[];
  include_plan_slugs: string[];
  priority: number;
}

export function useWelcomePopupSettings() {
  return useQuery<WelcomePopup[]>({
    queryKey: ["welcome-popup"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("welcome_popup" as any) as any)
        .select("*")
        .eq("active", true)
        .order("priority", { ascending: false })
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      if (!data) return [];
      
      return data.map((item: any) => ({
        ...item,
        links: Array.isArray(item.links) ? (item.links as PopupLink[]) : [],
      })) as WelcomePopup[];
    },
    staleTime: 60_000,
  });
}

export function useUpdateWelcomePopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; values: Partial<WelcomePopup> }) => {
      const { error } = await (supabase.from("welcome_popup" as any) as any)
        .update({ ...input.values, version: (input.values as any).version })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["welcome-popup"] }),
  });
}
