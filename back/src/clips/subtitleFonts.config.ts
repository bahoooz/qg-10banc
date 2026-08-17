import fs from "fs";
import path from "path";
import {
  customFontFromManifestEntry,
  mergeSubtitleFonts,
  setSubtitleFontRegistry,
  type CustomSubtitleFontManifestEntry,
  type SubtitleFontDefinition,
} from "@qg/subtitle-composition";
import { SUBTITLE_FONTS_DIR } from "../lib/paths.js";

let cachedFonts: SubtitleFontDefinition[] | null = null;

function readCustomFontManifest(): CustomSubtitleFontManifestEntry[] {
  const manifestPath = path.join(SUBTITLE_FONTS_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) return [];

  try {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      console.warn("[subtitle-fonts] manifest.json invalide — tableau attendu");
      return [];
    }
    return parsed as CustomSubtitleFontManifestEntry[];
  } catch (error) {
    console.warn("[subtitle-fonts] Impossible de lire manifest.json:", error);
    return [];
  }
}

export function loadSubtitleFontRegistry(): SubtitleFontDefinition[] {
  if (cachedFonts) return cachedFonts;

  const customEntries = readCustomFontManifest();
  const customFonts = customEntries.map((entry) => {
    try {
      return customFontFromManifestEntry(entry);
    } catch (error) {
      console.warn("[subtitle-fonts] Entrée manifest ignorée:", error);
      return null;
    }
  }).filter((font): font is SubtitleFontDefinition => font !== null);

  cachedFonts = mergeSubtitleFonts(customFonts);
  setSubtitleFontRegistry(cachedFonts);
  return cachedFonts;
}

export function getAllSubtitleFontIds(): [string, ...string[]] {
  const fonts = loadSubtitleFontRegistry();
  if (fonts.length === 0) {
    return ["montserrat-extrabold"];
  }
  return fonts.map((font) => font.id) as [string, ...string[]];
}

export function getCustomSubtitleFontFiles(): string[] {
  return loadSubtitleFontRegistry()
    .filter((font) => font.source === "custom" && font.fontFile)
    .map((font) => path.join(SUBTITLE_FONTS_DIR, font.fontFile!))
    .filter((filePath) => fs.existsSync(filePath));
}
