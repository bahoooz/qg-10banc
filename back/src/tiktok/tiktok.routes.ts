import express from "express";
import {
  listConnectedAccounts,
  startTiktokLogin,
  tiktokCallback,
  uploadDraftFromUrl,
} from "./tiktok.controller.js";

const router = express.Router();

router.get("/auth/login", startTiktokLogin);
router.get("/auth/callback", tiktokCallback);

router.get("/accounts", listConnectedAccounts);

router.post("/upload-draft", uploadDraftFromUrl);

export default router;
