import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import fs from "node:fs";
import path from "node:path";

const SUBTITLE_FONTS_SRC = path.resolve(__dirname, "../assets/subtitle-fonts");

function subtitleFontsPlugin(): Plugin {
  const copyFontFiles = (destDir: string): void => {
    if (!fs.existsSync(SUBTITLE_FONTS_SRC)) return;

    fs.mkdirSync(destDir, { recursive: true });
    for (const name of fs.readdirSync(SUBTITLE_FONTS_SRC)) {
      if (name === "manifest.json" || name.endsWith(".md")) continue;
      const srcPath = path.join(SUBTITLE_FONTS_SRC, name);
      if (!fs.statSync(srcPath).isFile()) continue;
      fs.copyFileSync(srcPath, path.join(destDir, name));
    }
  };

  return {
    name: "subtitle-fonts",
    configureServer(server) {
      server.middlewares.use("/subtitle-fonts", (req, res, next) => {
        const rawUrl = req.url ?? "";
        const fileName = path.basename(rawUrl.split("?")[0] ?? "");
        if (!fileName || fileName.includes("..")) {
          next();
          return;
        }

        const filePath = path.join(SUBTITLE_FONTS_SRC, fileName);
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          next();
          return;
        }

        const ext = path.extname(fileName).toLowerCase();
        const mime =
          ext === ".woff2"
            ? "font/woff2"
            : ext === ".woff"
              ? "font/woff"
              : ext === ".otf"
                ? "font/otf"
                : "font/ttf";
        res.setHeader("Content-Type", mime);
        fs.createReadStream(filePath).pipe(res);
      });
    },
    closeBundle() {
      copyFontFiles(path.resolve(__dirname, "dist/subtitle-fonts"));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    subtitleFontsPlugin(),
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
          /^\/saved-clips/,
          /^\/clip-templates/,
          /^\/soundboard/,
          /^\/editor-clips/,
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
      "@qg/subtitle-composition": path.resolve(
        __dirname,
        "../packages/subtitle-composition/src/index.ts",
      ),
    },
  },
});
