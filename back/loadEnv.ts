import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Racine du package back (`back/`).
 * En dev : loadEnv.ts est dans back/
 * En prod : loadEnv.js est compilé dans back/dist/
 */
function resolveBackRoot(): string {
  const envInCurrentDir = path.join(currentDir, ".env");
  if (fs.existsSync(envInCurrentDir)) {
    return currentDir;
  }

  const parentDir = path.resolve(currentDir, "..");
  const envInParentDir = path.join(parentDir, ".env");
  if (fs.existsSync(envInParentDir)) {
    return parentDir;
  }

  return parentDir;
}

const backRoot = resolveBackRoot();
const envPath = path.join(backRoot, ".env");

const result = dotenv.config({ path: envPath });

if (result.error && process.env.NODE_ENV === "production") {
  console.warn(`[env] Fichier .env introuvable : ${envPath}`);
} else if (!result.error) {
  console.log(`[env] Variables chargées depuis ${envPath}`);
}
