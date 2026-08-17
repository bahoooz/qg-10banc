import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { GlobalFonts } from "@napi-rs/canvas";
import { getSubtitleFontOption } from "@qg/subtitle-composition";
import { SUBTITLE_FONTS_DIR } from "../lib/paths.js";
import { loadSubtitleFontRegistry } from "./subtitleFonts.config.js";

const require = createRequire(import.meta.url);

let fontsRegistered = false;

export function ensureSubtitleCanvasFontsRegistered(): void {
  if (fontsRegistered) return;

  const fonts = loadSubtitleFontRegistry();

  for (const option of fonts) {
    if (option.source === "fontsource" && option.fontsourcePath) {
      try {
        const fontPath = require.resolve(option.fontsourcePath);
        GlobalFonts.registerFromPath(fontPath, option.canvasFamily);
      } catch (error) {
        console.warn(
          `[subtitle-canvas] Impossible de charger @fontsource ${option.canvasFamily}:`,
          error,
        );
      }
      continue;
    }

    if (option.source === "custom" && option.fontFile) {
      const fontPath = path.join(SUBTITLE_FONTS_DIR, option.fontFile);
      if (!fs.existsSync(fontPath)) {
        console.warn(
          `[subtitle-canvas] Fichier police custom introuvable: ${fontPath}`,
        );
        continue;
      }

      try {
        GlobalFonts.registerFromPath(fontPath, option.canvasFamily);
      } catch (error) {
        console.warn(
          `[subtitle-canvas] Impossible de charger la police custom ${option.canvasFamily}:`,
          error,
        );
      }
      continue;
    }

    if (option.source === "system") {
      // Arial Black — police système, pas d'enregistrement requis.
    }
  }

  fontsRegistered = true;
}

export function buildCanvasFont(
  fontWeight: number,
  fontSize: number,
  fontFamily: string,
): string {
  return `${fontWeight} ${Math.round(fontSize)}px "${fontFamily}"`;
}

export function resolveCanvasFontFamily(fontId: string): string {
  return getSubtitleFontOption(fontId).canvasFamily;
}
