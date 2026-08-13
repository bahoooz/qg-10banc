import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "../lib/apiUrl";

export type SocialPlatform = "instagram" | "tiktok" | "youtube";

export type SocialAccount = {
  id: string;
  platform: SocialPlatform;
  label: string;
  avatar: string | null;
  handle: string | null;
};

type TikTokAccountsResponse = {
  success: boolean;
  accounts: {
    openId: string;
    displayName: string | null;
    avatar: string | null;
  }[];
};

type YouTubeAccountsResponse = {
  success: boolean;
  accounts: {
    id: string;
    channelId: string;
    title: string | null;
    avatar: string | null;
    customUrl: string | null;
  }[];
};

async function fetchTikTokAccounts(): Promise<SocialAccount[]> {
  const res = await fetch(apiUrl("/tiktok/accounts"), {
    credentials: "include",
  });

  if (!res.ok) return [];

  const payload = (await res.json()) as TikTokAccountsResponse;
  return (payload.accounts ?? []).map((account) => ({
    id: account.openId,
    platform: "tiktok" as const,
    label: account.displayName ?? "Compte TikTok",
    avatar: account.avatar,
    handle: account.displayName,
  }));
}

async function fetchYouTubeAccounts(): Promise<SocialAccount[]> {
  const res = await fetch(apiUrl("/youtube/accounts"), {
    credentials: "include",
  });

  if (!res.ok) return [];

  const payload = (await res.json()) as YouTubeAccountsResponse;
  return (payload.accounts ?? []).map((account) => ({
    id: account.id,
    platform: "youtube" as const,
    label: account.title ?? "Chaîne YouTube",
    avatar: account.avatar,
    handle: account.customUrl ?? account.title,
  }));
}

async function fetchSocialAccounts(): Promise<SocialAccount[]> {
  const [tiktokAccounts, youtubeAccounts] = await Promise.all([
    fetchTikTokAccounts(),
    fetchYouTubeAccounts(),
  ]);

  return [...tiktokAccounts, ...youtubeAccounts];
}

export function getSocialLoginUrl(platform: Exclude<SocialPlatform, "instagram">): string {
  if (platform === "tiktok") return apiUrl("/tiktok/auth/login");
  return apiUrl("/youtube/auth/login");
}

export function useSocialAccounts() {
  return useQuery({
    queryKey: ["social-accounts"],
    queryFn: fetchSocialAccounts,
    refetchOnWindowFocus: true,
  });
}
