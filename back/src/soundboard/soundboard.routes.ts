import express from "express";
import { verifySessionToken } from "../../middlewares/authHandler.js";
import { searchSoundboardClips } from "./soundboard.controller.js";

const router = express.Router();

router.get("/search", verifySessionToken, searchSoundboardClips);

export default router;
