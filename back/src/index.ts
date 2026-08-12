import "../loadEnv.js";
// import "../cron.js";
import express from "express";
import cookieParser from "cookie-parser";
import cors, { CorsOptions } from "cors";
import path from "path";
import videoRoutes from "./video/video.routes.js";
import promptRoutes from "./prompt/prompt.routes.js";
import tiktokRoutes from "./tiktok/tiktok.routes.js";
import youtubeRoutes from "./youtube/youtube.routes.js";
import twitchRoutes from "./twitch/twitch.routes.js";
import authRoutes from "./auth/auth.routes.js";
import cutRoutes from "./cut/cut.routes.js";
import userRoutes from "./user/user.routes.js";
import statsRoutes from "./stats/stats.routes.js";
import notesRoutes from "./notes/notes.routes.js";
import clipsRoutes from "./clips/clips.routes.js";
import { errorHandler } from "../middlewares/errorHandler.js";
import {
  CLIPS_EXPORTS_DIR,
  CLIPS_PREVIEWS_DIR,
  CLIPS_SOURCES_DIR,
  ensureClipDirectories,
} from "./lib/paths.js";
import {
  getApiUrl,
  getCorsOrigins,
  getPort,
  validateProductionEnv,
} from "./config/env.js";
import { runStartupChecks } from "./lib/startupChecks.js";

validateProductionEnv();
runStartupChecks();
ensureClipDirectories();

const app = express();
const apiUrl = getApiUrl();
const port = getPort();

app.set("trust proxy", 1);

app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

const corsOptions: CorsOptions = {
  origin: getCorsOrigins(),
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use("/media", express.static(path.join(process.cwd(), "media")));
app.use("/output", express.static(path.join(process.cwd(), "cut", "output")));
app.use("/clips/previews", express.static(CLIPS_PREVIEWS_DIR));
app.use("/clips/sources", express.static(CLIPS_SOURCES_DIR));
app.use("/clips/exports", express.static(CLIPS_EXPORTS_DIR));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "qg-back" });
});

app.get("/", (_req, res) => {
  res.send("<h1>QG 10banc API</h1>");
});

app.use("/cut", cutRoutes);
app.use("/video", videoRoutes);
app.use("/prompt", promptRoutes);
app.use("/tiktok", tiktokRoutes);
app.use("/youtube", youtubeRoutes);
app.use("/twitch", twitchRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/stats", statsRoutes);
app.use("/notes", notesRoutes);
app.use("/clips", clipsRoutes);

app.use(errorHandler);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port} — ${apiUrl}`);
});
