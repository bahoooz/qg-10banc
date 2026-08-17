import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { AppError } from "../../utils.js";
import { CLIPS_EXPORTS_DIR } from "../lib/paths.js";
import { getApiUrl } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { getAuthClient } from "./youtube.config.js";
import type { PublishYouTubeVideoInput } from "./youtube.schema.js";

export const YOUTUBE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

export function generateAuthUrl(): string {
  const authClient = getAuthClient();

  return authClient.generateAuthUrl({
    access_type: "offline",
    scope: YOUTUBE_OAUTH_SCOPES,
    include_granted_scopes: true,
    prompt: "consent",
  });
}

export function resolveClipExportPathFromUrl(videoUrl: string): string {
  let pathname: string;
  try {
    pathname = new URL(videoUrl, getApiUrl()).pathname;
  } catch {
    throw new AppError(400, "INVALID_VIDEO_URL", "URL vidéo invalide");
  }

  const match = pathname.match(/\/clips\/exports\/([^/]+)\.mp4$/);
  if (!match?.[1]) {
    throw new AppError(
      400,
      "INVALID_VIDEO_URL",
      "Seule une vidéo exportée depuis l'éditeur peut être publiée",
    );
  }

  const exportPath = path.join(CLIPS_EXPORTS_DIR, `${match[1]}.mp4`);
  if (!fs.existsSync(exportPath)) {
    throw new AppError(
      404,
      "EXPORT_NOT_FOUND",
      "Fichier export introuvable. Relance l'exportation du clip.",
    );
  }

  return exportPath;
}

async function getYoutubeClientForAccount(accountId: string) {
  const account = await prisma.youTubeAccount.findUnique({
    where: { id: accountId },
  });

  if (!account?.refreshToken) {
    throw new AppError(
      404,
      "YOUTUBE_ACCOUNT_NOT_FOUND",
      "Compte YouTube introuvable ou non connecté",
    );
  }

  const authClient = getAuthClient();
  authClient.setCredentials({ refresh_token: account.refreshToken });

  return {
    account,
    youtube: google.youtube({ version: "v3", auth: authClient }),
  };
}

function buildShortsDescription(
  description: string,
  title: string,
  includeShortsTag: boolean,
): string {
  if (!includeShortsTag) return description;

  const hasShortsTag =
    title.toLowerCase().includes("#shorts") ||
    description.toLowerCase().includes("#shorts");

  if (hasShortsTag) return description;
  if (!description.trim()) return "#Shorts";
  return `${description.trim()}\n\n#Shorts`;
}

export type YouTubePublishResult = {
  videoId: string;
  watchUrl: string;
  shortsUrl: string;
  privacyStatus: string;
  channelTitle: string | null;
};

export async function publishYouTubeVideoService(
  input: PublishYouTubeVideoInput,
): Promise<YouTubePublishResult> {
  const { youtube, account } = await getYoutubeClientForAccount(input.accountId);
  const filePath = resolveClipExportPathFromUrl(input.videoUrl);

  const description = buildShortsDescription(
    input.description,
    input.title,
    input.includeShortsTag,
  );

  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: input.title,
        description,
        categoryId: input.categoryId,
        ...(input.tags && input.tags.length > 0 ? { tags: input.tags } : {}),
      },
      status: {
        privacyStatus: input.privacyStatus,
        selfDeclaredMadeForKids: input.selfDeclaredMadeForKids,
      },
    },
    media: {
      body: fs.createReadStream(filePath),
    },
  });

  const videoId = response.data.id;
  if (!videoId) {
    throw new AppError(
      502,
      "YOUTUBE_UPLOAD_FAILED",
      "YouTube n'a pas renvoyé d'identifiant vidéo",
    );
  }

  return {
    videoId,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    shortsUrl: `https://www.youtube.com/shorts/${videoId}`,
    privacyStatus: input.privacyStatus,
    channelTitle: account.title,
  };
}

export async function handleAuthCallback(code: string) {
  const authClient = getAuthClient();

  const { tokens } = await authClient.getToken(code);

  if (!tokens.refresh_token) {
    console.warn(
      "⚠️ Attention: Pas de refresh_token reçu. L'utilisateur avait peut-être déjà autorisé l'app sans révoquer.",
    );
  }

  authClient.setCredentials(tokens);
  const youtube = google.youtube({ version: "v3", auth: authClient });

  const response = await youtube.channels.list({
    part: ["snippet", "contentDetails"],
    mine: true,
  });

  const channelData = response.data.items?.[0];

  if (!channelData || !channelData.id) {
    throw new Error("Impossible de récupérer les infos de la chaîne YouTube.");
  }

  const channelId = channelData.id;
  const title = channelData.snippet?.title || "Chaîne inconnue";
  const avatar = channelData.snippet?.thumbnails?.default?.url ?? null;
  const customUrl = channelData.snippet?.customUrl ?? null;

  const dataToUpdate = {
    title,
    channelId,
    avatar,
    customUrl,
    ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
  };

  const savedChannel = await prisma.youTubeAccount.upsert({
    where: { channelId: channelId },
    update: dataToUpdate,
    create: {
      channelId,
      title,
      avatar,
      customUrl,
      refreshToken: tokens.refresh_token || "",
    },
  });

  return savedChannel;
}
