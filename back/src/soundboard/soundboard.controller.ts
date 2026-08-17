import { Request, Response } from "express";
import { clipLog } from "../clips/clipDebug.js";
import { soundboardSearchQuerySchema } from "./soundboard.schema.js";
import { searchSoundboardLibrary } from "./soundboard.service.js";

export async function searchSoundboardClips(req: Request, res: Response) {
  try {
    const parsed = soundboardSearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Paramètres invalides",
        details: parsed.error.flatten(),
      });
    }

    const { q, limit } = parsed.data;
    clipLog.info("soundboard", "Recherche sons", { query: q, limit });
    const result = await searchSoundboardLibrary(q, limit);
    return res.json(result);
  } catch (error) {
    clipLog.error("soundboard", "Échec recherche sons", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(502).json({
      error: "Impossible de charger la bibliothèque de sons pour le moment.",
    });
  }
}
