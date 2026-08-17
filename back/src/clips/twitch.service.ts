import fs from "fs";
import { AppError } from "../../utils.js";
import { extractTwitchClipSlug } from "./clips.schema.js";
import { prisma } from "../lib/prisma.js";
import {
  getTwitchAppAccessToken,
  getValidTwitchAccessToken,
  listTwitchAccounts,
} from "../twitch/twitch.service.js";
import { TWITCH_CONFIG } from "../twitch/twitch.config.js";

type HelixClip = {
  id: string;
  broadcaster_id: string;
  broadcaster_name: string;
  title: string;
};

type HelixClipsResponse = {
  data?: HelixClip[];
};

type HelixClipDownload = {
  clip_id: string;
  landscape_download_url: string | null;
  portrait_download_url: string | null;
};

type HelixClipDownloadsResponse = {
  data?: HelixClipDownload[];
};

export async function fetchTwitchClipByUrl(url: string): Promise<HelixClip> {
  const slug = extractTwitchClipSlug(url);
  return fetchHelixClip(slug);
}

async function fetchHelixClip(slug: string): Promise<HelixClip> {
  const appToken = await getTwitchAppAccessToken();
  const response = await fetch(
    `${TWITCH_CONFIG.ENDPOINTS.HELIX}/clips?id=${encodeURIComponent(slug)}`,
    {
      headers: {
        Authorization: `Bearer ${appToken}`,
        "Client-Id": TWITCH_CONFIG.CLIENT_ID,
      },
    },
  );

  const payload = (await response.json()) as HelixClipsResponse;

  if (!response.ok || !payload.data?.[0]) {
    throw new AppError(404, "TWITCH_CLIP_NOT_FOUND", "Clip Twitch introuvable");
  }

  return payload.data[0];
}

async function fetchHelixClipDownloadUrl(
  accessToken: string,
  editorId: string,
  broadcasterId: string,
  clipId: string,
): Promise<string> {
  const params = new URLSearchParams({
    broadcaster_id: broadcasterId,
    editor_id: editorId,
    clip_id: clipId,
  });

  const response = await fetch(
    `${TWITCH_CONFIG.ENDPOINTS.HELIX}/clips/downloads?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": TWITCH_CONFIG.CLIENT_ID,
      },
    },
  );

  const payload = (await response.json()) as HelixClipDownloadsResponse & {
    message?: string;
  };

  if (!response.ok) {
    throw new AppError(
      response.status === 403 ? 403 : 502,
      response.status === 403 ? "TWITCH_CLIP_FORBIDDEN" : "TWITCH_FETCH_FAILED",
      payload.message ?? "Impossible de récupérer le fichier du clip",
    );
  }

  const downloadUrl = payload.data?.[0]?.landscape_download_url;
  if (!downloadUrl) {
    throw new AppError(
      404,
      "TWITCH_CLIP_DOWNLOAD_UNAVAILABLE",
      "URL de téléchargement indisponible pour ce clip",
    );
  }

  return downloadUrl;
}

async function resolveDownloadAccount(
  broadcasterId: string,
  preferredAccountId?: string,
) {
  if (preferredAccountId) {
    const account = await prisma.twitchAccount.findUnique({
      where: { id: preferredAccountId },
    });
    if (!account) {
      throw new AppError(404, "TWITCH_ACCOUNT_NOT_FOUND", "Compte Twitch introuvable");
    }
    return account;
  }

  const broadcasterAccount = await prisma.twitchAccount.findUnique({
    where: { twitchUserId: broadcasterId },
  });

  if (broadcasterAccount) {
    return broadcasterAccount;
  }

  const accounts = await prisma.twitchAccount.findMany({
    orderBy: { updatedAt: "desc" },
  });

  if (accounts.length === 0) {
    throw new AppError(
      403,
      "TWITCH_ACCOUNT_REQUIRED",
      "Connecte un compte Twitch autorisé à télécharger ce clip (broadcaster ou éditeur de la chaîne)",
    );
  }

  return accounts[0];
}

async function downloadFileFromUrl(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new AppError(
      502,
      "TWITCH_DOWNLOAD_FAILED",
      "Échec du téléchargement du clip",
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
}

export async function downloadTwitchClip(
  url: string,
  destPath: string,
  preferredAccountId?: string,
): Promise<void> {
  const slug = extractTwitchClipSlug(url);
  const clip = await fetchHelixClip(slug);
  const account = await resolveDownloadAccount(
    clip.broadcaster_id,
    preferredAccountId,
  );

  const { accessToken, twitchUserId } = await getValidTwitchAccessToken(
    account.id,
  );

  try {
    const downloadUrl = await fetchHelixClipDownloadUrl(
      accessToken,
      twitchUserId,
      clip.broadcaster_id,
      clip.id,
    );
    await downloadFileFromUrl(downloadUrl, destPath);
    return;
  } catch (error) {
    if (
      !(error instanceof AppError) ||
      error.errorCode !== "TWITCH_CLIP_FORBIDDEN" ||
      preferredAccountId
    ) {
      throw error;
    }
  }

  const accounts = await prisma.twitchAccount.findMany({
    orderBy: { updatedAt: "desc" },
  });

  for (const candidate of accounts) {
    if (candidate.id === account.id) continue;

    const { accessToken: candidateToken, twitchUserId: candidateUserId } =
      await getValidTwitchAccessToken(candidate.id);

    try {
      const downloadUrl = await fetchHelixClipDownloadUrl(
        candidateToken,
        candidateUserId,
        clip.broadcaster_id,
        clip.id,
      );
      await downloadFileFromUrl(downloadUrl, destPath);
      return;
    } catch (candidateError) {
      if (
        candidateError instanceof AppError &&
        candidateError.errorCode === "TWITCH_CLIP_FORBIDDEN"
      ) {
        continue;
      }
      throw candidateError;
    }
  }

  throw new AppError(
    403,
    "TWITCH_CLIP_FORBIDDEN",
    `Aucun compte Twitch connecté n'a le droit de télécharger ce clip (${clip.broadcaster_name})`,
  );
}

export { listTwitchAccounts };
