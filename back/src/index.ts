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
import soundboardRoutes from "./soundboard/soundboard.routes.js";
import clipTemplateRoutes from "./clipTemplates/clipTemplate.routes.js";
import savedClipRoutes from "./savedClips/savedClip.routes.js";
import streamMarkerRoutes from "./streamMarkers/streamMarker.routes.js";
import { startStreamMarkerJobs } from "./streamMarkers/streamMarker.jobs.js";
import { errorHandler } from "../middlewares/errorHandler.js";
import {
  CLIPS_EXPORTS_DIR,
  CLIPS_PREVIEWS_DIR,
  CLIPS_SOURCES_DIR,
  CUT_OUTPUT_DIR,
  FRONT_DIST_DIR,
  MEDIA_DIR,
  ensureClipDirectories,
  ensureFrontDistExists,
  logResolvedPaths,
} from "./lib/paths.js";
import {
  getApiUrl,
  getCorsOrigins,
  getPort,
  isProduction,
  validateProductionEnv,
} from "./config/env.js";
import { runStartupChecks } from "./lib/startupChecks.js";
import { purgeExpiredSavedClipsService } from "./savedClips/savedClip.service.js";
import { loadSubtitleFontRegistry } from "./clips/subtitleFonts.config.js";
import { purgeStaleClipArtifacts } from "./clips/clipsStorage.service.js";
import { logger } from "./lib/logger.js";

validateProductionEnv();
logResolvedPaths();
runStartupChecks();
loadSubtitleFontRegistry();
ensureClipDirectories();
startStreamMarkerJobs();
void purgeExpiredSavedClipsService().then((count) => {
  if (count > 0) {
    console.log(`[clips] ${count} clip(s) expiré(s) supprimé(s) automatiquement`);
  }
});
const staleArtifactsRemoved = purgeStaleClipArtifacts();
if (staleArtifactsRemoved > 0) {
  console.log(
    `[clips] ${staleArtifactsRemoved} artefact(s) temporaire(s) supprimé(s) au démarrage`,
  );
}

const CLIPS_PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;
setInterval(() => {
  void purgeExpiredSavedClipsService().then((count) => {
    if (count > 0) {
      console.log(`[clips] Purge planifiée : ${count} clip(s) expiré(s) supprimé(s)`);
    }
  });
  const removed = purgeStaleClipArtifacts();
  if (removed > 0) {
    console.log(`[clips] Purge planifiée : ${removed} artefact(s) temporaire(s) supprimé(s)`);
  }
}, CLIPS_PURGE_INTERVAL_MS);
if (isProduction) {
  ensureFrontDistExists();
}

const app = express();
const apiUrl = getApiUrl();
const port = getPort();

app.set("trust proxy", 1);

const allowedCorsOrigins = getCorsOrigins();

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Requêtes same-origin / curl / healthchecks sans header Origin
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedCorsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    console.warn(
      `[cors] Origin refusée: ${origin} | autorisées: ${allowedCorsOrigins.join(", ")}`,
    );
    callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

/** CORS pour les fichiers clips (capture canvas cross-origin depuis le front). */
function clipsMediaCors(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const origin = req.headers.origin;
  if (origin && allowedCorsOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  next();
}

app.use("/media", express.static(MEDIA_DIR));
app.use("/output", express.static(CUT_OUTPUT_DIR));
app.use("/clips/previews", clipsMediaCors, express.static(CLIPS_PREVIEWS_DIR));
app.use("/clips/sources", clipsMediaCors, express.static(CLIPS_SOURCES_DIR));
app.use("/clips/exports", clipsMediaCors, express.static(CLIPS_EXPORTS_DIR));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "qg-back" });
});

app.use(streamMarkerRoutes);

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
app.use("/soundboard", soundboardRoutes);
app.use("/clip-templates", clipTemplateRoutes);
app.use("/saved-clips", savedClipRoutes);

/** Répond explicitement aux routes API inconnues (évite un 404 silencieux / SPA). */
app.use((req, res, next) => {
  if (!isBackendRoute(req.path)) {
    next();
    return;
  }

  logger.warn("http", "Route API introuvable", {
    method: req.method,
    path: req.originalUrl,
  });

  res.status(404).json({
    errorCode: "NOT_FOUND",
    message: "Route API introuvable",
  });
});

/** Préfixes réservés à l'API — ne pas servir index.html pour ces routes. */
const API_PATH_PREFIXES = [
  "/api",
  "/cut",
  "/video",
  "/prompt",
  "/tiktok",
  "/youtube",
  "/twitch",
  "/auth",
  "/users",
  "/stats",
  "/notes",
  "/clips",
  "/soundboard",
  "/clip-templates",
  "/saved-clips",
  "/streamers",
  "/live-status",
  "/markers",
  "/media",
  "/output",
  "/health",
] as const;

function isBackendRoute(pathname: string): boolean {
  return API_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

app.use(
  express.static(FRONT_DIST_DIR, {
    index: false,
    fallthrough: true,
  }),
);

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }

  if (isBackendRoute(req.path)) {
    next();
    return;
  }

  // Fichier statique manquant (ex. /assets/xxx.js) → 404, pas index.html
  if (path.extname(req.path)) {
    next();
    return;
  }

  res.sendFile(path.join(FRONT_DIST_DIR, "index.html"), (error) => {
    if (error) next(error);
  });
});

app.use(errorHandler);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port} — ${apiUrl}`);
  console.log(`[static] Frontend servi depuis ${FRONT_DIST_DIR}`);
  console.log(`[cors] Origines autorisées: ${allowedCorsOrigins.join(", ")}`);
  logger.info("startup", "Routes éditeur clips actives", {
    clips: "/clips",
    savedClips: "/saved-clips",
    clipTemplates: "/clip-templates",
    soundboard: "/soundboard",
  });
});
