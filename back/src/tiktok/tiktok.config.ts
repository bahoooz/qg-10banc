export const TIKTOK_CONFIG = {
  CLIENT_KEY: process.env.TIKTOK_CLIENT_KEY!,
  CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET!,
  REDIRECT_URI: process.env.TIKTOK_REDIRECT_URI!,
  SCOPES: process.env.TIKTOK_SCOPES!,

  // URLs de l'API TikTok V2
  ENDPOINTS: {
    AUTH: "https://www.tiktok.com/v2/auth/authorize/",
    TOKEN: "https://open.tiktokapis.com/v2/oauth/token/",
    USER_INFO: "https://open.tiktokapis.com/v2/user/info/",
    VIDEO_INIT: "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
    CREATOR_INFO: "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
    VIDEO_PUBLISH_INIT: "https://open.tiktokapis.com/v2/post/publish/video/init/",
  },
};

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
