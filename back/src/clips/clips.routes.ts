import express from "express";
import { verifySessionToken } from "../../middlewares/authHandler.js";
import {
  uploadClip,
  importTwitchClipHandler,
  applyClipCut,
  exportClip,
  getExportClipJob,
  transcribeClip,
} from "./clips.controller.js";
import { clipUpload } from "./clips.multer.js";

const router = express.Router();

router.post(
  "/upload",
  verifySessionToken,
  clipUpload.single("file"),
  uploadClip,
);

router.post("/twitch", verifySessionToken, importTwitchClipHandler);

router.post("/:id/cut", verifySessionToken, applyClipCut);

router.post("/:id/transcribe", verifySessionToken, transcribeClip);

router.get("/export-jobs/:jobId", verifySessionToken, getExportClipJob);

router.post("/:id/export", verifySessionToken, exportClip);

export default router;
