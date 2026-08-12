import { useQuery } from "@tanstack/react-query";

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
  const res = await fetch(`${import.meta.env.VITE_API_URL}/tiktok/accounts`, {
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
  const res = await fetch(`${import.meta.env.VITE_API_URL}/youtube/accounts`, {
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
  const base = import.meta.env.VITE_API_URL;
  if (platform === "tiktok") return `${base}/tiktok/auth/login`;
  return `${base}/youtube/auth/login`;
}

export function useSocialAccounts() {
  return useQuery({
    queryKey: ["social-accounts"],
    queryFn: fetchSocialAccounts,
    refetchOnWindowFocus: true,
  });
}
