import { useQuery } from "@tanstack/react-query";

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
  const res = await fetch(`${import.meta.env.VITE_API_URL}/twitch/accounts`, {
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
  return `${import.meta.env.VITE_API_URL}/twitch/auth/login`;
}
