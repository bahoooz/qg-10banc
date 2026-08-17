import type { SubtitleTiming, SubtitleWord } from "./types.js";

export function applySubtitleTimingToWord(
  word: SubtitleWord,
  timing: SubtitleTiming,
): SubtitleWord {
  const offsetSec = timing.syncOffsetMs / 1000;
  const leadSec = timing.anticipationMs / 1000;
  const start = Math.max(0, word.start - leadSec + offsetSec);
  const end = Math.max(start + 0.05, word.end + offsetSec);
  return { ...word, start, end };
}

export function applySubtitleTimingToWords(
  words: SubtitleWord[],
  timing: SubtitleTiming,
): SubtitleWord[] {
  return words.map((word) => applySubtitleTimingToWord(word, timing));
}
