export type SubtitleFontSource = "fontsource" | "system" | "custom";

export type CustomSubtitleFontManifestEntry = {
  id: string;
  label: string;
  file: string;
  canvasFamily: string;
  fontWeight: number;
  assFontName?: string;
};

export type SubtitleFontDefinition = {
  id: string;
  label: string;
  cssFamily: string;
  canvasFamily: string;
  assFontName: string;
  fontWeight: number;
  source: SubtitleFontSource;
  /** Fichier dans assets/subtitle-fonts/ (custom uniquement) */
  fontFile?: string;
  /** Chemin relatif @fontsource (fontsource uniquement) */
  fontsourcePath?: string;
};

export const BUILTIN_SUBTITLE_FONT_IDS = [
  "montserrat-extrabold",
  "oswald-bold",
  "bebas-neue",
  "anton",
  "poppins-extrabold",
  "archivo-black",
  "rubik-black",
  "arial-black",
] as const;

export type BuiltinSubtitleFontId = (typeof BUILTIN_SUBTITLE_FONT_IDS)[number];

/** IDs builtin + `custom-*` déclarés dans le manifest */
export type SubtitleFontId = BuiltinSubtitleFontId | `custom-${string}`;

export const CUSTOM_SUBTITLE_FONT_ID_PATTERN = /^custom-[a-z0-9-]+$/;
