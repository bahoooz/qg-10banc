import { useEffect } from "react";
import { useUpdatePresence } from "./useUpdatePresence";

export const useHeartbeat = (intervalMs: number = 30000) => {
  const { mutate: updatePresence } = useUpdatePresence();

  useEffect(() => {
    const handlePing = () => {
      if (document.visibilityState === "visible") {
        updatePresence();
      }
    };

    // 1. Lancement du cycle
    const interval = setInterval(handlePing, intervalMs);

    // 2. Ping immédiat au montage (si visible)
    handlePing();

    // 3. Bonus : Ping quand l'utilisateur revient sur l'onglet après une absence
    document.addEventListener("visibilitychange", handlePing);

    // 4. Cleanup
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handlePing);
    };
  }, [updatePresence, intervalMs]);
};