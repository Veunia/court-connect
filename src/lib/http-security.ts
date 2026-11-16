/**
 * Utilitaires de sécurité pour les points d'entrée HTTP publics
 * (`src/routes/api/public/*`). Ces routes contournent l'authentification du
 * site : toute route ajoutée ici doit vérifier son appelant.
 */
import { createHmac, timingSafeEqual } from "crypto";

/** Origines autorisées à appeler les endpoints publics depuis un navigateur. */
const ALLOWED_ORIGINS = [
  "https://basketcrew.app",
  "https://www.basketcrew.app",
  "https://hoop-hangout.lovable.app",
];

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Aperçus Lovable du projet uniquement.
  return /^https:\/\/[\w-]+--[\w-]+\.lovable\.app$/.test(origin);
}

/**
 * En-têtes CORS restreints : rien n'est renvoyé pour une origine inconnue,
 * ce qui bloque les appels navigateur depuis un autre site.
 */
export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

/** Réponse à une requête préalable (OPTIONS). */
export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

/**
 * Vérifie une signature HMAC-SHA256 de webhook en temps constant.
 * À appeler AVANT toute lecture ou écriture déclenchée par le payload.
 */
export function verifyHmacSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signature.replace(/^sha256=/i, "");
  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}