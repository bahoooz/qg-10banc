import express from "express";
import { callback, listYouTubeAccounts, login } from "./youtube.controller.js";

const router = express.Router();

router.get("/auth/login", login);
router.get("/auth/callback", callback);
router.get("/accounts", listYouTubeAccounts);

export default router;
