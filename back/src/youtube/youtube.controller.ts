import { Request, Response } from "express";
import * as youtubeService from "./youtube.service.js";
import { prisma } from "../lib/prisma.js";
import { getFrontendUrl } from "../config/env.js";

export const login = (_req: Request, res: Response) => {
  try {
    const url = youtubeService.generateAuthUrl();
    res.redirect(url);
  } catch (error) {
    console.error("Erreur de login : ", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la génération du lien de connexion" });
  }
};

export const callback = async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== "string")
    return res.status(400).json({ error: "Code d'authentification manquant" });

  try {
    const channel = await youtubeService.handleAuthCallback(code);

    console.log(`✅ Chaîne connectée : ${channel.title}`);
    const frontendUrl = getFrontendUrl();
    res.redirect(
      `${frontendUrl}/editeur-clips?social=youtube&status=connected&channel=${encodeURIComponent(channel.title ?? "")}`,
    );
  } catch (error) {
    console.error("Erreur callback : ", error);
    const frontendUrl = getFrontendUrl();
    res.redirect(`${frontendUrl}/editeur-clips?social=youtube&status=error`);
  }
};

export const listYouTubeAccounts = async (_req: Request, res: Response) => {
  try {
    const accounts = await prisma.youTubeAccount.findMany({
      select: {
        id: true,
        channelId: true,
        title: true,
        avatar: true,
        customUrl: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json({ success: true, accounts });
  } catch (error) {
    console.error("Erreur liste YouTube:", error);
    res.status(500).json({ error: "Impossible de lister les comptes YouTube" });
  }
};
