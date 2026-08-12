import { AppError } from "../../utils.js";
import { prisma } from "../lib/prisma.js";
import { assertTwitchOAuthConfig, TWITCH_CONFIG } from "./twitch.config.js";

type TwitchTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string[];
  token_type?: string;
};

export type TwitchAccountSummary = {
  id: string;
  twitchUserId: string;
  login: string;
  displayName: string | null;
  avatar: string | null;
};

function getTwitchCredentials(): { clientId: string; clientSecret: string } {
  assertTwitchOAuthConfig();
  return {
    clientId: TWITCH_CONFIG.CLIENT_ID.trim(),
    clientSecret: TWITCH_CONFIG.CLIENT_SECRET.trim(),
  };
}

export function buildTwitchAuthorizeUrl(state: string): string {
  assertTwitchOAuthConfig();
  const params = new URLSearchParams({
    client_id: TWITCH_CONFIG.CLIENT_ID,
    redirect_uri: TWITCH_CONFIG.REDIRECT_URI,
    response_type: "code",
    scope: TWITCH_CONFIG.SCOPES.join(" "),
    state,
  });

  return `${TWITCH_CONFIG.ENDPOINTS.AUTHORIZE}?${params.toString()}`;
}

async function exchangeAuthorizationCode(code: string): Promise<TwitchTokenResponse> {
  const { clientId, clientSecret } = getTwitchCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: TWITCH_CONFIG.REDIRECT_URI,
  });

  const response = await fetch(TWITCH_CONFIG.ENDPOINTS.TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const payload = (await response.json()) as TwitchTokenResponse & {
    message?: string;
  };

  if (!response.ok || !payload.access_token || !payload.refresh_token) {
    throw new AppError(
      502,
      "TWITCH_OAUTH_FAILED",
      payload.message ?? "Échec de la connexion Twitch",
    );
  }

  return payload;
}

async function refreshAccessToken(refreshToken: string): Promise<TwitchTokenResponse> {
  const { clientId, clientSecret } = getTwitchCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(TWITCH_CONFIG.ENDPOINTS.TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const payload = (await response.json()) as TwitchTokenResponse & {
    message?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new AppError(
      502,
      "TWITCH_TOKEN_REFRESH_FAILED",
      payload.message ?? "Impossible de rafraîchir le token Twitch",
    );
  }

  return payload;
}

type TwitchUser = {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
};

type TwitchUsersResponse = {
  data?: TwitchUser[];
};

async function fetchTwitchUser(accessToken: string): Promise<TwitchUser> {
  const { clientId } = getTwitchCredentials();
  const response = await fetch(`${TWITCH_CONFIG.ENDPOINTS.HELIX}/users`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": clientId,
    },
  });

  const payload = (await response.json()) as TwitchUsersResponse;
  const user = payload.data?.[0];

  if (!response.ok || !user) {
    throw new AppError(
      502,
      "TWITCH_USER_FETCH_FAILED",
      "Impossible de récupérer le profil Twitch",
    );
  }

  return user;
}

export async function connectTwitchAccountFromCode(code: string) {
  const tokenPayload = await exchangeAuthorizationCode(code);
  const user = await fetchTwitchUser(tokenPayload.access_token!);
  const expiresAt = new Date(
    Date.now() + (tokenPayload.expires_in ?? 3600) * 1000,
  );

  return prisma.twitchAccount.upsert({
    where: { twitchUserId: user.id },
    update: {
      login: user.login,
      displayName: user.display_name,
      avatar: user.profile_image_url,
      accessToken: tokenPayload.access_token!,
      refreshToken: tokenPayload.refresh_token ?? undefined,
      expiresAt,
      scopes: tokenPayload.scope ?? [...TWITCH_CONFIG.SCOPES],
    },
    create: {
      twitchUserId: user.id,
      login: user.login,
      displayName: user.display_name,
      avatar: user.profile_image_url,
      accessToken: tokenPayload.access_token!,
      refreshToken: tokenPayload.refresh_token!,
      expiresAt,
      scopes: tokenPayload.scope ?? [...TWITCH_CONFIG.SCOPES],
    },
  });
}

export async function listTwitchAccounts(): Promise<TwitchAccountSummary[]> {
  return prisma.twitchAccount.findMany({
    select: {
      id: true,
      twitchUserId: true,
      login: true,
      displayName: true,
      avatar: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getValidTwitchAccessToken(accountId: string): Promise<{
  accessToken: string;
  twitchUserId: string;
  login: string;
}> {
  const account = await prisma.twitchAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new AppError(404, "TWITCH_ACCOUNT_NOT_FOUND", "Compte Twitch introuvable");
  }

  const expiresSoon =
    account.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if (!expiresSoon) {
    return {
      accessToken: account.accessToken,
      twitchUserId: account.twitchUserId,
      login: account.login,
    };
  }

  const refreshed = await refreshAccessToken(account.refreshToken);
  const expiresAt = new Date(
    Date.now() + (refreshed.expires_in ?? 3600) * 1000,
  );

  const updated = await prisma.twitchAccount.update({
    where: { id: account.id },
    data: {
      accessToken: refreshed.access_token!,
      refreshToken: refreshed.refresh_token ?? account.refreshToken,
      expiresAt,
      scopes: refreshed.scope ?? account.scopes,
    },
  });

  return {
    accessToken: updated.accessToken,
    twitchUserId: updated.twitchUserId,
    login: updated.login,
  };
}

export async function getTwitchAppAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getTwitchCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const response = await fetch(`${TWITCH_CONFIG.ENDPOINTS.TOKEN}?${params}`, {
    method: "POST",
  });

  const payload = (await response.json()) as TwitchTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new AppError(
      502,
      "TWITCH_AUTH_FAILED",
      "Impossible d'obtenir un token Twitch (vérifie TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET)",
    );
  }

  return payload.access_token;
}
