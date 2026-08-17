import { MAX_WORDS_ON_SCREEN } from "./constants.js";
import type { SequenceSubtitleWord } from "./types.js";

/** Écart max entre deux mots pour les afficher ensemble (même rafale). */
const MAX_PHRASE_GAP_SEC = 0.35;

function shouldPairWithActiveWord(
  previousWord: SequenceSubtitleWord,
  activeWord: SequenceSubtitleWord,
  sequenceTime: number,
): boolean {
  if (sequenceTime < previousWord.sequenceEnd) {
    return true;
  }

  const gapSec = activeWord.sequenceStart - previousWord.sequenceEnd;
  return gapSec < MAX_PHRASE_GAP_SEC;
}

/** Retourne jusqu'à 2 mots visibles à un instant (temps séquence). */
export function getVisibleWordsAtSequenceTime(
  words: SequenceSubtitleWord[],
  sequenceTime: number,
  maxWords: number = MAX_WORDS_ON_SCREEN,
): SequenceSubtitleWord[] {
  if (words.length === 0) return [];

  const activeIndex = words.findIndex(
    (word) =>
      sequenceTime >= word.sequenceStart && sequenceTime < word.sequenceEnd,
  );

  if (activeIndex >= 0) {
    const visible: SequenceSubtitleWord[] = [words[activeIndex]];

    for (
      let index = activeIndex - 1;
      index >= Math.max(0, activeIndex - maxWords + 1);
      index -= 1
    ) {
      const previousWord = words[index];
      const nextWord = words[index + 1];

      if (shouldPairWithActiveWord(previousWord, nextWord, sequenceTime)) {
        visible.unshift(previousWord);
      }
    }

    return visible;
  }

  // Silence entre deux phrases : écran vide.
  return [];
}
