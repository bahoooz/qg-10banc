import { linkVodsAndOrphanMarkers } from "./streamMarker.twitch.js";
import { logger } from "../lib/logger.js";

const VOD_LINK_INTERVAL_MS = 15 * 60 * 1000;

export function startStreamMarkerJobs(): void {
  const run = () => {
    void linkVodsAndOrphanMarkers()
      .then(() => {
        logger.info("streamMarkers", "Tâche VOD / marqueurs orphelins terminée");
      })
      .catch((error) => {
        logger.warn("streamMarkers", "Tâche VOD / marqueurs orphelins en échec", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  };

  run();
  setInterval(run, VOD_LINK_INTERVAL_MS);
}
