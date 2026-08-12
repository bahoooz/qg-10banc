import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { CLIPS_SOURCES_DIR, ensureClipDirectories } from "../lib/paths.js";
import {
  ACCEPTED_CLIP_MIME_TYPES,
  MAX_CLIP_UPLOAD_BYTES,
} from "./clips.schema.js";

ensureClipDirectories();

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, CLIPS_SOURCES_DIR);
  },
  filename: (_req, _file, callback) => {
    callback(null, `temp_${randomUUID()}.mp4`);
  },
});

export const clipUpload = multer({
  storage,
  limits: { fileSize: MAX_CLIP_UPLOAD_BYTES },
  fileFilter: (_req, file, callback) => {
    const allowed = ACCEPTED_CLIP_MIME_TYPES as readonly string[];
    const ext = path.extname(file.originalname).toLowerCase();
    const extOk = ext === ".mp4" || ext === ".webm" || ext === ".mov";

    if (allowed.includes(file.mimetype) || extOk) {
      callback(null, true);
      return;
    }

    callback(new Error("Format vidéo non supporté (MP4, WebM, MOV)"));
  },
});
