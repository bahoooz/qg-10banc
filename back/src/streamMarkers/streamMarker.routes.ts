import express from "express";
import { verifyStreamMarkerToken } from "../../middlewares/streamMarkerAuth.js";
import {
  createMarkerHandler,
  getLiveStatusHandler,
  getStreamersHandler,
} from "./streamMarker.controller.js";

const router = express.Router();

router.use(verifyStreamMarkerToken);

router.get("/streamers", getStreamersHandler);
router.get("/live-status", getLiveStatusHandler);
router.post("/markers", createMarkerHandler);

export default router;
