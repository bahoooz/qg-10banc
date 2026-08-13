import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "../lib/apiUrl";

export type TwitchAccountSummary = {
  id: string;
  twitchUserId: string;
  login: string;
  displayName: string | null;
  avatar: string | null;
};

type TwitchAccountsResponse = {
  success: boolean;
  accounts: TwitchAccountSummary[];
};

async function fetchTwitchAccounts(): Promise<TwitchAccountSummary[]> {
  const res = await fetch(apiUrl("/twitch/accounts"), {
    credentials: "include",
  });

  if (!res.ok) {
    return [];
  }

  const payload = (await res.json()) as TwitchAccountsResponse;
  return payload.accounts ?? [];
}

export function useTwitchAccounts() {
  return useQuery({
    queryKey: ["twitch-accounts"],
    queryFn: fetchTwitchAccounts,
  });
}

export function getTwitchLoginUrl(): string {
  return apiUrl("/twitch/auth/login");
}
