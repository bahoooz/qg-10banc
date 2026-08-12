import { JWT } from "google-auth-library";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveGoogleServiceAccountPath(): string {
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv)
      ? fromEnv
      : path.resolve(process.cwd(), fromEnv);
  }

  return path.join(__dirname, "vertex-key.json");
}

export async function getAccessToken() {
  const keyPath = resolveGoogleServiceAccountPath();

  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Fichier credentials GCP introuvable (${keyPath}). Définis GOOGLE_APPLICATION_CREDENTIALS.`,
    );
  }

  const sa = JSON.parse(fs.readFileSync(keyPath, "utf-8")) as {
    client_email: string;
    private_key: string;
  };

  const client = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const { token } = await client.getAccessToken();

  if (!token) throw new Error("Impossible de générer un token d'accès");

  return token;
}

export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;

  constructor(statusCode: number, errorCode: string, message?: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}
