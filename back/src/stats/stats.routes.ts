import express from "express";
import { verifySessionToken } from "../../middlewares/authHandler.js";

const router = express.Router();

router.get("/", verifySessionToken, )

export default router;