import type { SoundboardClipDto } from "./soundboard.types.js";

const VOICY_API_BASE = "https://api.voicy.network";

type VoicyClip = {
  id?: string | null;
  name?: string | null;
  sound?: string | null;
  tags?: string[] | null;
};

type VoicyClipsResponse = {
  error?: boolean;
  errorMessage?: string | null;
  clips?: VoicyClip[] | null;
};

export function getVoicyApiKey(): string | undefined {
  const key = process.env.VOICY_API_KEY?.trim();
  return key || undefined;
}

function mapVoicyClip(clip: VoicyClip): SoundboardClipDto | null {
  const id = clip.id?.trim();
  const name = clip.name?.trim();
  const src = clip.sound?.trim();
  if (!id || !name || !src) return null;

  return {
    id: `voicy-${id}`,
    name,
    src,
    tags: clip.tags?.filter(Boolean) ?? [],
    category: "meme",
    source: "voicy",
  };
}

export async function searchVoicyClips(
  query: string,
  limit: number,
  apiKey: string,
): Promise<SoundboardClipDto[]> {
  const params = new URLSearchParams({
    search: query,
    quantity: String(Math.min(Math.max(limit, 1), 50)),
    index: "0",
    rating: "0",
  });

  const response = await fetch(`${VOICY_API_BASE}/v1/clips?${params}`, {
    headers: {
      "X-API-KEY": apiKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Voicy search failed (${response.status})`);
  }

  const payload = (await response.json()) as VoicyClipsResponse;
  if (payload.error) {
    throw new Error(payload.errorMessage ?? "Voicy search error");
  }

  return (payload.clips ?? [])
    .map(mapVoicyClip)
    .filter((clip): clip is SoundboardClipDto => clip !== null);
}
