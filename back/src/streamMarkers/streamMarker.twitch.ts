import { AppError } from "../../utils.js";
import { prisma } from "../lib/prisma.js";
import { TWITCH_CONFIG } from "../twitch/twitch.config.js";
import { logger } from "../lib/logger.js";

const LIVE_CACHE_TTL_MS = 45_000;

type HelixStream = {
  id: string;
  user_id: string;
  user_login: string;
  title: string;
  started_at: string;
};

type HelixStreamsResponse = {
  data?: HelixStream[];
};

type HelixVideo = {
  id: string;
  stream_id: string;
  url: string;
};

type HelixVideosResponse = {
  data?: HelixVideo[];
};

type TwitchTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

export type ResolvedLiveStream = {
  streamId: string;
  title: string;
  startedAt: Date;
  twitchUserId: string;
};

type LiveCacheEntry = {
  expiresAt: number;
  value: ResolvedLiveStream | null;
};

let cachedAppToken: { token: string; expiresAt: number } | null = null;
const liveCache = new Map<string, LiveCacheEntry>();

function assertTwitchAppCredentials(): { clientId: string; clientSecret: string } {
  const clientId = TWITCH_CONFIG.CLIENT_ID.trim();
  const clientSecret = TWITCH_CONFIG.CLIENT_SECRET.trim();
  if (!clientId || !clientSecret) {
    throw new AppError(
      503,
      "TWITCH_NOT_CONFIGURED",
      "Configuration Twitch indisponible",
    );
  }
  return { clientId, clientSecret };
}

async function fetchAppAccessToken(): Promise<string> {
  const { clientId, clientSecret } = assertTwitchAppCredentials();
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
      503,
      "TWITCH_AUTH_FAILED",
      "Impossible d'obtenir un token Twitch",
    );
  }

  const expiresInMs = (payload.expires_in ?? 3600) * 1000;
  cachedAppToken = {
    token: payload.access_token,
    expiresAt: Date.now() + expiresInMs - 60_000,
  };
  return payload.access_token;
}

async function getAppAccessToken(): Promise<string> {
  if (cachedAppToken && Date.now() < cachedAppToken.expiresAt) {
    return cachedAppToken.token;
  }
  return fetchAppAccessToken();
}

async function helixGet<T>(path: string, retryOn401 = true): Promise<T> {
  const { clientId } = assertTwitchAppCredentials();
  const token = await getAppAccessToken();

  const response = await fetch(`${TWITCH_CONFIG.ENDPOINTS.HELIX}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-Id": clientId,
    },
  });

  if (response.status === 401 && retryOn401) {
    cachedAppToken = null;
    return helixGet(path, false);
  }

  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new AppError(
      503,
      "TWITCH_HELIX_FAILED",
      payload.message ?? "Appel Twitch Helix en échec",
    );
  }

  return payload;
}

export async function fetchLiveStreamForLogin(
  twitchLogin: string,
): Promise<ResolvedLiveStream | null> {
  const cacheKey = twitchLogin.toLowerCase();
  const cached = liveCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  const payload = await helixGet<HelixStreamsResponse>(
    `/streams?user_login=${encodeURIComponent(twitchLogin)}`,
  );
  const stream = payload.data?.[0];

  const resolved = stream
    ? {
        streamId: stream.id,
        title: stream.title,
        startedAt: new Date(stream.started_at),
        twitchUserId: stream.user_id,
      }
    : null;

  liveCache.set(cacheKey, {
    expiresAt: Date.now() + LIVE_CACHE_TTL_MS,
    value: resolved,
  });

  return resolved;
}

export async function resolveSessionForStreamer(
  streamerId: string,
  twitchLogin: string,
  pressedAt: Date,
): Promise<{ sessionId: string | null; vodOffsetSeconds: number | null }> {
  try {
    const live = await fetchLiveStreamForLogin(twitchLogin);
    if (!live) {
      return { sessionId: null, vodOffsetSeconds: null };
    }

    await prisma.markerStreamer.update({
      where: { id: streamerId },
      data: { twitchUserId: live.twitchUserId },
    });

    const session = await prisma.streamSession.upsert({
      where: { twitchStreamId: live.streamId },
      update: {
        title: live.title,
        endedAt: null,
      },
      create: {
        streamerId,
        twitchStreamId: live.streamId,
        title: live.title,
        startedAt: live.startedAt,
      },
    });

    const vodOffsetSeconds = Math.max(
      0,
      Math.round((pressedAt.getTime() - session.startedAt.getTime()) / 1000),
    );

    return { sessionId: session.id, vodOffsetSeconds };
  } catch (error) {
    logger.warn("streamMarkers", "Résolution live échouée, marqueur sans session", {
      streamerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { sessionId: null, vodOffsetSeconds: null };
  }
}

export async function getLiveStatusForStreamer(
  streamerId: string,
  twitchLogin: string,
): Promise<
  | { is_live: false }
  | {
      is_live: true;
      title: string;
      started_at: string;
      stream_id: string;
    }
> {
  const live = await fetchLiveStreamForLogin(twitchLogin);
  if (!live) {
    return { is_live: false };
  }

  await prisma.markerStreamer.update({
    where: { id: streamerId },
    data: { twitchUserId: live.twitchUserId },
  });

  await prisma.streamSession.upsert({
    where: { twitchStreamId: live.streamId },
    update: {
      title: live.title,
      endedAt: null,
    },
    create: {
      streamerId,
      twitchStreamId: live.streamId,
      title: live.title,
      startedAt: live.startedAt,
    },
  });

  return {
    is_live: true,
    title: live.title,
    started_at: live.startedAt.toISOString(),
    stream_id: live.streamId,
  };
}

export async function linkVodsAndOrphanMarkers(): Promise<void> {
  const streamers = await prisma.markerStreamer.findMany({
    where: { active: true, twitchUserId: { not: null } },
    select: { id: true, twitchUserId: true },
  });

  for (const streamer of streamers) {
    if (!streamer.twitchUserId) continue;

    try {
      const videosPayload = await helixGet<HelixVideosResponse>(
        `/videos?user_id=${encodeURIComponent(streamer.twitchUserId)}&type=archive&first=20`,
      );

      for (const video of videosPayload.data ?? []) {
        if (!video.stream_id) continue;

        const session = await prisma.streamSession.findUnique({
          where: { twitchStreamId: video.stream_id },
        });
        if (!session || session.vodVideoId) continue;

        await prisma.streamSession.update({
          where: { id: session.id },
          data: {
            vodVideoId: video.id,
            vodUrl: video.url,
            endedAt: session.endedAt ?? new Date(),
          },
        });
      }

      const orphanMarkers = await prisma.streamMarker.findMany({
        where: {
          streamerId: streamer.id,
          sessionId: null,
        },
        orderBy: { pressedAt: "asc" },
        take: 200,
      });

      if (orphanMarkers.length === 0) continue;

      const sessions = await prisma.streamSession.findMany({
        where: { streamerId: streamer.id },
        orderBy: { startedAt: "asc" },
      });

      for (const marker of orphanMarkers) {
        const session = sessions.find((candidate) => {
          const start = candidate.startedAt.getTime();
          const end = candidate.endedAt?.getTime() ?? Number.POSITIVE_INFINITY;
          const pressed = marker.pressedAt.getTime();
          return pressed >= start && pressed <= end;
        });

        if (!session) continue;

        const vodOffsetSeconds = Math.max(
          0,
          Math.round(
            (marker.pressedAt.getTime() - session.startedAt.getTime()) / 1000,
          ),
        );

        await prisma.streamMarker.update({
          where: { id: marker.id },
          data: {
            sessionId: session.id,
            vodOffsetSeconds,
          },
        });
      }
    } catch (error) {
      logger.warn("streamMarkers", "Tâche VOD/orphelins échouée pour un streamer", {
        streamerId: streamer.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const openSessions = await prisma.streamSession.findMany({
    where: { endedAt: null },
    include: { streamer: true },
  });

  for (const session of openSessions) {
    try {
      const live = await fetchLiveStreamForLogin(session.streamer.twitchLogin);
      const stillLive = live?.streamId === session.twitchStreamId;
      if (!stillLive) {
        await prisma.streamSession.update({
          where: { id: session.id },
          data: { endedAt: new Date() },
        });
      }
    } catch {
      // Ignoré : la tâche reprendra au prochain cycle
    }
  }
}
