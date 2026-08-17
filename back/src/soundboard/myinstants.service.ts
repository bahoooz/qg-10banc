import type { SoundboardClipDto } from "./soundboard.types.js";

const MYINSTANTS_ORIGIN = "https://www.myinstants.com";
const SHARE_BUTTON_REGEX =
  /share\('((?:\\'|[^'])*)',\s*'[^']*',\s*'(\/media\/sounds\/[^']+)'/g;

/** Requêtes utilisées pour remplir le catalogue par défaut (sons TikTok / stream). */
export const MYINSTANTS_TRENDING_QUERIES = [
  "vine boom",
  "bruh",
  "meme",
  "tiktok",
  "rizz",
  "skibidi",
  "discord",
  "fail",
  "sigma",
  "gyatt",
  "emotional damage",
  "metal pipe",
  "fart",
  "sus",
  "oh no no",
  "airhorn",
  "notification",
  "gunshot",
  "laugh",
  "wow",
] as const;

function decodeJsString(value: string): string {
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

function inferCategory(name: string, query: string): string {
  const haystack = `${name} ${query}`.toLowerCase();
  if (/discord|game|gaming|minecraft|valorant|fortnite|gta/.test(haystack)) {
    return "gaming";
  }
  if (/fail|bruh|vine|meme|rizz|skibidi|sigma|gyatt|sus|tiktok/.test(haystack)) {
    return "meme";
  }
  if (/laugh|wow|clap|applause|sad|cricket|awkward/.test(haystack)) {
    return "reaction";
  }
  return "trending";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function parseMyInstantsHtml(
  html: string,
  query: string,
): SoundboardClipDto[] {
  const seenSrc = new Set<string>();
  const clips: SoundboardClipDto[] = [];

  for (const match of html.matchAll(SHARE_BUTTON_REGEX)) {
    const name = decodeJsString(match[1]).trim();
    const mediaPath = match[2];
    if (!name || !mediaPath) continue;

    const src = `${MYINSTANTS_ORIGIN}${mediaPath}`;
    if (seenSrc.has(src)) continue;
    seenSrc.add(src);

    const slug = slugify(name);
    clips.push({
      id: `mi-${slug}-${seenSrc.size}`,
      name,
      src,
      tags: query
        .split(/\s+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      category: inferCategory(name, query),
      source: "myinstants",
    });
  }

  return clips;
}

async function fetchMyInstantsSearchHtml(query: string): Promise<string> {
  const url = `${MYINSTANTS_ORIGIN}/en/search/?name=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "QG-10banc/1.0 (clip-editor soundboard)",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`MyInstants search failed (${response.status})`);
  }

  return response.text();
}

export async function searchMyInstantsClips(
  query: string,
  limit: number,
): Promise<SoundboardClipDto[]> {
  const html = await fetchMyInstantsSearchHtml(query);
  return parseMyInstantsHtml(html, query).slice(0, limit);
}

export async function fetchMyInstantsTrendingClips(
  limit: number,
): Promise<SoundboardClipDto[]> {
  const perQuery = Math.max(8, Math.ceil(limit / MYINSTANTS_TRENDING_QUERIES.length));
  const batches = await Promise.all(
    MYINSTANTS_TRENDING_QUERIES.map(async (query) => {
      try {
        return await searchMyInstantsClips(query, perQuery);
      } catch (error) {
        console.warn(`[soundboard] MyInstants « ${query} » ignoré:`, error);
        return [] as SoundboardClipDto[];
      }
    }),
  );

  const seenSrc = new Set<string>();
  const merged: SoundboardClipDto[] = [];

  for (const batch of batches) {
    for (const clip of batch) {
      if (seenSrc.has(clip.src)) continue;
      seenSrc.add(clip.src);
      merged.push(clip);
      if (merged.length >= limit) return merged;
    }
  }

  return merged;
}
