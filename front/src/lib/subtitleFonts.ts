import manifest from "../../../assets/subtitle-fonts/manifest.json";
import {
  buildCustomFontFaceCss,
  customFontFromManifestEntry,
  getSubtitleFontOption,
  mergeSubtitleFonts,
  setSubtitleFontRegistry,
  type CustomSubtitleFontManifestEntry,
  type SubtitleFontDefinition,
  type SubtitleFontId,
} from "@qg/subtitle-composition";

import "@fontsource/montserrat/latin-800.css";
import "@fontsource/oswald/latin-700.css";
import "@fontsource/bebas-neue/latin-400.css";
import "@fontsource/anton/latin-400.css";
import "@fontsource/poppins/latin-800.css";
import "@fontsource/archivo-black/latin-400.css";
import "@fontsource/rubik/latin-900.css";

const customEntries = (manifest as CustomSubtitleFontManifestEntry[]).flatMap(
  (entry) => {
    try {
      return [customFontFromManifestEntry(entry)];
    } catch (error) {
      console.warn("[subtitle-fonts] Entrée manifest ignorée:", error);
      return [];
    }
  },
);

export const SUBTITLE_FONT_OPTIONS: SubtitleFontDefinition[] =
  mergeSubtitleFonts(customEntries);

setSubtitleFontRegistry(SUBTITLE_FONT_OPTIONS);

const CUSTOM_FONT_STYLE_ID = "qg-custom-subtitle-fonts";

function ensureCustomFontFacesInjected(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(CUSTOM_FONT_STYLE_ID)) return;

  const css = buildCustomFontFaceCss(SUBTITLE_FONT_OPTIONS);
  if (!css) return;

  const style = document.createElement("style");
  style.id = CUSTOM_FONT_STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

export function initSubtitleFonts(): void {
  ensureCustomFontFacesInjected();
}

export function getSubtitleFontCssStyle(fontId: SubtitleFontId): {
  fontFamily: string;
  fontWeight: number;
} {
  const option = getSubtitleFontOption(fontId);
  return { fontFamily: option.cssFamily, fontWeight: option.fontWeight };
}

export type { SubtitleFontId, SubtitleFontDefinition as SubtitleFontOption };
