import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const WORK_BG = "#0E4F5C";

// Served from https://saasiestthomas.github.io/motivatition-timer/ on GitHub Pages.
// Change to "/" if the app ever moves to a host that serves it from the domain root.
const BASE = "/motivatition-timer/";

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Motivation Timer",
        short_name: "Motivation",
        description:
          "A dead-simple interval timer that flips between Work Hard and Play Hard and loops until you stop.",
        theme_color: WORK_BG,
        background_color: WORK_BG,
        display: "standalone",
        orientation: "portrait",
        id: BASE,
        start_url: BASE,
        scope: BASE,
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
