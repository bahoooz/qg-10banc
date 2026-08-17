import express from "express";
import { verifySessionToken } from "../../middlewares/authHandler.js";
import {
  createClipTemplate,
  deleteClipTemplate,
  getClipTemplate,
  listClipTemplates,
} from "./clipTemplate.controller.js";

const router = express.Router();

router.get("/", verifySessionToken, listClipTemplates);
router.get("/:id", verifySessionToken, getClipTemplate);
router.post("/", verifySessionToken, createClipTemplate);
router.delete("/:id", verifySessionToken, deleteClipTemplate);

export default router;
