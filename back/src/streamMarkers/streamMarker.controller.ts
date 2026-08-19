import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils.js";
import {
  createMarkerSchema,
  liveStatusQuerySchema,
} from "./streamMarker.schema.js";
import {
  createMarker,
  getStreamerLiveStatus,
  listActiveStreamers,
} from "./streamMarker.service.js";

export async function getStreamersHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const streamers = await listActiveStreamers();
    res.status(200).json(streamers);
  } catch (error) {
    next(error);
  }
}

export async function getLiveStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = liveStatusQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "streamer_id requis");
    }

    const status = await getStreamerLiveStatus(parsed.data.streamer_id);
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
}

export async function createMarkerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = createMarkerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Corps de requête invalide");
    }

    const result = await createMarker(parsed.data);
    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
}
