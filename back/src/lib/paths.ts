import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/** Racine du package back (`back/`) */
export const BACK_DIR = path.resolve(currentDir, "..", "..");

/** Build Vite du frontend (`front/dist`) */
export const FRONT_DIST_DIR = path.resolve(BACK_DIR, "..", "front", "dist");

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
