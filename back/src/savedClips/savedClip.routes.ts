import express from "express";
import { verifySessionToken } from "../../middlewares/authHandler.js";
import {
  createSavedClip,
  deleteSavedClip,
  downloadSavedClip,
  getSavedClip,
  getSavedClipsStorage,
  listSavedClips,
  updateSavedClip,
} from "./savedClip.controller.js";

const router = express.Router();

router.get("/storage", verifySessionToken, getSavedClipsStorage);
router.get("/", verifySessionToken, listSavedClips);
router.get("/:id/download", verifySessionToken, downloadSavedClip);
router.get("/:id", verifySessionToken, getSavedClip);
router.post("/", verifySessionToken, createSavedClip);
router.put("/:id", verifySessionToken, updateSavedClip);
router.delete("/:id", verifySessionToken, deleteSavedClip);

export default router;
