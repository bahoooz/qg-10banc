import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // devOptions: {
      //   enabled: true,
      // },
      workbox: {
        // Ne pas intercepter les routes API (OAuth, uploads, etc.)
        navigateFallbackDenylist: [
          /^\/tiktok/,
          /^\/youtube/,
          /^\/twitch/,
          /^\/auth/,
          /^\/clips/,
          /^\/cut/,
          /^\/video/,
          /^\/prompt/,
          /^\/users/,
          /^\/stats/,
          /^\/notes/,
          /^\/media/,
          /^\/output/,
          /^\/health/,
          /^\/api/,
        ],
      },
      includeAssets: ["assets/pwa/*.png"],
      manifest: {
        name: "QG 10banc",
        short_name: "QG 10banc",
        description: "Gestion des projets et de l'équipe",
        theme_color: "#23242e",
        icons: [
          {
            src: "assets/pwa/192.png", // Vérifie le nom exact généré (ex: android-chrome-192x192.png)
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "assets/pwa/512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "assets/pwa/launchericon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable", // Très important pour que l'icône soit propre sur Android
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
