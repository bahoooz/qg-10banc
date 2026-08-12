import { Request, Response } from "express";
import { getFrontendUrl } from "../config/env.js";
import {
  startTiktokLoginService,
  tiktokCallbackService,
  uploadDraftFromUrlService,
} from "./tiktok.service.js";
import { prisma } from "../lib/prisma.js";

export const uploadDraftFromUrl = async (req: Request, res: Response) => {
  try {
    const { video_url, openId } = req.body;

    if (!video_url) {
      return res.status(400).json({ error: "Missing video_url" });
    }

    if (!openId) {
      return res.status(400).json({
        error: "Missing openId. Veuillez préciser sur quel compte uploader.",
      });
    }

    const account = await prisma.tikTokAccount.findUnique({
      where: { openId: openId },
    });

    if (!account || !account.accessToken) {
      return res.status(404).json({
        error: "Compte TikTok introuvable ou non connecté.",
      });
    }

    const dataVideo = await uploadDraftFromUrlService({
      accessToken: account.accessToken,
      video_url,
    });

    return res.json({
      ok: true,
      step: "inbox_init",
      account: account.displayName,
      data: dataVideo,
    });
  } catch (error: any) {
    console.error("Erreur Upload TikTok:", error);
    return res.status(500).json({ error: error?.message ?? "server_error" });
  }
};

export const listConnectedAccounts = async (_req: Request, res: Response) => {
  try {
    const accounts = await prisma.tikTokAccount.findMany({
      select: {
        openId: true, // L'ID à renvoyer lors de l'upload
        displayName: true, // Le nom à afficher sur le bouton
        avatar: true, // L'image pour faire joli
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json({
      success: true,
      count: accounts.length,
      accounts: accounts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Impossible de lister les comptes" });
  }
};

export const startTiktokLogin = async (_req: Request, res: Response) => {
  const params = await startTiktokLoginService();

  res.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params}`);
};

export const tiktokCallback = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send("Missing code parameter");

  try {
    const account = await tiktokCallbackService(code);
    console.log(`✅ TikTok connecté : ${account.displayName}`);
    const frontendUrl = getFrontendUrl();
    res.redirect(`${frontendUrl}/editeur-clips?social=tiktok&status=connected`);
  } catch (error: any) {
    console.error("❌ Erreur Callback:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
