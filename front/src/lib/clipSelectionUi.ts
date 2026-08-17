export type SelectionResizeCorner = "nw" | "ne" | "sw" | "se";

export const CLIP_SELECTION_FRAME_CLASS =
  "border-2 border-[#b8dcc8]/80 bg-[#b8dcc8]/10";

export const CLIP_SELECTION_RING_CLASS = "ring-2 ring-[#b8dcc8]/75";

export const CLIP_SELECTION_HANDLE_CLASS =
  "absolute z-30 size-3.5 rounded-sm border-2 border-background bg-[#b8dcc8] shadow-md touch-none";

export function getSelectionResizeCursor(corner: SelectionResizeCorner): string {
  return corner === "nw" || corner === "se"
    ? "cursor-nwse-resize"
    : "cursor-nesw-resize";
}

export function getOutwardResizeDelta(
  corner: SelectionResizeCorner,
  deltaX: number,
  deltaY: number,
): number {
  const signedX = corner.includes("e") ? deltaX : -deltaX;
  const signedY = corner.includes("s") ? deltaY : -deltaY;
  return Math.max(signedX, signedY);
}

export type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function resizeNormalizedRect(
  start: NormalizedRect,
  corner: SelectionResizeCorner,
  deltaX: number,
  deltaY: number,
  minSize = 0.04,
): NormalizedRect {
  let { x, y, width, height } = start;

  if (corner.includes("e")) {
    width = Math.max(minSize, width + deltaX);
  } else {
    const nextWidth = Math.max(minSize, width - deltaX);
    x += width - nextWidth;
    width = nextWidth;
  }

  if (corner.includes("s")) {
    height = Math.max(minSize, height + deltaY);
  } else {
    const nextHeight = Math.max(minSize, height - deltaY);
    y += height - nextHeight;
    height = nextHeight;
  }

  return { x, y, width, height };
}

export function resizeNormalizedRectUniform(
  start: NormalizedRect,
  corner: SelectionResizeCorner,
  deltaX: number,
  deltaY: number,
  heightPerWidth: number,
  minWidth = 0.04,
): NormalizedRect {
  const delta = getOutwardResizeDelta(corner, deltaX, deltaY);
  const width = Math.max(minWidth, start.width + delta);
  const height = width * heightPerWidth;

  let x = start.x;
  let y = start.y;

  if (!corner.includes("e")) {
    x = start.x + (start.width - width);
  }
  if (!corner.includes("s")) {
    y = start.y + (start.height - height);
  }

  return { x, y, width, height };
}

export function resizePixelRect(
  start: { x: number; y: number; width: number; height: number },
  corner: SelectionResizeCorner,
  deltaX: number,
  deltaY: number,
  minSize = 24,
): { x: number; y: number; width: number; height: number } {
  let { x, y, width, height } = start;

  if (corner.includes("e")) {
    width = Math.max(minSize, width + deltaX);
  } else {
    const nextWidth = Math.max(minSize, width - deltaX);
    x += width - nextWidth;
    width = nextWidth;
  }

  if (corner.includes("s")) {
    height = Math.max(minSize, height + deltaY);
  } else {
    const nextHeight = Math.max(minSize, height - deltaY);
    y += height - nextHeight;
    height = nextHeight;
  }

  return { x, y, width, height };
}
