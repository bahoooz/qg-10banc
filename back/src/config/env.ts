function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => trimTrailingSlash(entry.trim()))
    .filter(Boolean);
}

export const isProduction = process.env.NODE_ENV === "production";

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

export function getApiUrl(): string {
  const value = process.env.API_URL?.trim();
  if (value) return trimTrailingSlash(value);

  if (isProduction) {
    throw new Error("API_URL est requis en production");
  }

  const port = process.env.PORT?.trim() ?? "4000";
  return `http://localhost:${port}`;
}

export function getFrontendUrl(): string {
  const value = process.env.FRONTEND_URL?.trim();
  if (value) return trimTrailingSlash(value);

  if (isProduction) {
    throw new Error("FRONTEND_URL est requis en production");
  }

  return "http://localhost:5173";
}

export function getPort(): number {
  const parsed = Number(process.env.PORT ?? "4000");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("PORT doit être un entier positif");
  }
  return parsed;
}

/** Origines CORS autorisées (credentials: true). */
export function getCorsOrigins(): string[] {
  const fromEnv = parseCsv(process.env.CORS_ORIGINS);
  const defaults = [
    getFrontendUrl(),
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:3000",
  ];

  return [...new Set([...fromEnv, ...defaults])];
}

export function validateProductionEnv(): void {
  if (!isProduction) return;

  requireEnv("DATABASE_URL");
  requireEnv("JWT_SECRET");
  requireEnv("GATEKEEPER_PASSWORD");
  requireEnv("RESEND_API_KEY");
  requireEnv("API_URL");
  requireEnv("FRONTEND_URL");

  getApiUrl();
  getFrontendUrl();
}
