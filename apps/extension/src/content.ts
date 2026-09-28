/** Injects Coco into every page inside a closed Shadow DOM so no styles leak either way. */
import { CocoAudio, CocoPet, PET_CSS, TypingRhythm, analyzeText } from "@coco/core";
import { loadSettings, onSettings, type ExtSettings } from "./settings";

if (window.top === window && !(window as any).__cocoInjected) {
  (window as any).__cocoInjected = true;
  main();
}

async function main() {
  let s: ExtSettings = await loadSettings();
  const host = location.hostname;
  const audio = new CocoAudio({ meowUrls: [chrome.runtime.getURL("audio/meow_1.mp3")] });
  let pet: CocoPet | undefined;
  let hostEl: HTMLElement | undefined;

  // Audio may only start after a user gesture on the page.
  const unlock = () => { if (pet) audio.unlock(); };
  addEventListener("pointerdown", unlock, { capture: true, passive: true });
  addEventListener("keydown", unlock, { capture: true, passive: true });

  const allowed = () => s.enabled && !s.deny.includes(host);

  function mount() {
    hostEl = document.createElement("coco-corner-pet");
    hostEl.style.cssText = "all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483646";
    const root = hostEl.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = PET_CSS;
    const layer = document.createElement("div");
    layer.className = "coco-layer";
    root.append(style, layer);
    document.documentElement.appendChild(hostEl);
    pet = new CocoPet({ layer, audio, size: s.size, follow: s.follow });
  }
  function unmount() { pet?.destroy(); pet = undefined; hostEl?.remove(); hostEl = undefined; audio.stopPurr(0.5); }

  let wasSleeping = s.sleeping;
  function apply() {
    if (allowed() && !pet) { mount(); if (s.sleeping) pet!.setSleeping(true); }
    if (!allowed() && pet) unmount();
    audio.setMuted(s.muted);
    audio.setVolume(s.volume);
    if (pet) {
      if (pet.size !== s.size) pet.setSize(s.size);
      pet.follow = s.follow;
      if (s.sleeping !== wasSleeping) pet.setSleeping(s.sleeping);
    }
    wasSleeping = s.sleeping;
  }
  apply();
  onSettings((ns) => { s = ns; apply(); });

  // ---- Opt-in comfort: runs only on this page, nothing is stored or sent ----
  const rhythm = new TypingRhythm();
  let comforting = false;
  let timer: number | undefined;
  let leaveTimer: number | undefined;
  const textOf = (el: Element): string | null => {
    if (el instanceof HTMLTextAreaElement) return el.value;
    if (el instanceof HTMLInputElement) return ["text", "search", ""].includes(el.type) ? el.value : null;
    if (el instanceof HTMLElement && el.isContentEditable) return el.innerText;
    return null;
  };
  document.addEventListener("keydown", (e) => { if (s.comfort) rhythm.record(e.key === "Backspace" || e.key === "Delete"); }, true);
  document.addEventListener("input", (e) => {
    if (!s.comfort || !pet) return;
    const el = e.target as Element;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const text = textOf(el);
      if (text == null || !pet) return;
      const recent = text.slice(-400);
      const r = analyzeText(recent, rhythm.signals());
      if (r.sadness >= 0.45) {
        comforting = true;
        pet.comfortAt(el.getBoundingClientRect(), Math.max(0.3, r.sadness * 0.8));
      } else if (comforting) {
        const tail = analyzeText(recent.slice(-80));
        if (tail.positivity >= 0.5 && tail.sadness < 0.2) { comforting = false; pet.endComfort(); }
      }
    }, 700);
  }, true);
  document.addEventListener("focusout", () => {
    if (!comforting) return;
    clearTimeout(leaveTimer);
    leaveTimer = window.setTimeout(() => { if (comforting && pet) { comforting = false; pet.endComfort(); } }, 25_000);
  }, true);
  document.addEventListener("focusin", () => clearTimeout(leaveTimer), true);
}
