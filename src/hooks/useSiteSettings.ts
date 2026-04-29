import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  id: string;
  maintenance_mode: boolean;
  maintenance_title: string;
  maintenance_message: string;
  whatsapp_number: string | null;
  updated_at: string;
}

export interface PixelSettings {
  id: string;
  meta_enabled: boolean;
  meta_pixel_id: string | null;
  meta_access_token: string | null;
  meta_events: Record<string, boolean>;
  google_ads_enabled: boolean;
  google_ads_conversion_id: string | null;
  google_ads_labels: Record<string, string>;
  gtm_enabled: boolean;
  gtm_container_id: string | null;
  ga4_enabled: boolean;
  ga4_measurement_id: string | null;
  kwai_enabled: boolean;
  kwai_pixel_id: string | null;
  kwai_access_token: string | null;
  tiktok_enabled: boolean;
  tiktok_pixel_id: string | null;
  tiktok_access_token: string | null;
  updated_at: string;
}

export function useSiteSettings() {
  return useQuery<SiteSettings | null>({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("site_settings" as any) as any)
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SiteSettings | null;
    },
    staleTime: 60_000,
  });
}

export function useUpdateSiteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; values: Partial<SiteSettings> }) => {
      const { error } = await (supabase.from("site_settings" as any) as any)
        .update(input.values)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-settings"] }),
  });
}

export function usePixelSettings() {
  return useQuery<PixelSettings | null>({
    queryKey: ["pixel-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("pixel_settings" as any) as any)
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PixelSettings | null;
    },
    staleTime: 60_000,
  });
}

export function useUpdatePixelSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; values: Partial<PixelSettings> }) => {
      const { error } = await (supabase.from("pixel_settings" as any) as any)
        .update(input.values)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pixel-settings"] }),
  });
}
