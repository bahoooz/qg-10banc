import express from "express";
import {
  listConnectedAccounts,
  queryCreatorInfo,
  startTiktokLogin,
  tiktokCallback,
  uploadDraftFromUrl,
} from "./tiktok.controller.js";

const router = express.Router();

router.get("/auth/login", startTiktokLogin);
router.get("/auth/callback", tiktokCallback);

router.get("/accounts", listConnectedAccounts);

router.get("/creator-info/:openId", queryCreatorInfo);

router.post("/upload-draft", uploadDraftFromUrl);

export default router;
