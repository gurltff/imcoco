import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
import { viteSingleFile } from "vite-plugin-singlefile";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig(({ mode }) => ({
  base: "./",
  server: { fs: { allow: [repoRoot] } },
  build: mode === "artifact" ? { outDir: "dist-artifact", assetsInlineLimit: 100_000_000 } : undefined,
  plugins: [
    react(),
    mode === "artifact" ? viteSingleFile() : VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-192.png"],
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,mp3,woff2}"], globIgnores: ["coco-extension.zip"] },
      manifest: {
        name: "Coco's Corner",
        short_name: "Coco",
        description: "A cosy little corner where Coco is always around.",
        theme_color: "#A9C8E3",
        background_color: "#FBF3DC",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
    }),
  ],
}));
