import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function readPackageName(dir: string): string | null {
  const packageJsonPath = path.join(dir, "package.json");
  if (!fs.existsSync(packageJsonPath)) return null;

  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as {
      name?: string;
    };
    return pkg.name ?? null;
  } catch {
    return null;
  }
}

/** Racine du package back (`back/`) — dev (`src/lib`) et prod (`dist/src/lib`). */
function resolveBackDir(): string {
  let dir = currentDir;

  for (let depth = 0; depth < 8; depth += 1) {
    if (readPackageName(dir) === "qg-back") {
      return dir;
    }
    dir = path.resolve(dir, "..");
  }

  throw new Error(
    "Impossible de résoudre la racine back/ (package qg-back introuvable).",
  );
}

function resolveMonorepoRoot(backDir: string): string {
  const explicit = process.env.MONOREPO_ROOT?.trim();
  if (explicit) {
    return path.resolve(explicit);
  }

  return path.resolve(backDir, "..");
}

function resolveFrontDistDir(backDir: string, monorepoRoot: string): string {
  const explicit = process.env.FRONT_DIST_DIR?.trim();
  if (explicit) {
    return path.resolve(explicit);
  }

  const candidates = [
    path.join(monorepoRoot, "front", "dist"),
    path.join(backDir, "..", "front", "dist"),
    path.join(backDir, "front", "dist"),
  ];

  const uniqueCandidates = [
    ...new Set(candidates.map((candidate) => path.resolve(candidate))),
  ];

  for (const candidate of uniqueCandidates) {
    const indexPath = path.join(candidate, "index.html");
    if (fs.existsSync(indexPath)) {
      if (candidate !== uniqueCandidates[0]) {
        logger.warn("paths", "front/dist résolu via chemin alternatif", {
          frontDistDir: candidate,
          preferred: uniqueCandidates[0],
        });
      }
      return candidate;
    }
  }

  return uniqueCandidates[0];
}

export const BACK_DIR = resolveBackDir();
export const MONOREPO_ROOT = resolveMonorepoRoot(BACK_DIR);
export const FRONT_DIST_DIR = resolveFrontDistDir(BACK_DIR, MONOREPO_ROOT);

export const CLIPS_DIR = path.join(BACK_DIR, "clips");
export const CLIPS_SOURCES_DIR = path.join(CLIPS_DIR, "sources");
export const CLIPS_PREVIEWS_DIR = path.join(CLIPS_DIR, "previews");
export const CLIPS_EXPORTS_DIR = path.join(CLIPS_DIR, "exports");
export const CLIPS_TEMP_DIR = path.join(CLIPS_DIR, "temp");

/** Polices sous-titres custom (manifest + fichiers woff2/ttf) */
export const SUBTITLE_FONTS_DIR = path.join(
  MONOREPO_ROOT,
  "assets",
  "subtitle-fonts",
);

/** Quota disque alloué aux clips (100 Go). */
export const CLIPS_STORAGE_QUOTA_BYTES = 100 * 1024 * 1024 * 1024;

/** Rétention automatique des clips enregistrés (30 jours). */
export const CLIPS_SAVED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const MEDIA_DIR = path.join(BACK_DIR, "media");
export const CUT_INPUT_DIR = path.join(BACK_DIR, "cut", "input");
export const CUT_OUTPUT_DIR = path.join(BACK_DIR, "cut", "output");

export function logResolvedPaths(): void {
  logger.info("paths", "Chemins résolus", {
    cwd: process.cwd(),
    backDir: BACK_DIR,
    monorepoRoot: MONOREPO_ROOT,
    frontDistDir: FRONT_DIST_DIR,
    frontIndexExists: fs.existsSync(path.join(FRONT_DIST_DIR, "index.html")),
  });
}

export function ensureClipDirectories(): void {
  for (const dir of [
    CLIPS_DIR,
    CLIPS_SOURCES_DIR,
    CLIPS_PREVIEWS_DIR,
    CLIPS_EXPORTS_DIR,
    CLIPS_TEMP_DIR,
    MEDIA_DIR,
    CUT_INPUT_DIR,
    CUT_OUTPUT_DIR,
  ]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function ensureFrontDistExists(): void {
  const indexPath = path.join(FRONT_DIST_DIR, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error(
      `Build frontend introuvable (${indexPath}). Lance pnpm build:front depuis la racine du monorepo.`,
    );
  }
}
