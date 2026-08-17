export type YouTubePrivacyStatus = "public" | "unlisted" | "private";

export type YouTubeCategoryId =
  | "1"
  | "2"
  | "10"
  | "15"
  | "17"
  | "19"
  | "20"
  | "22"
  | "23"
  | "24"
  | "25"
  | "26"
  | "27"
  | "28";

export type YouTubePublishDraft = {
  title: string;
  description: string;
  privacyStatus: YouTubePrivacyStatus | "";
  categoryId: YouTubeCategoryId;
  tags: string;
  selfDeclaredMadeForKids: boolean;
  includeShortsTag: boolean;
};

export const YOUTUBE_PRIVACY_LABELS: Record<YouTubePrivacyStatus, string> = {
  public: "Public",
  unlisted: "Non répertorié",
  private: "Privé",
};

export const YOUTUBE_CATEGORIES: {
  id: YouTubeCategoryId;
  label: string;
}[] = [
  { id: "22", label: "People & Blogs" },
  { id: "24", label: "Divertissement" },
  { id: "20", label: "Gaming" },
  { id: "23", label: "Comédie" },
  { id: "17", label: "Sports" },
  { id: "25", label: "Actualités & Politique" },
  { id: "26", label: "Howto & Style" },
  { id: "27", label: "Éducation" },
  { id: "28", label: "Science & Tech" },
  { id: "10", label: "Musique" },
  { id: "1", label: "Film & Animation" },
  { id: "2", label: "Autos & Vehicles" },
  { id: "15", label: "Animaux" },
  { id: "19", label: "Voyage & Events" },
];

export const YOUTUBE_SHORTS_MAX_DURATION_SEC = 180;

export function createDefaultYouTubePublishDraft(): YouTubePublishDraft {
  return {
    title: "",
    description: "",
    privacyStatus: "",
    categoryId: "22",
    tags: "",
    selfDeclaredMadeForKids: false,
    includeShortsTag: true,
  };
}

export function parseYouTubeTags(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 15);
}

export type YouTubePublishPayload = {
  accountId: string;
  videoUrl: string;
  title: string;
  description: string;
  privacyStatus: YouTubePrivacyStatus;
  categoryId: string;
  tags?: string[];
  selfDeclaredMadeForKids: boolean;
  includeShortsTag: boolean;
};

export type YouTubePublishResult = {
  videoId: string;
  watchUrl: string;
  shortsUrl: string;
  privacyStatus: string;
  channelTitle: string | null;
};

export function buildYouTubePublishPayload(
  accountId: string,
  videoUrl: string,
  draft: YouTubePublishDraft,
): YouTubePublishPayload | null {
  if (!draft.title.trim() || !draft.privacyStatus) return null;

  const tags = parseYouTubeTags(draft.tags);

  return {
    accountId,
    videoUrl,
    title: draft.title.trim(),
    description: draft.description.trim(),
    privacyStatus: draft.privacyStatus,
    categoryId: draft.categoryId,
    ...(tags.length > 0 ? { tags } : {}),
    selfDeclaredMadeForKids: draft.selfDeclaredMadeForKids,
    includeShortsTag: draft.includeShortsTag,
  };
}
