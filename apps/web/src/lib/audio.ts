import { CocoAudio } from "@coco/core";
import { readLocal, DEFAULT_SETTINGS, type Settings } from "./store";

// Any file dropped into /assets/audio as meow_*.mp3 is picked up automatically.
const meowFiles = import.meta.glob("../../../../assets/audio/meow_*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
// Optional real purr recording; if absent, a synthesized cat purr is used.
const purrFiles = import.meta.glob("../../../../assets/audio/purr*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

type CaptionFn = (text: string) => void;
const captionListeners = new Set<CaptionFn>();
export const onCaption = (fn: CaptionFn) => { captionListeners.add(fn); return () => { captionListeners.delete(fn); }; };

export const coco = new CocoAudio({
  meowUrls: Object.values(meowFiles),
  purrUrl: Object.values(purrFiles)[0],
  onCaption: (t) => captionListeners.forEach((fn) => fn(t)),
});

const s = readLocal<Settings>("settings", DEFAULT_SETTINGS);
coco.setVolume(s.volume);
coco.setMuted(s.muted);

// Browsers block audio until a user gesture: unlock + preload on the very first one.
const unlockOnce = () => {
  coco.unlock();
  ["pointerdown", "keydown", "touchstart"].forEach((e) => window.removeEventListener(e, unlockOnce));
};
["pointerdown", "keydown", "touchstart"].forEach((e) => window.addEventListener(e, unlockOnce, { passive: true }));
