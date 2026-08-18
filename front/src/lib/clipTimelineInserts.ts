import {
  buildPackedSegments,
  getEditedDuration,
  sequenceTimeToSourceTime,
  sourceTimeToSequenceTime,
  type PackedSegment,
  type TimeRange,
} from "./clipTime";
import {
  getTimelineVideoSequenceDuration,
  type TimelineVideoClip,
} from "./clipTimelineVideos";

export const MEME_MAX_DURATION_SEC = 20;

export type TimelineVideoImportKind = "meme" | "clip";

export type TimelineInsert = {
  /** Point de cut sur la timeline compactée (sans les memes). */
  naturalStart: number;
  duration: number;
  /** Début réel du meme sur la timeline étendue. */
  actualStart: number;
};

function getMemeNaturalInsertStart(
  clip: TimelineVideoClip,
  timelineVideos: TimelineVideoClip[],
): number {
  if (clip.naturalInsertStart !== undefined) {
    return clip.naturalInsertStart;
  }

  const memes = timelineVideos
    .filter((item) => item.importKind === "meme")
    .sort((a, b) => a.sequenceStart - b.sequenceStart);

  let priorInsertDuration = 0;
  for (const meme of memes) {
    if (meme.id === clip.id) {
      return clip.sequenceStart - priorInsertDuration;
    }
    priorInsertDuration += getTimelineVideoSequenceDuration(meme);
  }

  return clip.sequenceStart;
}

export function getTimelineInserts(
  timelineVideos: TimelineVideoClip[],
): TimelineInsert[] {
  return timelineVideos
    .filter((clip) => clip.importKind === "meme")
    .sort((a, b) => {
      const naturalA = getMemeNaturalInsertStart(a, timelineVideos);
      const naturalB = getMemeNaturalInsertStart(b, timelineVideos);
      return naturalA - naturalB || a.sequenceStart - b.sequenceStart;
    })
    .map((clip) => ({
      naturalStart: getMemeNaturalInsertStart(clip, timelineVideos),
      duration: getTimelineVideoSequenceDuration(clip),
      actualStart: clip.sequenceStart,
    }));
}

function sumInsertDurationBefore(
  naturalTime: number,
  inserts: TimelineInsert[],
  inclusive: boolean,
): number {
  let offset = 0;

  for (const insert of inserts) {
    const crossesCut = inclusive
      ? naturalTime >= insert.naturalStart - 0.001
      : naturalTime > insert.naturalStart + 0.001;

    if (crossesCut) {
      offset += insert.duration;
    }
  }

  return offset;
}

/** Fin de segment / fin de partie base — le cut n’ajoute pas encore la durée du meme. */
export function naturalToActualBeforeInsert(
  naturalTime: number,
  inserts: TimelineInsert[],
): number {
  return naturalTime + sumInsertDurationBefore(naturalTime, inserts, false);
}

/** Début de segment après cut — la durée du meme est déjà comptée. */
export function naturalToActualAfterInsert(
  naturalTime: number,
  inserts: TimelineInsert[],
): number {
  return naturalTime + sumInsertDurationBefore(naturalTime, inserts, true);
}

/** Temps séquence réel → temps séquence « naturel » (base compactée sans les inserts). */
export function actualSequenceToNatural(
  actualTime: number,
  inserts: TimelineInsert[],
): number | null {
  let natural = actualTime;

  for (const insert of inserts) {
    const insertEnd = insert.actualStart + insert.duration;
    if (
      actualTime >= insert.actualStart - 0.001 &&
      actualTime < insertEnd - 0.001
    ) {
      return null;
    }
    if (actualTime >= insertEnd - 0.001) {
      natural -= insert.duration;
    }
  }

  return Math.max(0, natural);
}

/** @deprecated Préférer naturalToActualBeforeInsert / naturalToActualAfterInsert */
export function naturalSequenceToActual(
  naturalTime: number,
  inserts: TimelineInsert[],
): number {
  return naturalToActualBeforeInsert(naturalTime, inserts);
}

export function buildPackedSegmentsWithInserts(
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
): PackedSegment[] {
  const packed = buildPackedSegments(keepSegments);
  const inserts = getTimelineInserts(timelineVideos);

  return packed.map((segment) => ({
    ...segment,
    sequenceStart: naturalToActualAfterInsert(segment.sequenceStart, inserts),
    sequenceEnd: naturalToActualBeforeInsert(segment.sequenceEnd, inserts),
  }));
}

export function sequenceTimeToSourceTimeWithInserts(
  actualSequenceTime: number,
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
): number | null {
  const natural = actualSequenceToNatural(
    actualSequenceTime,
    getTimelineInserts(timelineVideos),
  );
  if (natural === null) return null;
  return sequenceTimeToSourceTime(natural, keepSegments);
}

export function sourceTimeToActualSequenceTime(
  sourceTime: number,
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
): number {
  const natural = sourceTimeToSequenceTime(sourceTime, keepSegments);
  return naturalToActualAfterInsert(
    natural,
    getTimelineInserts(timelineVideos),
  );
}

/** Temps stocké (source ou séquence) → position réelle sur la timeline (avec memes). */
export function storedTimeToActualSequence(
  time: number,
  usesSequenceTime: boolean,
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
): number {
  if (usesSequenceTime) return time;
  return sourceTimeToActualSequenceTime(time, keepSegments, timelineVideos);
}

export function getNaturalBaseDuration(keepSegments: TimeRange[]): number {
  return getEditedDuration(keepSegments);
}

export function getActualBaseEndSequence(
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
): number {
  return naturalToActualBeforeInsert(
    getNaturalBaseDuration(keepSegments),
    getTimelineInserts(timelineVideos),
  );
}

export function shiftSequenceTimedRange<T extends { start: number; end: number }>(
  item: T,
  afterActual: number,
  offset: number,
): T {
  if (item.start >= afterActual - 0.001) {
    return {
      ...item,
      start: item.start + offset,
      end: item.end + offset,
    };
  }
  return item;
}

export function findInsertAtNaturalCut(
  sourceTime: number,
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
): TimelineVideoClip | null {
  for (const clip of timelineVideos) {
    if (clip.importKind !== "meme") continue;
    const naturalStart = getMemeNaturalInsertStart(clip, timelineVideos);
    const cutSource = sequenceTimeToSourceTime(naturalStart, keepSegments);
    if (Math.abs(cutSource - sourceTime) < 0.1) {
      return clip;
    }
  }
  return null;
}
