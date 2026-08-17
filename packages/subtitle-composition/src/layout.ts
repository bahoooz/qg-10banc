import {
  EXPORT_CANVAS_HEIGHT,
  EXPORT_CANVAS_WIDTH,
  EXPORT_FONT_METRICS_ADJUST,
  SUBTITLE_CONTAINER_MAX_WIDTH_RATIO,
  SUBTITLE_PREVIEW_REF_WIDTH,
  getSubtitleFontOption,
} from "./constants.js";
import type {
  SubtitleLayout,
  SubtitleStyle,
  TextWidthMeasurer,
} from "./types.js";

export function clampSubtitleScale(scale: number): number {
  return Math.max(0.4, Math.min(2.5, scale));
}

export function normalizeSubtitleLayout(
  layout: Partial<SubtitleLayout>,
): SubtitleLayout {
  return {
    x: layout.x ?? 0.5,
    y: layout.y ?? 0.78,
    scale: clampSubtitleScale(layout.scale ?? 1),
  };
}

export function getSubtitleBaseFontSizePx(containerWidth: number): number {
  const minPx = 1.25 * 16;
  const maxPx = 2.25 * 16;
  const fluidPx = containerWidth * 0.055;
  return Math.min(maxPx, Math.max(minPx, fluidPx));
}

export function getSubtitlePreviewFontSizePx(
  containerWidth: number,
  layoutScale: number,
): number {
  return getSubtitleBaseFontSizePx(containerWidth) * layoutScale;
}

export function getSubtitleExportFontSizePx(
  layoutScale: number,
  previewContainerWidth: number = SUBTITLE_PREVIEW_REF_WIDTH,
): number {
  const previewFont = getSubtitlePreviewFontSizePx(
    previewContainerWidth,
    layoutScale,
  );
  return Math.round(
    previewFont * (EXPORT_CANVAS_WIDTH / previewContainerWidth) * EXPORT_FONT_METRICS_ADJUST,
  );
}

export function getSubtitleContainerMaxWidthPx(
  canvasWidth: number = EXPORT_CANVAS_WIDTH,
): number {
  return canvasWidth * SUBTITLE_CONTAINER_MAX_WIDTH_RATIO;
}

function measureSubtitleRowWidthPx(
  visible: { id: string; text: string }[],
  fontSize: number,
  measure?: TextWidthMeasurer,
  fontFamily?: string,
  fontWeight?: number,
): number {
  if (visible.length === 0) return 0;

  const gapPx = Math.round(fontSize * 0.22);
  const widths = visible.map((word) =>
    estimateSubtitleWordWidthPx(
      word.text,
      fontSize,
      measure,
      fontFamily,
      fontWeight,
    ),
  );

  return (
    widths.reduce((sum, width) => sum + width, 0) +
    gapPx * Math.max(0, visible.length - 1)
  );
}

export function layoutSubtitleWordsWithFit(input: {
  visible: { id: string; text: string }[];
  centerX: number;
  fontSize: number;
  strokeWidth: number;
  glowSpread: number;
  measure?: TextWidthMeasurer;
  fontFamily?: string;
  fontWeight?: number;
  maxContainerWidth?: number;
}): { fontSize: number; positions: Map<string, number> } {
  const maxWidth =
    input.maxContainerWidth ?? getSubtitleContainerMaxWidthPx();
  const edgePadding = input.strokeWidth + input.glowSpread + 4;
  const availableWidth = Math.max(1, maxWidth - edgePadding * 2);

  let fontSize = input.fontSize;
  let rowWidth = measureSubtitleRowWidthPx(
    input.visible,
    fontSize,
    input.measure,
    input.fontFamily,
    input.fontWeight,
  );

  if (rowWidth > availableWidth) {
    fontSize = Math.max(
      12,
      Math.floor(fontSize * (availableWidth / rowWidth)),
    );
  }

  const positions = layoutSubtitleWordsHorizontally(
    input.visible,
    input.centerX,
    fontSize,
    input.measure,
    input.fontFamily,
    input.fontWeight,
  );

  return { fontSize, positions };
}

export function getExportVisualScale(
  layoutScale: number,
  previewContainerWidth: number = SUBTITLE_PREVIEW_REF_WIDTH,
): number {
  return (
    getSubtitleExportFontSizePx(layoutScale, previewContainerWidth) /
    getSubtitlePreviewFontSizePx(previewContainerWidth, layoutScale)
  );
}

export function getExportStrokeWidth(
  strokeWidth: number,
  layoutScale: number,
  previewContainerWidth: number = SUBTITLE_PREVIEW_REF_WIDTH,
): number {
  return Math.max(
    1,
    Math.round(
      strokeWidth * getExportVisualScale(layoutScale, previewContainerWidth),
    ),
  );
}

export function getExportGlowSpread(
  spread: number,
  layoutScale: number,
  previewContainerWidth: number = SUBTITLE_PREVIEW_REF_WIDTH,
): number {
  return Math.max(
    0,
    Math.round(spread * getExportVisualScale(layoutScale, previewContainerWidth)),
  );
}

export function estimateSubtitleWordWidthPx(
  text: string,
  fontSize: number,
  measure?: TextWidthMeasurer,
  fontFamily?: string,
  fontWeight?: number,
): number {
  const upper = text.toUpperCase();
  if (measure && fontFamily !== undefined && fontWeight !== undefined) {
    return measure(upper, fontSize, fontFamily, fontWeight) + fontSize * 0.35;
  }
  return upper.length * fontSize * 0.52 + fontSize * 0.35;
}

export function layoutSubtitleWordsHorizontally(
  visible: { id: string; text: string }[],
  centerX: number,
  fontSize: number,
  measure?: TextWidthMeasurer,
  fontFamily?: string,
  fontWeight?: number,
): Map<string, number> {
  const gapPx = Math.round(fontSize * 0.22);
  const widths = visible.map((word) =>
    estimateSubtitleWordWidthPx(
      word.text,
      fontSize,
      measure,
      fontFamily,
      fontWeight,
    ),
  );
  const totalWidth =
    widths.reduce((sum, width) => sum + width, 0) +
    gapPx * Math.max(0, visible.length - 1);

  let cursor = centerX - totalWidth / 2;
  const positions = new Map<string, number>();

  visible.forEach((word, index) => {
    const width = widths[index];
    positions.set(word.id, Math.round(cursor + width / 2));
    cursor += width + (index < visible.length - 1 ? gapPx : 0);
  });

  return positions;
}

export function resolveSubtitleRenderStyleFromEditor(
  style: SubtitleStyle,
  layout: SubtitleLayout,
  previewContainerWidth: number = SUBTITLE_PREVIEW_REF_WIDTH,
) {
  const normalizedLayout = normalizeSubtitleLayout(layout);
  const font = getSubtitleFontOption(style.fontId);
  const fontSize = getSubtitleExportFontSizePx(
    normalizedLayout.scale,
    previewContainerWidth,
  );

  return {
    fontFamily: font.canvasFamily,
    fontWeight: font.fontWeight,
    fontSize,
    fillColor: style.fillColor,
    strokeColor: style.strokeColor,
    strokeWidth: getExportStrokeWidth(
      style.strokeWidth,
      normalizedLayout.scale,
      previewContainerWidth,
    ),
    glowColor: style.glowColor,
    glowIntensity: style.glowIntensity,
    glowSpread: getExportGlowSpread(
      style.glowSpread,
      normalizedLayout.scale,
      previewContainerWidth,
    ),
    animation: style.animation,
    centerX: Math.round(normalizedLayout.x * EXPORT_CANVAS_WIDTH),
    centerY: Math.round(normalizedLayout.y * EXPORT_CANVAS_HEIGHT),
  };
}

export function resolveSubtitleRenderStyleFromExportPayload(
  payload: {
    fontFamily: string;
    fontSize: number;
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    animation?: SubtitleStyle["animation"];
    glowColor?: string;
    glowIntensity?: number;
    glowSpread?: number;
    layoutX?: number;
    layoutY?: number;
    fontId?: string;
  },
  previewContainerWidth: number = SUBTITLE_PREVIEW_REF_WIDTH,
) {
  const font = payload.fontId
    ? getSubtitleFontOption(payload.fontId)
    : null;

  const resolutionScale = EXPORT_CANVAS_WIDTH / previewContainerWidth;

  return {
    fontFamily: font?.canvasFamily ?? payload.fontFamily,
    fontWeight: font?.fontWeight ?? 800,
    fontSize: payload.fontSize,
    fillColor: payload.fillColor,
    strokeColor: payload.strokeColor,
    strokeWidth: Math.max(1, Math.round(payload.strokeWidth * resolutionScale)),
    glowColor: payload.glowColor ?? "#CDB7FF",
    glowIntensity: payload.glowIntensity ?? 0,
    glowSpread: payload.glowSpread
      ? Math.max(0, Math.round(payload.glowSpread * resolutionScale))
      : 0,
    animation: payload.animation ?? "pop",
    centerX: Math.round((payload.layoutX ?? 0.5) * EXPORT_CANVAS_WIDTH),
    centerY: Math.round((payload.layoutY ?? 0.78) * EXPORT_CANVAS_HEIGHT),
  };
}

export function resolveTextOverlayRenderStyle(
  style: {
    fontId?: string;
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    glowColor?: string;
    glowIntensity?: number;
    glowSpread?: number;
    letterSpacing?: number;
  },
  layoutScale: number,
  previewContainerWidth: number = SUBTITLE_PREVIEW_REF_WIDTH,
) {
  const font = style.fontId
    ? getSubtitleFontOption(style.fontId)
    : getSubtitleFontOption("montserrat-extrabold");

  const resolutionScale = EXPORT_CANVAS_WIDTH / previewContainerWidth;

  return {
    fontFamily: font.canvasFamily,
    fontWeight: font.fontWeight,
    fontSize: getSubtitleExportFontSizePx(layoutScale, previewContainerWidth),
    fillColor: style.fillColor,
    strokeColor: style.strokeColor,
    strokeWidth: Math.max(1, Math.round(style.strokeWidth * resolutionScale)),
    glowColor: style.glowColor ?? "#CDB7FF",
    glowIntensity: style.glowIntensity ?? 0,
    glowSpread: style.glowSpread
      ? Math.max(0, Math.round(style.glowSpread * resolutionScale))
      : 0,
    letterSpacing: style.letterSpacing ?? 0,
  };
}
