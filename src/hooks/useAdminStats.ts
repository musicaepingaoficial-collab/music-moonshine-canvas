import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useUser";

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalMusicas: number;
  totalRevenue: number;
  recentUsers: { id: string; name: string; email: string; created_at: string }[];
  drives: { name: string; status: string; usage_percent: number }[];
  popularTracks: { id: string; title: string; artist: string; download_count: number }[];
}

export function useAdminStats() {
  const { user } = useAuth();

  return useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      console.log("[useAdminStats:fetch]", { userId: user?.id });

      // Parallel queries for performance
      const [
        { count: totalUsers },
        { count: activeSubscriptions },
        { count: totalMusicas },
        { data: subscriptions },
        { data: recentUsers },
        { data: drives },
        { data: downloads },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("assinaturas").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("musicas").select("*", { count: "exact", head: true }),
        supabase.from("assinaturas").select("price").eq("status", "active"),
        supabase.from("profiles").select("id, name, email, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("google_drives").select("name, status, usage_percent"),
        supabase.from("downloads").select("musica_id, musicas(id, title, artist)").limit(100),
      ]);

      // Calculate revenue
      const totalRevenue = (subscriptions ?? []).reduce((sum, s) => sum + Number(s.price || 0), 0);

      // Calculate popular tracks from downloads
      const trackCounts = new Map<string, { id: string; title: string; artist: string; count: number }>();
      (downloads ?? []).forEach((d: any) => {
        if (d.musicas) {
          const key = d.musica_id;
          const existing = trackCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            trackCounts.set(key, { id: d.musicas.id, title: d.musicas.title, artist: d.musicas.artist, count: 1 });
          }
        }
      });
      const popularTracks = Array.from(trackCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((t) => ({ id: t.id, title: t.title, artist: t.artist, download_count: t.count }));

      console.log("[useAdminStats:done]", { totalUsers, activeSubscriptions, totalMusicas });

      return {
        totalUsers: totalUsers ?? 0,
        activeSubscriptions: activeSubscriptions ?? 0,
        totalMusicas: totalMusicas ?? 0,
        totalRevenue,
        recentUsers: (recentUsers ?? []) as AdminStats["recentUsers"],
        drives: (drives ?? []) as AdminStats["drives"],
        popularTracks,
      };
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}
