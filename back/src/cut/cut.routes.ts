import express from "express";
import { CutVideo } from "./cut.controller.js";
import { upload } from "../../multer.js";

const router = express.Router();

router.post("/", upload.single("file"), CutVideo);

export default router;
