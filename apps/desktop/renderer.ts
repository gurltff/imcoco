// Same Coco character, animation and audio as the web app + extension (packages/coco-core).
import { CocoAudio, CocoPet, PET_CSS } from "../../packages/coco-core/src/index";

declare global {
  interface Window { cocoDesktop: { hover(over: boolean): void; onSettings(fn: (s: any) => void): void } }
}

const style = document.createElement("style");
style.textContent = PET_CSS;
document.head.appendChild(style);

const audio = new CocoAudio({ meowUrls: ["dist/audio/meow_1.mp3"] });
const pet = new CocoPet({
  layer: document.getElementById("layer")!,
  audio,
  size: 96,
  onHover: (over) => window.cocoDesktop.hover(over),
});
// Electron allows audio without a gesture here.
audio.unlock();

let sleeping = false;
window.cocoDesktop.onSettings((s) => {
  audio.setMuted(s.muted);
  audio.setVolume(s.volume);
  if (pet.size !== s.size) pet.setSize(s.size);
  if (s.sleeping !== sleeping) { sleeping = s.sleeping; pet.setSleeping(sleeping); }
});
