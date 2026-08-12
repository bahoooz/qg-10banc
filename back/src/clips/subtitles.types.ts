export type SubtitleWordPayload = {
  id: string;
  text: string;
  start: number;
  end: number;
};

export type SubtitleStylePayload = {
  preset: "word-pop" | "word-pop-accent";
  fontFamily: string;
  fontSize: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  position: "center" | "lower";
  animation?: "pop" | "bounce" | "fade" | "scale";
  glowColor?: string;
  glowIntensity?: number;
  glowSpread?: number;
  layoutX?: number;
  layoutY?: number;
  previewContainerWidth?: number;
};

export type TranscribeResult = {
  words: SubtitleWordPayload[];
  language: string;
};
