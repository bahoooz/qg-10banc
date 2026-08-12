import { google } from "googleapis";
import { getAuthClient } from "./youtube.config.js";
import { prisma } from "../lib/prisma.js";

const SCOPES = [
  "https://www.googleapis.com/auth/yt-analytics.readonly", // Stats
  "https://www.googleapis.com/auth/youtube.readonly", // Infos chaîne (titre, avatar)
];

export const generateAuthUrl = () => {
  const authClient = getAuthClient();

  return authClient.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    include_granted_scopes: true,
    prompt: "consent",
  });
};

export const handleAuthCallback = async (code: string) => {
  const authClient = getAuthClient();

  const { tokens } = await authClient.getToken(code);

  if (!tokens.refresh_token) {
    console.warn(
      "⚠️ Attention: Pas de refresh_token reçu. L'utilisateur avait peut-être déjà autorisé l'app sans révoquer."
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
};
