import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { usePixels } from "@/lib/pixels";

/**
 * Fires `page_view` on every route change, respecting the toggles
 * configured in /admin/pixels. Mount once inside <BrowserRouter>.
 */
export function RouteTracker() {
  const location = useLocation();
  const { track, settings } = usePixels();

  useEffect(() => {
    if (!settings) return;
    track("page_view");
  }, [location.pathname, location.search, settings, track]);

  return null;
}
