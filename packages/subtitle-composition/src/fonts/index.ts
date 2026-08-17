import {
  BUILTIN_SUBTITLE_FONTS,
  DEFAULT_SUBTITLE_FONT_ID,
} from "./builtinFonts.js";
import type {
  CustomSubtitleFontManifestEntry,
  SubtitleFontDefinition,
} from "./types.js";
import { CUSTOM_SUBTITLE_FONT_ID_PATTERN } from "./types.js";

let activeFonts: SubtitleFontDefinition[] = [...BUILTIN_SUBTITLE_FONTS];

export function setSubtitleFontRegistry(fonts: SubtitleFontDefinition[]): void {
  activeFonts = fonts.length > 0 ? fonts : [...BUILTIN_SUBTITLE_FONTS];
}

export function getActiveSubtitleFonts(): SubtitleFontDefinition[] {
  return activeFonts;
}

export function getSubtitleFontOption(fontId: string): SubtitleFontDefinition {
  return (
    activeFonts.find((font) => font.id === fontId) ??
    activeFonts.find((font) => font.id === DEFAULT_SUBTITLE_FONT_ID) ??
    BUILTIN_SUBTITLE_FONTS[0]
  );
}

export function getAssFontName(fontId: string): string {
  return getSubtitleFontOption(fontId).assFontName;
}

function inferFontFormat(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "woff2") return "woff2";
  if (ext === "woff") return "woff";
  if (ext === "otf") return "opentype";
  return "truetype";
}

export function customFontFromManifestEntry(
  entry: CustomSubtitleFontManifestEntry,
): SubtitleFontDefinition {
  if (!CUSTOM_SUBTITLE_FONT_ID_PATTERN.test(entry.id)) {
    throw new Error(
      `ID police invalide "${entry.id}" — utilise le préfixe custom- (ex. custom-impact-label)`,
    );
  }

  const cssFamily = `'${entry.canvasFamily.replace(/'/g, "\\'")}', sans-serif`;

  return {
    id: entry.id,
    label: entry.label,
    cssFamily,
    canvasFamily: entry.canvasFamily,
    assFontName: entry.assFontName ?? entry.canvasFamily,
    fontWeight: entry.fontWeight,
    source: "custom",
    fontFile: entry.file,
  };
}

export function mergeSubtitleFonts(
  customFonts: SubtitleFontDefinition[],
): SubtitleFontDefinition[] {
  const seen = new Set<string>();
  const merged: SubtitleFontDefinition[] = [];

  for (const font of [...BUILTIN_SUBTITLE_FONTS, ...customFonts]) {
    if (seen.has(font.id)) continue;
    seen.add(font.id);
    merged.push(font);
  }

  return merged;
}

export function buildCustomFontFaceCss(
  fonts: SubtitleFontDefinition[],
  publicBasePath = "/subtitle-fonts",
): string {
  return fonts
    .filter((font) => font.source === "custom" && font.fontFile)
    .map((font) => {
      const format = inferFontFormat(font.fontFile!);
      return `@font-face{font-family:"${font.canvasFamily}";src:url("${publicBasePath}/${font.fontFile}") format("${format}");font-weight:${font.fontWeight};font-style:normal;font-display:swap;}`;
    })
    .join("\n");
}

export {
  BUILTIN_SUBTITLE_FONTS,
  DEFAULT_SUBTITLE_FONT_ID,
} from "./builtinFonts.js";

export {
  BUILTIN_SUBTITLE_FONT_IDS,
  CUSTOM_SUBTITLE_FONT_ID_PATTERN,
  type BuiltinSubtitleFontId,
  type CustomSubtitleFontManifestEntry,
  type SubtitleFontDefinition,
  type SubtitleFontId,
  type SubtitleFontSource,
} from "./types.js";
