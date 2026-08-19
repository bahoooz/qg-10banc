import { Prisma } from "@prisma/client";
import { AppError } from "../../utils.js";
import { prisma } from "../lib/prisma.js";
import { CreateMarkerInput } from "./streamMarker.schema.js";
import {
  getLiveStatusForStreamer,
  resolveSessionForStreamer,
} from "./streamMarker.twitch.js";
import { storeMarkerThumbnail } from "./thumbnailStorage.service.js";

export type StreamerListItem = {
  id: string;
  name: string;
};

function mapDatabaseError(error: unknown): AppError {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError
  ) {
    return new AppError(
      503,
      "DATABASE_UNAVAILABLE",
      "Base de données indisponible",
    );
  }
  return new AppError(503, "DATABASE_UNAVAILABLE", "Base de données indisponible");
}

export async function listActiveStreamers(): Promise<StreamerListItem[]> {
  try {
    return await prisma.markerStreamer.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    throw mapDatabaseError(error);
  }
}

export async function getStreamerLiveStatus(streamerId: string) {
  try {
    const streamer = await prisma.markerStreamer.findFirst({
      where: { id: streamerId, active: true },
      select: { id: true, twitchLogin: true },
    });

    if (!streamer) {
      throw new AppError(404, "STREAMER_NOT_FOUND", "Streamer introuvable");
    }

    return getLiveStatusForStreamer(streamer.id, streamer.twitchLogin);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapDatabaseError(error);
  }
}

export async function createMarker(input: CreateMarkerInput): Promise<{
  id: string;
  duplicate: boolean;
}> {
  try {
    const streamer = await prisma.markerStreamer.findFirst({
      where: { id: input.streamer_id, active: true },
      select: { id: true, twitchLogin: true },
    });

    if (!streamer) {
      throw new AppError(400, "STREAMER_NOT_FOUND", "streamer_id inconnu");
    }

    const existing = await prisma.streamMarker.findUnique({
      where: { id: input.id },
      select: { id: true },
    });

    if (existing) {
      return { id: input.id, duplicate: true };
    }

    const pressedAt = new Date(input.pressed_at);
    const { sessionId, vodOffsetSeconds } = await resolveSessionForStreamer(
      streamer.id,
      streamer.twitchLogin,
      pressedAt,
    );

    const thumbnailPath = await storeMarkerThumbnail(
      streamer.id,
      input.id,
      input.thumbnail,
    );

    await prisma.streamMarker.create({
      data: {
        id: input.id,
        streamerId: streamer.id,
        sessionId,
        pressedAt,
        obsStreamOffsetMs: BigInt(input.obs_stream_offset_ms),
        obsTimecode: input.obs_timecode || null,
        obsScene: input.obs_scene || null,
        windowBeforeMs: input.window_before_ms,
        windowAfterMs: input.window_after_ms,
        thumbnailPath,
        clientVersion: input.client_version ?? null,
        vodOffsetSeconds,
      },
    });

    return { id: input.id, duplicate: false };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapDatabaseError(error);
  }
}
