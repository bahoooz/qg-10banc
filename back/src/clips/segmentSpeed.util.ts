/** 0 = vitesse normale. +200 = 200 % plus rapide (×3). -200 = 200 % plus lent (×⅓). */
export const DEFAULT_SEGMENT_SPEED = 0;
export const MIN_SEGMENT_SPEED = -200;
export const MAX_SEGMENT_SPEED = 200;

export function clampSegmentSpeed(speed: number | undefined): number {
  if (speed === undefined) return DEFAULT_SEGMENT_SPEED;
  if (speed === 250) return DEFAULT_SEGMENT_SPEED;
  if (!Number.isFinite(speed)) return DEFAULT_SEGMENT_SPEED;
  return Math.max(MIN_SEGMENT_SPEED, Math.min(MAX_SEGMENT_SPEED, speed));
}

export function getPlaybackRateForSpeed(speedValue: number): number {
  const value = clampSegmentSpeed(speedValue);
  if (value >= 0) {
    return 1 + value / 100;
  }
  return 1 / (1 + Math.abs(value) / 100);
}

export function getSequenceDurationForSourceDuration(
  sourceDuration: number,
  speedValue: number,
): number {
  const rate = getPlaybackRateForSpeed(speedValue);
  return sourceDuration / rate;
}

export function sourceOffsetToSequenceOffset(
  sourceOffset: number,
  speedValue: number,
): number {
  return sourceOffset / getPlaybackRateForSpeed(speedValue);
}

export function sequenceOffsetToSourceOffset(
  sequenceOffset: number,
  speedValue: number,
): number {
  return sequenceOffset * getPlaybackRateForSpeed(speedValue);
}
