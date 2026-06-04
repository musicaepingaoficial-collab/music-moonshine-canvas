import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useUser";

export const useOnlineStatus = () => {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    const updateStatus = async () => {
      try {
        await supabase
          .from("online_users")
          .upsert({
            user_id: user.id,
            last_seen_at: new Date().toISOString(),
            path: location.pathname,
            user_agent: navigator.userAgent.slice(0, 200),
          });
        
        // As a side effect, record a usage metric if user is admin or periodically
        // This helps simulate a "cron" until real cron is available
        if (Math.random() < 0.1) { // 10% chance to trigger record function
          await supabase.functions.invoke("usage-metrics");
        }
      } catch (err) {
        console.error("Error updating online status:", err);
      }
    };

    // Update immediately on mount or path change
    updateStatus();

    // Set up interval to heartbeat every 60 seconds
    const interval = setInterval(updateStatus, 60000);

    return () => clearInterval(interval);
  }, [user, location.pathname]);
};
