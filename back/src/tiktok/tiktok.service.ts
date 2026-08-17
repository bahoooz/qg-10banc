import qs from "querystring";
import { saveInitialOAuthTokens } from "../lib/tiktokAuth.js";
import { TIKTOK_CONFIG } from "./tiktok.config.js";
import type { TikTokCreatorInfo, TikTokPrivacyLevel } from "./tiktok.config.js";

export const uploadDraftFromUrlService = async ({
  accessToken,
  video_url,
}: {
  accessToken: string;
  video_url: string;
}) => {
  const res = await fetch(TIKTOK_CONFIG.ENDPOINTS.VIDEO_INIT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      Accept: "application/json",
    },
    body: JSON.stringify({
      source_info: {
        source: "PULL_FROM_URL",
        video_url,
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("TikTok draft init error:", data);
    throw new Error(data.error?.message || JSON.stringify(data));
  }

  return data;
};

export const startTiktokLoginService = async () => {
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_key: TIKTOK_CONFIG.CLIENT_KEY,
    scope: TIKTOK_CONFIG.SCOPES,
    response_type: "code",
    redirect_uri: TIKTOK_CONFIG.REDIRECT_URI,
    state,
  });

  return params.toString();
};

export const tiktokCallbackService = async (code: string) => {
  const body = qs.stringify({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    client_secret: process.env.TIKTOK_CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: process.env.TIKTOK_REDIRECT_URI,
  });

  const resToken = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const tokenData = await resToken.json();

  if (!resToken.ok) {
    console.error("❌ TikTok token exchange failed. Full payload :", tokenData);
    throw new Error("Token exhange failed");
  }

  const accessToken =
    typeof tokenData.access_token === "string"
      ? tokenData.access_token
      : tokenData.data?.access_token;

  if (!accessToken) {
    console.error("❌ TikTok token exchange: access_token manquant", tokenData);
    throw new Error("Token exhange failed");
  }

  // Champs user.info.basic uniquement — stats requiert un scope/produit séparé.
  const fields = ["open_id", "avatar_url", "display_name"].join(",");

  const resUser = await fetch(
    `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  const userData = await resUser.json();
  const user = userData.data?.user;

  if (!user) {
    console.error("❌ TikTok user/info failed:", userData);
    const tiktokMessage =
      userData.error?.message ||
      userData.error?.code ||
      "réponse vide";
    throw new Error(
      `Impossible de récupérer les infos du profil TikTok (${tiktokMessage})`,
    );
  }

  await saveInitialOAuthTokens({ ...tokenData, access_token: accessToken, ...user });

  return user;
};

const PRIVACY_LEVELS = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
] as const;

function isPrivacyLevel(value: string): value is TikTokPrivacyLevel {
  return (PRIVACY_LEVELS as readonly string[]).includes(value);
}

export const queryCreatorInfoService = async (
  accessToken: string,
): Promise<TikTokCreatorInfo> => {
  const res = await fetch(TIKTOK_CONFIG.ENDPOINTS.CREATOR_INFO, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      Accept: "application/json",
    },
  });

  const payload = (await res.json()) as {
    data?: {
      creator_avatar_url?: string;
      creator_username?: string;
      creator_nickname?: string;
      privacy_level_options?: string[];
      comment_disabled?: boolean;
      duet_disabled?: boolean;
      stitch_disabled?: boolean;
      max_video_post_duration_sec?: number;
    };
    error?: { message?: string; code?: string };
  };

  if (!res.ok || !payload.data) {
    const message =
      payload.error?.message ||
      payload.error?.code ||
      "Impossible de récupérer les infos créateur TikTok";
    throw new Error(message);
  }

  const privacyLevelOptions = (payload.data.privacy_level_options ?? []).filter(
    isPrivacyLevel,
  );

  return {
    creatorAvatarUrl: payload.data.creator_avatar_url ?? "",
    creatorUsername: payload.data.creator_username ?? "",
    creatorNickname: payload.data.creator_nickname ?? "",
    privacyLevelOptions,
    commentDisabled: payload.data.comment_disabled ?? false,
    duetDisabled: payload.data.duet_disabled ?? false,
    stitchDisabled: payload.data.stitch_disabled ?? false,
    maxVideoPostDurationSec: payload.data.max_video_post_duration_sec ?? 300,
  };
};
