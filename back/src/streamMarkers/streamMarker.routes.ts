import express from "express";
import { verifyStreamMarkerToken } from "../../middlewares/streamMarkerAuth.js";
import {
  createMarkerHandler,
  getLiveStatusHandler,
  getStreamersHandler,
} from "./streamMarker.controller.js";

const router = express.Router();

router.get("/streamers", verifyStreamMarkerToken, getStreamersHandler);
router.get("/live-status", verifyStreamMarkerToken, getLiveStatusHandler);
router.post("/markers", verifyStreamMarkerToken, createMarkerHandler);

export default router;
