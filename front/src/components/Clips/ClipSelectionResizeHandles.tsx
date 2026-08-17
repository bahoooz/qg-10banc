import type { PointerEvent as ReactPointerEvent } from "react";
import {
  CLIP_SELECTION_HANDLE_CLASS,
  getSelectionResizeCursor,
  type SelectionResizeCorner,
} from "../../lib/clipSelectionUi";

const CORNERS: SelectionResizeCorner[] = ["nw", "ne", "sw", "se"];

const CORNER_POSITION: Record<
  SelectionResizeCorner,
  { className: string; label: string }
> = {
  nw: {
    className: "-left-1.5 -top-1.5",
    label: "Redimensionner coin haut-gauche",
  },
  ne: {
    className: "-right-1.5 -top-1.5",
    label: "Redimensionner coin haut-droit",
  },
  sw: {
    className: "-bottom-1.5 -left-1.5",
    label: "Redimensionner coin bas-gauche",
  },
  se: {
    className: "-bottom-1.5 -right-1.5",
    label: "Redimensionner coin bas-droit",
  },
};

type ClipSelectionResizeHandlesProps = {
  onResizePointerDown: (
    corner: SelectionResizeCorner,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => void;
  dataAttribute?: string;
};

export default function ClipSelectionResizeHandles({
  onResizePointerDown,
  dataAttribute = "data-selection-resize",
}: ClipSelectionResizeHandlesProps) {
  return (
    <>
      {CORNERS.map((corner) => (
        <div
          key={corner}
          role="presentation"
          {...{ [dataAttribute]: corner }}
          onPointerDown={(event) => onResizePointerDown(corner, event)}
          className={`${CLIP_SELECTION_HANDLE_CLASS} ${CORNER_POSITION[corner].className} ${getSelectionResizeCursor(corner)}`}
          aria-label={CORNER_POSITION[corner].label}
        />
      ))}
    </>
  );
}

export function isSelectionResizeTarget(
  target: EventTarget | null,
  attribute = "data-selection-resize",
): boolean {
  return Boolean(
    target &&
      (target as HTMLElement).closest?.(`[${attribute}]`),
  );
}
