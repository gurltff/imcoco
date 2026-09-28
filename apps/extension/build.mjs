import { build } from "esbuild";
import { cpSync, mkdirSync, readdirSync, rmSync, readFileSync, writeFileSync, createWriteStream } from "node:fs";
import { execSync } from "node:child_process";

const APP_URL = process.env.COCO_APP_URL || "https://gurltff.github.io/imcoco/";
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/audio", { recursive: true });
await build({
  entryPoints: { content: "src/content.ts", popup: "src/popup.ts" },
  bundle: true, format: "iife", target: "chrome110", outdir: "dist", minify: true,
});
// replace the placeholder string (kept as a literal for readability in settings.ts)
for (const f of ["dist/content.js", "dist/popup.js"]) writeFileSync(f, readFileSync(f, "utf8").replaceAll("__APP_URL__", APP_URL));
cpSync("public", "dist", { recursive: true });
for (const f of readdirSync("../../assets/audio")) if (f.endsWith(".mp3")) cpSync(`../../assets/audio/${f}`, `dist/audio/${f}`);
// Zip for download from the web app
try {
  execSync(`cd dist && python3 -c "import shutil; shutil.make_archive('../../web/public/coco-extension', 'zip', '.')"`);
  console.log("✓ apps/web/public/coco-extension.zip");
} catch { console.log("(zip skipped)"); }
console.log("✓ built apps/extension/dist — load it via chrome://extensions → Load unpacked");
