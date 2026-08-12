import express from "express";
import {
  getTwitchAccounts,
  startTwitchLogin,
  twitchCallback,
} from "./twitch.controller.js";

const router = express.Router();

router.get("/auth/login", startTwitchLogin);
router.get("/auth/callback", twitchCallback);
router.get("/accounts", getTwitchAccounts);

export default router;
