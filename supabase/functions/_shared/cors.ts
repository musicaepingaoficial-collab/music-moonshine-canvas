// Helper de CORS com lista de origens permitidas.
// - Produção: https://musicaepinga.shop
// - Preview Lovable: *.lovableproject.com / *.lovable.app
// - Localhost (dev)

const ALLOWED_ORIGINS = [
  "https://musicaepinga.shop",
  "https://www.musicaepinga.shop",
];

const ALLOWED_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
];

function isAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return ALLOWED_PATTERNS.some((re) => re.test(origin));
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allow = isAllowed(origin) ? origin! : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Vary": "Origin",
  };
}
