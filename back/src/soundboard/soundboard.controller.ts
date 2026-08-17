import { Request, Response } from "express";
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
    const result = await searchSoundboardLibrary(q, limit);
    return res.json(result);
  } catch (error) {
    console.error("[soundboard] search error:", error);
    return res.status(502).json({
      error: "Impossible de charger la bibliothèque de sons pour le moment.",
    });
  }
}
