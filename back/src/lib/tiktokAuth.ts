import qs from "querystring";
import fs from "fs";
import path from "path";
import { prisma } from "./prisma.js";

const TOKEN_PATH = path.resolve("tiktok_token.json");

type TokenData = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

function loadToken(): TokenData | null {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
}

function saveToken(data: TokenData) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2));
}

async function refreshAccessToken(current: TokenData): Promise<TokenData> {
  const body = qs.stringify({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    client_secret: process.env.TIKTOK_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: current.refresh_token,
  });

  const resp = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await resp.json();

  if (!resp.ok)
    throw new Error("Tiktok refresh failed :" + JSON.stringify(data));

  const updated: TokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? current.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  saveToken(updated);
  console.log("✅ Nouveau token TikTok rafraîchi !");
  return updated;
}

export async function getTiktokAccessToken(): Promise<string> {
  const token = loadToken();
  if (!token)
    throw new Error(
      "Aucun token TikTok trouvé, fais d'abord /auth/tiktok/callback"
    );

  if (Date.now() > token.expires_at - 2 * 60 * 1000) {
    const refreshed = await refreshAccessToken(token);
    return refreshed.access_token;
  }

  return token.access_token;
}

export async function saveInitialOAuthTokens(data: any) {
  try {
    const savedAccount = await prisma.tikTokAccount.upsert({
      where: { openId: data.open_id },
      update: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        displayName: data.display_name,
        avatar: data.avatar_url,
      },
      create: {
        openId: data.open_id,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        displayName: data.display_name,
        avatar: data.avatar_url,
      },
    });

    console.log(
      `💾 Compte TikTok "${savedAccount.displayName}" sauvegardé en BDD !`
    );
    return savedAccount;
  } catch (error) {
    console.error(
      "❌ Erreur critique lors de la sauvegarde TikTok dans Prisma:",
      error
    );
    throw error;
  }
}
