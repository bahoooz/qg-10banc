import express from "express";
import { verifySessionToken } from "../../middlewares/authHandler.js";
import {
  callback,
  listYouTubeAccounts,
  login,
  publishYouTubeVideo,
} from "./youtube.controller.js";

const router = express.Router();

router.get("/auth/login", login);
router.get("/auth/callback", callback);
router.get("/accounts", listYouTubeAccounts);
router.post("/publish", verifySessionToken, publishYouTubeVideo);

export default router;
