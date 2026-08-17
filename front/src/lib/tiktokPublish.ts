export type TikTokPrivacyLevel =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWER_OF_CREATOR"
  | "SELF_ONLY";

export type TikTokCreatorInfo = {
  creatorAvatarUrl: string;
  creatorUsername: string;
  creatorNickname: string;
  privacyLevelOptions: TikTokPrivacyLevel[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number;
};

export type TikTokPublishDraft = {
  title: string;
  privacyLevel: TikTokPrivacyLevel | "";
  coverTimestampMs: number;
  coverPreviewUrl: string | null;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
};

export const TIKTOK_PRIVACY_LABELS: Record<TikTokPrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: "Tout le monde",
  MUTUAL_FOLLOW_FRIENDS: "Amis mutuels",
  FOLLOWER_OF_CREATOR: "Abonnés",
  SELF_ONLY: "Moi uniquement",
};

export function createDefaultTikTokPublishDraft(): TikTokPublishDraft {
  return {
    title: "",
    privacyLevel: "",
    coverTimestampMs: 0,
    coverPreviewUrl: null,
    disableComment: false,
    disableDuet: false,
    disableStitch: false,
  };
}

export function buildAccountSelectionKey(platform: string, id: string): string {
  return `${platform}:${id}`;
}
