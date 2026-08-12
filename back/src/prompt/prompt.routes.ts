import express from "express";
import { getCurrentPrompt, getPrompts, updatePrompt } from "./prompt.controller.js";
const router = express.Router();

router.get("/", getPrompts);
router.get("/:id", getCurrentPrompt)
router.patch("/:id", updatePrompt)

export default router;
