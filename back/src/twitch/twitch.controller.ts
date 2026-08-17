import { Request, Response } from "express";
import { randomUUID } from "crypto";
import {
  buildTwitchAuthorizeUrl,
  connectTwitchAccountFromCode,
  listTwitchAccounts,
} from "./twitch.service.js";
import { getFrontendUrl } from "../config/env.js";
import { FRONTEND_ROUTES } from "../lib/frontendRoutes.js";

const oauthStates = new Set<string>();

export const startTwitchLogin = (_req: Request, res: Response) => {
  try {
    const state = randomUUID();
    oauthStates.add(state);
    const url = buildTwitchAuthorizeUrl(state);
    res.redirect(url);
  } catch (error) {
    console.error("Erreur login Twitch:", error);
    res.status(500).json({ error: "Impossible de démarrer la connexion Twitch" });
  }
};

export const twitchCallback = async (req: Request, res: Response) => {
  const code = req.query.code;
  const state = req.query.state;

  if (typeof code !== "string") {
    return res.status(400).send("Code OAuth manquant");
  }

  if (typeof state !== "string" || !oauthStates.has(state)) {
    return res.status(400).send("État OAuth invalide");
  }

  oauthStates.delete(state);

  try {
    const account = await connectTwitchAccountFromCode(code);
    const frontendUrl = getFrontendUrl();
    res.redirect(
      `${frontendUrl}${FRONTEND_ROUTES.editorClips}?twitch=connected&login=${encodeURIComponent(account.login)}`,
    );
  } catch (error) {
    console.error("Erreur callback Twitch:", error);
    const frontendUrl = getFrontendUrl();
    res.redirect(`${frontendUrl}${FRONTEND_ROUTES.editorClips}?twitch=error`);
  }
};

export const getTwitchAccounts = async (_req: Request, res: Response) => {
  try {
    const accounts = await listTwitchAccounts();
    res.json({ success: true, accounts });
  } catch (error) {
    console.error("Erreur liste comptes Twitch:", error);
    res.status(500).json({ error: "Impossible de lister les comptes Twitch" });
  }
};
