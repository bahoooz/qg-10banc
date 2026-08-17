import { sequenceTimeToSourceTime, sourceTimeToSequenceTime, type TimeRange } from "./clipTime";
import {
  createImageOverlayId,
  imageOverlayUsesSequenceTime,
  MIN_IMAGE_OVERLAY_DURATION,
  type ImageOverlay,
} from "./clipImageOverlays";
import {
  createSoundboardId,
  MIN_SOUNDBOARD_DURATION,
  type SoundboardClip,
} from "./clipSoundboards";
import {
  createTextOverlayId,
  MIN_TEXT_OVERLAY_DURATION,
  type TextOverlay,
} from "./clipTextOverlays";
import {
  createZoomEffectId,
  MIN_ZOOM_EFFECT_DURATION,
  type ZoomEffect,
} from "./clipZoomEffects";

const CUT_GAP = 0.25;

function canCutInRange(
  start: number,
  end: number,
  cut: number,
  minDuration: number,
): boolean {
  return (
    cut > start + CUT_GAP &&
    cut < end - CUT_GAP &&
    cut - start >= minDuration &&
    end - cut >= minDuration
  );
}

function replaceItem<T extends { id: string }>(
  items: T[],
  itemId: string,
  first: T,
  second: T,
): T[] {
  const index = items.findIndex((item) => item.id === itemId);
  if (index === -1) return items;
  const next = [...items];
  next.splice(index, 1, first, second);
  return next.sort((a, b) => {
    const aStart = "start" in a ? (a.start as number) : 0;
    const bStart = "start" in b ? (b.start as number) : 0;
    return aStart - bStart;
  });
}

export function splitZoomEffectAtPlayhead(
  effects: ZoomEffect[],
  effectId: string,
  sequencePlayhead: number,
  keepSegments: TimeRange[],
): ZoomEffect[] | null {
  const effect = effects.find((item) => item.id === effectId);
  if (!effect) return null;

  if (effect.usesSequenceTime) {
    if (
      !canCutInRange(
        effect.start,
        effect.end,
        sequencePlayhead,
        MIN_ZOOM_EFFECT_DURATION,
      )
    ) {
      return null;
    }
    return replaceItem(
      effects,
      effectId,
      { ...effect, end: sequencePlayhead },
      {
        ...effect,
        id: createZoomEffectId(sequencePlayhead),
        start: sequencePlayhead,
      },
    );
  }

  const seqStart = sourceTimeToSequenceTime(effect.start, keepSegments);
  const seqEnd = sourceTimeToSequenceTime(effect.end, keepSegments);
  if (
    !canCutInRange(
      seqStart,
      seqEnd,
      sequencePlayhead,
      MIN_ZOOM_EFFECT_DURATION,
    )
  ) {
    return null;
  }

  const sourceCut = sequenceTimeToSourceTime(sequencePlayhead, keepSegments);
  return replaceItem(
    effects,
    effectId,
    { ...effect, end: sourceCut },
    {
      ...effect,
      id: createZoomEffectId(sourceCut),
      start: sourceCut,
    },
  );
}

export function splitImageOverlayAtPlayhead(
  overlays: ImageOverlay[],
  overlayId: string,
  sequencePlayhead: number,
  keepSegments: TimeRange[],
): ImageOverlay[] | null {
  const overlay = overlays.find((item) => item.id === overlayId);
  if (!overlay) return null;

  if (imageOverlayUsesSequenceTime(overlay)) {
    if (
      !canCutInRange(
        overlay.start,
        overlay.end,
        sequencePlayhead,
        MIN_IMAGE_OVERLAY_DURATION,
      )
    ) {
      return null;
    }
    return replaceItem(
      overlays,
      overlayId,
      { ...overlay, end: sequencePlayhead, usesSequenceTime: true },
      {
        ...overlay,
        id: createImageOverlayId(sequencePlayhead),
        start: sequencePlayhead,
        usesSequenceTime: true,
      },
    );
  }

  const seqStart = sourceTimeToSequenceTime(overlay.start, keepSegments);
  const seqEnd = sourceTimeToSequenceTime(overlay.end, keepSegments);
  if (
    !canCutInRange(
      seqStart,
      seqEnd,
      sequencePlayhead,
      MIN_IMAGE_OVERLAY_DURATION,
    )
  ) {
    return null;
  }

  const sourceCut = sequenceTimeToSourceTime(sequencePlayhead, keepSegments);
  return replaceItem(
    overlays,
    overlayId,
    { ...overlay, end: sourceCut },
    {
      ...overlay,
      id: createImageOverlayId(sourceCut),
      start: sourceCut,
    },
  );
}

export function splitTextOverlayAtPlayhead(
  overlays: TextOverlay[],
  overlayId: string,
  sequencePlayhead: number,
  keepSegments: TimeRange[],
): TextOverlay[] | null {
  const overlay = overlays.find((item) => item.id === overlayId);
  if (!overlay) return null;

  if (overlay.usesSequenceTime) {
    if (
      !canCutInRange(
        overlay.start,
        overlay.end,
        sequencePlayhead,
        MIN_TEXT_OVERLAY_DURATION,
      )
    ) {
      return null;
    }
    return replaceItem(
      overlays,
      overlayId,
      { ...overlay, end: sequencePlayhead, usesSequenceTime: true },
      {
        ...overlay,
        id: createTextOverlayId(sequencePlayhead),
        start: sequencePlayhead,
        usesSequenceTime: true,
      },
    );
  }

  const seqStart = sourceTimeToSequenceTime(overlay.start, keepSegments);
  const seqEnd = sourceTimeToSequenceTime(overlay.end, keepSegments);
  if (
    !canCutInRange(
      seqStart,
      seqEnd,
      sequencePlayhead,
      MIN_TEXT_OVERLAY_DURATION,
    )
  ) {
    return null;
  }

  const sourceCut = sequenceTimeToSourceTime(sequencePlayhead, keepSegments);
  return replaceItem(
    overlays,
    overlayId,
    { ...overlay, end: sourceCut },
    {
      ...overlay,
      id: createTextOverlayId(sourceCut),
      start: sourceCut,
    },
  );
}

export function splitSoundboardAtPlayhead(
  clips: SoundboardClip[],
  clipId: string,
  sequencePlayhead: number,
  keepSegments: TimeRange[],
): SoundboardClip[] | null {
  const clip = clips.find((item) => item.id === clipId);
  if (!clip) return null;

  if (clip.usesSequenceTime) {
    if (
      !canCutInRange(
        clip.start,
        clip.end,
        sequencePlayhead,
        MIN_SOUNDBOARD_DURATION,
      )
    ) {
      return null;
    }
    return replaceItem(
      clips,
      clipId,
      { ...clip, end: sequencePlayhead, usesSequenceTime: true },
      {
        ...clip,
        id: createSoundboardId(sequencePlayhead),
        start: sequencePlayhead,
        usesSequenceTime: true,
      },
    );
  }

  const seqStart = sourceTimeToSequenceTime(clip.start, keepSegments);
  const seqEnd = sourceTimeToSequenceTime(clip.end, keepSegments);
  if (
    !canCutInRange(
      seqStart,
      seqEnd,
      sequencePlayhead,
      MIN_SOUNDBOARD_DURATION,
    )
  ) {
    return null;
  }

  const sourceCut = sequenceTimeToSourceTime(sequencePlayhead, keepSegments);
  return replaceItem(
    clips,
    clipId,
    { ...clip, end: sourceCut },
    {
      ...clip,
      id: createSoundboardId(sourceCut),
      start: sourceCut,
    },
  );
}

export function findZoomEffectIdAtPlayhead(
  effects: ZoomEffect[],
  sequencePlayhead: number,
  sourceTime: number,
): string | null {
  const seqMatch = effects.find(
    (effect) =>
      effect.usesSequenceTime &&
      sequencePlayhead >= effect.start &&
      sequencePlayhead < effect.end,
  );
  if (seqMatch) return seqMatch.id;

  const sourceMatch = effects.find(
    (effect) =>
      !effect.usesSequenceTime &&
      sourceTime >= effect.start &&
      sourceTime < effect.end,
  );
  return sourceMatch?.id ?? null;
}

export function findImageOverlayIdAtPlayhead(
  overlays: ImageOverlay[],
  sequencePlayhead: number,
  sourceTime: number,
): string | null {
  const seqMatch = overlays.find(
    (overlay) =>
      imageOverlayUsesSequenceTime(overlay) &&
      sequencePlayhead >= overlay.start &&
      sequencePlayhead < overlay.end,
  );
  if (seqMatch) return seqMatch.id;

  const sourceMatch = overlays.find(
    (overlay) =>
      !imageOverlayUsesSequenceTime(overlay) &&
      sourceTime >= overlay.start &&
      sourceTime < overlay.end,
  );
  return sourceMatch?.id ?? null;
}

export function findTextOverlayIdAtPlayhead(
  overlays: TextOverlay[],
  sequencePlayhead: number,
  sourceTime: number,
): string | null {
  const seqMatch = overlays.find(
    (overlay) =>
      overlay.usesSequenceTime &&
      sequencePlayhead >= overlay.start &&
      sequencePlayhead < overlay.end,
  );
  if (seqMatch) return seqMatch.id;

  const sourceMatch = overlays.find(
    (overlay) =>
      !overlay.usesSequenceTime &&
      sourceTime >= overlay.start &&
      sourceTime < overlay.end,
  );
  return sourceMatch?.id ?? null;
}

export function findSoundboardIdAtPlayhead(
  clips: SoundboardClip[],
  sequencePlayhead: number,
  sourceTime: number,
): string | null {
  const seqMatch = clips.find(
    (clip) =>
      clip.usesSequenceTime &&
      sequencePlayhead >= clip.start &&
      sequencePlayhead < clip.end,
  );
  if (seqMatch) return seqMatch.id;

  const sourceMatch = clips.find(
    (clip) =>
      !clip.usesSequenceTime &&
      sourceTime >= clip.start &&
      sourceTime < clip.end,
  );
  return sourceMatch?.id ?? null;
}
