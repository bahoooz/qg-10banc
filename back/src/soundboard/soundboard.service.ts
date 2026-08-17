import {
  fetchMyInstantsTrendingClips,
  searchMyInstantsClips,
} from "./myinstants.service.js";
import { getVoicyApiKey, searchVoicyClips } from "./voicy.service.js";
import type {
  SoundboardClipDto,
  SoundboardSearchResponse,
} from "./soundboard.types.js";

function mergeClips(
  batches: SoundboardClipDto[],
  limit: number,
): SoundboardClipDto[] {
  const seenSrc = new Set<string>();
  const merged: SoundboardClipDto[] = [];

  for (const clip of batches) {
    if (seenSrc.has(clip.src)) continue;
    seenSrc.add(clip.src);
    merged.push(clip);
    if (merged.length >= limit) break;
  }

  return merged;
}

export async function searchSoundboardLibrary(
  query: string,
  limit: number,
): Promise<SoundboardSearchResponse> {
  const normalized = query.trim();
  const voicyKey = getVoicyApiKey();

  if (voicyKey && normalized) {
    try {
      const voicyClips = await searchVoicyClips(normalized, limit, voicyKey);
      if (voicyClips.length >= limit) {
        return { clips: voicyClips.slice(0, limit), source: "voicy" };
      }

      const myInstantsClips = await searchMyInstantsClips(normalized, limit);
      const clips = mergeClips([...voicyClips, ...myInstantsClips], limit);
      return { clips, source: "mixed" };
    } catch (error) {
      console.warn("[soundboard] Voicy indisponible, fallback MyInstants:", error);
    }
  }

  const clips = normalized
    ? await searchMyInstantsClips(normalized, limit)
    : await fetchMyInstantsTrendingClips(limit);

  return { clips, source: "myinstants" };
}
