import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useUser";
import { toast } from "@/hooks/use-toast";

const SESSION_KEY = "mp_session_id";

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = (crypto as any).randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Enforces a single active session per user. When the same account logs in
 * elsewhere, this device is signed out automatically.
 */
export function useSingleSession() {
  const { user } = useAuth();
  const userIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // User logged out → cleanup
    if (!user) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      localStorage.removeItem(SESSION_KEY);
      userIdRef.current = null;
      return;
    }

    // Avoid re-running for the same user
    if (userIdRef.current === user.id) return;
    userIdRef.current = user.id;

    const sessionId = getOrCreateSessionId();
    const userId = user.id;

    const init = async () => {
      // Register/update this device as the active session
      const { error } = await (supabase.from("active_sessions" as any) as any)
        .upsert(
          {
            user_id: userId,
            session_id: sessionId,
            device_info: navigator.userAgent.slice(0, 200),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      if (error) console.warn("[useSingleSession] upsert error:", error);

      // Subscribe to changes on our row
      const channel = supabase
        .channel(`active_session_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "active_sessions",
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            const remoteSessionId =
              payload.new?.session_id ?? payload.old?.session_id;
            if (remoteSessionId && remoteSessionId !== sessionId) {
              localStorage.removeItem(SESSION_KEY);
              toast({
                title: "Sessão encerrada",
                description:
                  "Sua conta foi acessada em outro dispositivo.",
                variant: "destructive",
              });
              supabase.auth.signOut().finally(() => {
                window.location.href = "/login";
              });
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    init();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);
}
