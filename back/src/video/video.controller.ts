import { Request, Response } from "express";
import {
  createVideoService,
  getAllVideosService,
  getStatusVideoService,
} from "./video.service.js";

export const createVideo = async (req: Request, res: Response) => {
  try {
    // GENERER AVEC LA VIDEO (VEO3)
    const { prompt } = req.body;

    const generatedVideo = await createVideoService(prompt);

    return res.status(200).json({
      message: "Video generated successfully and save",
      video: generatedVideo,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getStatusVideo = async (req: Request, res: Response) => {
  try {
    const operationId = req.params.operationId;
    if (typeof operationId !== "string") {
      return res.status(400).json({ error: "operationId invalide" });
    }
    const protocol = req.protocol;
    const host = req.get("host")!;

    const videoStatusData = await getStatusVideoService({
      operationId,
      protocol,
      host,
    });

    const { existingVideoUpdated, dataStatusVideo, localUrl } = videoStatusData;

    return res
      .status(200)
      .json({ existingVideoUpdated, dataStatusVideo, localUrl });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAllVideos = async (_req: Request, res: Response) => {
  try {
    const videos = await getAllVideosService();

    return res.status(200).json(videos);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};