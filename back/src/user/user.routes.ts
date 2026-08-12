import express from "express";
import { getSpecificUser, getUsers } from "./user.controller.js";
import { verifyGatekeeperToken } from "../../middlewares/authHandler.js";

const router = express.Router();

router.get("/", verifyGatekeeperToken, getUsers);
router.get("/:username", verifyGatekeeperToken, getSpecificUser)

export default router;
