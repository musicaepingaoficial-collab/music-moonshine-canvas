import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerPwa } from "./pwa";

createRoot(document.getElementById("root")!).render(<App />);

// Defer SW + version polling until the browser is idle, after first paint/LCP
const schedule = (cb: () => void) =>
  "requestIdleCallback" in window
    ? (window as any).requestIdleCallback(cb, { timeout: 3000 })
    : setTimeout(cb, 2000);
schedule(() => registerPwa());
