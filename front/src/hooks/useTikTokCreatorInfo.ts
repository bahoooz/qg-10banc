import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "../lib/apiUrl";
import type { TikTokCreatorInfo } from "../lib/tiktokPublish";

type CreatorInfoResponse = {
  success: boolean;
  creatorInfo: TikTokCreatorInfo;
};

async function fetchTikTokCreatorInfo(
  openId: string,
): Promise<TikTokCreatorInfo> {
  const res = await fetch(apiUrl(`/tiktok/creator-info/${openId}`), {
    credentials: "include",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Impossible de charger les infos TikTok");
  }

  const data = (await res.json()) as CreatorInfoResponse;
  return data.creatorInfo;
}

export function useTikTokCreatorInfo(openId: string | null) {
  return useQuery({
    queryKey: ["tiktok-creator-info", openId],
    queryFn: () => fetchTikTokCreatorInfo(openId!),
    enabled: Boolean(openId),
    staleTime: 5 * 60 * 1000,
  });
}
