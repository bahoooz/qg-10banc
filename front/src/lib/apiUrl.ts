const PROD_API_FALLBACK = "https://api.10banc.com";

let missingEnvWarned = false;

/** Base URL API — injectée au build via VITE_API_URL. */
export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  if (import.meta.env.DEV) {
    return "http://localhost:4000";
  }

  if (!missingEnvWarned) {
    console.warn(
      `[api] VITE_API_URL absent au build — fallback ${PROD_API_FALLBACK}. ` +
        "Crée front/.env.production puis relance pnpm build:front.",
    );
    missingEnvWarned = true;
  }

  return PROD_API_FALLBACK;
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
