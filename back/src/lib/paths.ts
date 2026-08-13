import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

  for (let depth = 0; depth < 6; depth += 1) {
    if (readPackageName(dir) === "qg-back") {
      return dir;
    }
    dir = path.resolve(dir, "..");
  }

  throw new Error(
    "Impossible de résoudre la racine back/ (package qg-back introuvable).",
  );
}

export const BACK_DIR = resolveBackDir();

/** Racine monorepo (`qg-10banc/`) */
export const MONOREPO_ROOT = path.resolve(BACK_DIR, "..");

/** Build Vite du frontend (`front/dist`) */
export const FRONT_DIST_DIR = path.join(MONOREPO_ROOT, "front", "dist");

export const CLIPS_DIR = path.join(BACK_DIR, "clips");
export const CLIPS_SOURCES_DIR = path.join(CLIPS_DIR, "sources");
export const CLIPS_PREVIEWS_DIR = path.join(CLIPS_DIR, "previews");
export const CLIPS_EXPORTS_DIR = path.join(CLIPS_DIR, "exports");
export const CLIPS_TEMP_DIR = path.join(CLIPS_DIR, "temp");
export const MEDIA_DIR = path.join(BACK_DIR, "media");
export const CUT_INPUT_DIR = path.join(BACK_DIR, "cut", "input");
export const CUT_OUTPUT_DIR = path.join(BACK_DIR, "cut", "output");

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
      `Build frontend introuvable (${indexPath}). Lance pnpm build:front.`,
    );
  }
}
