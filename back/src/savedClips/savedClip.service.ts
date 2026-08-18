import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { AppError } from "../../utils.js";
import { getApiUrl } from "../config/env.js";
import {
  assertClipsStorageQuota,
  CLIPS_SAVED_RETENTION_MS,
  deleteClipDiskFiles,
  getClipsStorageStats,
} from "../clips/clipsStorage.service.js";
import { getPreviewPath } from "../clips/ffmpeg.service.js";
import {
  CLIPS_PREVIEWS_DIR,
  CLIPS_SOURCES_DIR,
} from "../lib/paths.js";
import { prisma } from "../lib/prisma.js";
import type {
  CreateSavedClipInput,
  SavedClipEditorState,
  UpdateSavedClipInput,
} from "./savedClip.schema.js";

export type SavedClipListItem = {
  id: string;
  name: string;
  clipId: string;
  previewUrl: string;
  sourceUrl: string;
  sourceDuration: number;
  sourceType: "upload" | "twitch";
  updatedAt: Date;
  createdAt: Date;
};

export type SavedClipDetail = SavedClipListItem & {
  sourceWidth: number;
  sourceHeight: number;
  originalName: string | null;
  editorState: SavedClipEditorState;
};

function buildPreviewPublicUrl(clipId: string): string {
  return `${getApiUrl()}/clips/previews/${clipId}.mp4`;
}

function buildSourcePublicUrl(clipId: string): string {
  return `${getApiUrl()}/clips/sources/${clipId}.mp4`;
}

function assertClipFilesExist(clipId: string): void {
  const previewPath = getPreviewPath(clipId, CLIPS_PREVIEWS_DIR);
  if (!fs.existsSync(previewPath)) {
    throw new AppError(
      404,
      "CLIP_FILES_NOT_FOUND",
      "Fichiers vidéo du clip introuvables",
    );
  }
}

function resolveSavedClipPreviewUrl(
  clipId: string,
  editorState: unknown,
): string {
  const state = editorState as SavedClipEditorState | null;
  const exportUrl = state?.exportUrl ?? state?.exportResult?.exportUrl;
  if (typeof exportUrl === "string" && exportUrl.length > 0) {
    return exportUrl;
  }
  return buildPreviewPublicUrl(clipId);
}

function resolveSavedClipDisplayDuration(
  sourceDuration: number,
  editorState: unknown,
): number {
  const state = editorState as SavedClipEditorState | null;
  const exportDuration = state?.exportResult?.duration;
  if (typeof exportDuration === "number" && exportDuration > 0) {
    return exportDuration;
  }
  return sourceDuration;
}

function mapSavedClipListItem(
  clip: {
    id: string;
    name: string;
    clipId: string;
    sourceDuration: number;
    sourceType: string;
    updatedAt: Date;
    createdAt: Date;
    editorState?: unknown;
  },
): SavedClipListItem {
  return {
    id: clip.id,
    name: clip.name,
    clipId: clip.clipId,
    previewUrl: resolveSavedClipPreviewUrl(clip.clipId, clip.editorState),
    sourceUrl: buildSourcePublicUrl(clip.clipId),
    sourceDuration: resolveSavedClipDisplayDuration(
      clip.sourceDuration,
      clip.editorState,
    ),
    sourceType: clip.sourceType as "upload" | "twitch",
    updatedAt: clip.updatedAt,
    createdAt: clip.createdAt,
  };
}

export async function listSavedClipsService(
  userId: number,
  page: number,
  limit: number,
): Promise<{
  items: SavedClipListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}> {
  const skip = (page - 1) * limit;

  const [total, clips] = await Promise.all([
    prisma.savedClip.count({ where: { userId } }),
    prisma.savedClip.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        clipId: true,
        sourceDuration: true,
        sourceType: true,
        updatedAt: true,
        createdAt: true,
        editorState: true,
      },
    }),
  ]);

  return {
    items: clips.map(mapSavedClipListItem),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getSavedClipService(
  userId: number,
  savedClipId: string,
): Promise<SavedClipDetail> {
  const clip = await prisma.savedClip.findFirst({
    where: { id: savedClipId, userId },
  });

  if (!clip) {
    throw new AppError(404, "SAVED_CLIP_NOT_FOUND");
  }

  assertClipFilesExist(clip.clipId);

  return {
    ...mapSavedClipListItem(clip),
    // Pour l'éditeur : durée source réelle (pas la durée export affichée en liste).
    sourceDuration: clip.sourceDuration,
    previewUrl: buildPreviewPublicUrl(clip.clipId),
    sourceWidth: clip.sourceWidth,
    sourceHeight: clip.sourceHeight,
    originalName: clip.originalName,
    editorState: clip.editorState as SavedClipEditorState,
  };
}

export async function createSavedClipService(
  userId: number,
  input: CreateSavedClipInput,
): Promise<SavedClipDetail> {
  assertClipFilesExist(input.clipId);

  try {
    const created = await prisma.savedClip.create({
      data: {
        userId,
        name: input.name,
        clipId: input.clipId,
        sourceType: input.sourceType,
        originalName: input.originalName ?? null,
        sourceWidth: input.sourceWidth,
        sourceHeight: input.sourceHeight,
        sourceDuration: input.sourceDuration,
        editorState: input.editorState as Prisma.InputJsonValue,
      },
    });

    return {
      ...mapSavedClipListItem(created),
      sourceWidth: created.sourceWidth,
      sourceHeight: created.sourceHeight,
      originalName: created.originalName,
      editorState: created.editorState as SavedClipEditorState,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "SAVED_CLIP_NAME_EXISTS",
        "Un clip avec ce nom existe déjà",
      );
    }
    throw error;
  }
}

export async function updateSavedClipService(
  userId: number,
  savedClipId: string,
  input: UpdateSavedClipInput,
): Promise<SavedClipDetail> {
  const existing = await prisma.savedClip.findFirst({
    where: { id: savedClipId, userId },
  });

  if (!existing) {
    throw new AppError(404, "SAVED_CLIP_NOT_FOUND");
  }

  const updated = await prisma.savedClip.update({
    where: { id: savedClipId },
    data: {
      editorState: input.editorState as Prisma.InputJsonValue,
    },
  });

  return {
    ...mapSavedClipListItem(updated),
    sourceWidth: updated.sourceWidth,
    sourceHeight: updated.sourceHeight,
    originalName: updated.originalName,
    editorState: updated.editorState as SavedClipEditorState,
  };
}

export async function deleteSavedClipService(
  userId: number,
  savedClipId: string,
): Promise<void> {
  const clip = await prisma.savedClip.findFirst({
    where: { id: savedClipId, userId },
    select: { id: true, clipId: true },
  });

  if (!clip) {
    throw new AppError(404, "SAVED_CLIP_NOT_FOUND");
  }

  await prisma.savedClip.delete({ where: { id: clip.id } });
  deleteClipDiskFiles(clip.clipId);
}

export function getSavedClipsStorageStatsService() {
  return getClipsStorageStats();
}

export async function purgeExpiredSavedClipsService(): Promise<number> {
  const cutoff = new Date(Date.now() - CLIPS_SAVED_RETENTION_MS);

  const expired = await prisma.savedClip.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true, clipId: true },
  });

  if (expired.length === 0) return 0;

  await prisma.savedClip.deleteMany({
    where: { id: { in: expired.map((clip) => clip.id) } },
  });

  const deletedClipIds = new Set<string>();
  for (const clip of expired) {
    if (deletedClipIds.has(clip.clipId)) continue;
    deletedClipIds.add(clip.clipId);
    deleteClipDiskFiles(clip.clipId);
  }

  return expired.length;
}

export function getSavedClipSourcePath(clipId: string): string {
  return path.join(CLIPS_SOURCES_DIR, `${clipId}.mp4`);
}

export { assertClipsStorageQuota };
