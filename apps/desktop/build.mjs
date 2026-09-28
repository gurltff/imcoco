import { build } from "esbuild";
import { cpSync, mkdirSync, readdirSync } from "node:fs";

mkdirSync("dist/audio", { recursive: true });
await build({ entryPoints: ["renderer.ts"], bundle: true, format: "iife", target: "chrome120", outfile: "dist/renderer.js" });
for (const f of readdirSync("../../assets/audio")) if (f.endsWith(".mp3")) cpSync(`../../assets/audio/${f}`, `dist/audio/${f}`);
console.log("✓ renderer built");
