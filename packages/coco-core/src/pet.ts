/**
 * Framework-free "Coco walks along the bottom of the screen" engine.
 * Used by the Chrome extension (inside a Shadow DOM) and the Electron desktop overlay.
 */
import { cocoSvg } from "./art";
import type { CocoAudio } from "./audio";
import type { CocoPose } from "./mood";

export const PET_CSS = `
.coco-layer{position:fixed;inset:0;pointer-events:none;z-index:2147483646;overflow:hidden}
.coco-pet{position:absolute;bottom:0;left:0;pointer-events:auto;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;will-change:transform}
.coco-pet.held{cursor:grabbing}
.coco-pet svg{width:100%;height:100%;display:block;filter:drop-shadow(0 2px 2px rgba(0,0,0,.18))}
.coco-heart{position:absolute;font-size:18px;pointer-events:none;animation:coco-up 1.1s ease-out forwards}
@keyframes coco-up{from{opacity:0;transform:translateY(0) scale(.5)}20%{opacity:1}to{opacity:0;transform:translateY(-60px) scale(1.1)}}
.coco-say{position:absolute;pointer-events:none;background:#fff;border:2px solid #2B3A55;border-radius:14px;padding:5px 10px;font:600 13px/1.25 "Nunito",system-ui,sans-serif;color:#2B3A55;white-space:nowrap;box-shadow:0 3px 0 rgba(43,58,85,.2);transition:opacity .4s}
.coco-zzz{position:absolute;pointer-events:none;font:700 14px "Patrick Hand",cursive;color:#2B3A55;animation:coco-up 2.4s ease-out infinite}
`;

type State = "walk" | "sit" | "sleep" | "stretch" | "held" | "fall" | "purr" | "follow" | "comfort";

export interface PetOptions {
  layer: HTMLElement;
  audio?: CocoAudio;
  size?: number;
  follow?: boolean;
  accessories?: boolean;
  /** Called when the pointer enters/leaves Coco (desktop click-through). */
  onHover?: (over: boolean) => void;
}

export class CocoPet {
  readonly el: HTMLDivElement;
  private x = 80;
  private y = 0; // height above ground
  private vy = 0;
  private dir = 1;
  private state: State = "sit";
  private timer = 2;
  private step = 0;
  private stepT = 0;
  private blink = false;
  private lastSvg = "";
  private mouse = { x: -1, y: -1 };
  private drag?: { dx: number; dy: number; moved: boolean; sx: number; sy: number };
  private comfortX?: number;
  private raf = 0;
  private last = performance.now();
  private meowT = 60 + Math.random() * 90;
  private sayEl?: HTMLDivElement;
  private zzz?: HTMLDivElement;
  private forcedSleep = false;
  size: number;
  follow: boolean;

  constructor(private opts: PetOptions) {
    this.size = opts.size ?? 90;
    this.follow = opts.follow ?? true;
    this.el = document.createElement("div");
    this.el.className = "coco-pet";
    this.el.setAttribute("role", "img");
    this.el.setAttribute("aria-label", "Coco the cat");
    opts.layer.appendChild(this.el);
    this.x = Math.random() * (innerWidth - this.size);
    this.bind();
    this.blinkLoop();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.el.remove();
    this.sayEl?.remove();
    this.zzz?.remove();
    removeEventListener("pointermove", this.onMove, true);
  }

  setSize(px: number) { this.size = px; this.lastSvg = ""; }
  setSleeping(on: boolean) { this.forcedSleep = on; this.go(on ? "sleep" : "sit", on ? 1e9 : 2); }

  /** Walk over to a spot (e.g. the text box you're typing in) and purr. */
  comfortAt(rect: { left: number; width: number }, intensity = 0.5) {
    const target = Math.min(innerWidth - this.size, Math.max(0, rect.left + rect.width - this.size * 0.6));
    if (this.state === "comfort" || this.comfortX !== undefined) { this.opts.audio?.setPurrIntensity(intensity); return; }
    this.comfortX = target;
    this.go("walk", 30);
    this.dir = target > this.x ? 1 : -1;
    this.pendingIntensity = intensity;
  }
  private pendingIntensity = 0.5;

  endComfort() {
    if (this.comfortX === undefined && this.state !== "comfort") return;
    this.comfortX = undefined;
    this.opts.audio?.stopPurr(2.5);
    this.say("mrrp! 💚", 2500);
    this.go("sit", 3);
  }

  say(text: string, ms = 3000) {
    if (!this.sayEl) {
      this.sayEl = document.createElement("div");
      this.sayEl.className = "coco-say";
      this.opts.layer.appendChild(this.sayEl);
    }
    this.sayEl.textContent = text;
    this.sayEl.style.opacity = "1";
    this.placeBubble();
    clearTimeout((this.sayEl as any)._t);
    (this.sayEl as any)._t = setTimeout(() => { if (this.sayEl) this.sayEl.style.opacity = "0"; }, ms);
  }

  private placeBubble() {
    if (!this.sayEl) return;
    const w = this.sayEl.offsetWidth;
    const left = Math.min(innerWidth - w - 4, Math.max(4, this.x + this.size / 2 - w / 2));
    this.sayEl.style.left = left + "px";
    this.sayEl.style.bottom = this.y + this.size * 0.95 + "px";
  }

  private go(s: State, t: number) { this.state = s; this.timer = t; }

  private blinkLoop() {
    setTimeout(() => { this.blink = true; setTimeout(() => { this.blink = false; this.blinkLoop(); }, 140); }, 2500 + Math.random() * 3500);
  }

  private onMove = (e: PointerEvent) => {
    this.mouse = { x: e.clientX, y: e.clientY };
    if (this.drag) {
      if (Math.abs(e.clientX - this.drag.sx) + Math.abs(e.clientY - this.drag.sy) > 6) this.drag.moved = true;
      if (this.drag.moved) {
        this.state = "held";
        this.el.classList.add("held");
        this.x = e.clientX - this.drag.dx;
        this.y = Math.max(0, innerHeight - e.clientY - this.drag.dy);
      }
    }
  };

  private bind() {
    addEventListener("pointermove", this.onMove, true);
    this.el.addEventListener("pointerenter", () => this.opts.onHover?.(true));
    this.el.addEventListener("pointerleave", () => { if (!this.drag) this.opts.onHover?.(false); });
    this.el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.el.setPointerCapture?.(e.pointerId);
      const r = this.el.getBoundingClientRect();
      this.drag = { dx: e.clientX - r.left, dy: r.bottom - e.clientY, moved: false, sx: e.clientX, sy: e.clientY };
    });
    const up = (e: PointerEvent) => {
      if (!this.drag) return;
      const d = this.drag;
      this.drag = undefined;
      this.el.classList.remove("held");
      if (d.moved) {
        this.vy = 0;
        this.go("fall", 0);
        this.say("mrrow?!", 1400);
      } else {
        this.pet(e.clientX, e.clientY);
      }
    };
    this.el.addEventListener("pointerup", up);
    this.el.addEventListener("pointercancel", up);
  }

  /** Click = pet: purr + hearts. */
  pet(cx: number, cy: number) {
    const a = this.opts.audio;
    if (this.state === "sleep" && !this.forcedSleep) this.go("stretch", 1.2);
    else if (this.state !== "comfort") this.go("purr", 3);
    if (a) {
      a.startPurr(0.6, 0.5);
      if (this.state !== "comfort") setTimeout(() => { if (this.state !== "comfort") a.stopPurr(1.5); }, 2600);
    }
    for (let i = 0; i < 3; i++) {
      const h = document.createElement("div");
      h.className = "coco-heart";
      h.textContent = "❤";
      h.style.color = "#C8323A";
      h.style.left = cx - 8 + (i - 1) * 16 + "px";
      h.style.top = cy - 20 + "px";
      h.style.animationDelay = i * 0.1 + "s";
      this.opts.layer.appendChild(h);
      setTimeout(() => h.remove(), 1400);
    }
  }

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    const maxX = innerWidth - this.size;
    this.timer -= dt;
    const speed = this.size * 0.9;

    if (this.state !== "sleep" && this.state !== "held" && this.state !== "comfort") {
      this.meowT -= dt;
      if (this.meowT <= 0) {
        this.meowT = 90 + Math.random() * 150;
        this.opts.audio?.meow("attention");
        this.say("meow (look at me!)", 2200);
      }
    }

    switch (this.state) {
      case "held": return;
      case "fall":
        this.vy -= 1800 * dt;
        this.y = Math.max(0, this.y + this.vy * dt);
        if (this.y === 0) this.go("sit", 1.5);
        return;
      case "walk": {
        const target = this.comfortX;
        this.x += this.dir * speed * (target !== undefined ? 1.2 : 0.7) * dt;
        if (target !== undefined && Math.abs(this.x - target) < 6) {
          this.x = target;
          this.comfortX = undefined;
          this.go("comfort", 1e9);
          this.opts.audio?.meow("mrrp");
          setTimeout(() => this.opts.audio?.startPurr(this.pendingIntensity, 3), 600);
          this.say("Coco is here with you.", 5000);
          return;
        }
        if (this.x <= 0 || this.x >= maxX) { this.dir *= -1; this.x = Math.min(maxX, Math.max(0, this.x)); }
        break;
      }
      case "follow": {
        const tx = this.mouse.x - this.size / 2;
        const dist = tx - this.x;
        if (Math.abs(dist) < this.size * 0.4) { this.go("sit", 2 + Math.random() * 3); break; }
        this.dir = Math.sign(dist);
        this.x += this.dir * speed * 0.55 * dt; // lazy
        break;
      }
    }
    this.x = Math.min(maxX, Math.max(0, this.x));

    if (this.state === "walk" || this.state === "follow") {
      this.stepT += dt;
      if (this.stepT > 0.22) { this.stepT = 0; this.step++; }
    }

    if (this.timer <= 0 && this.state !== "comfort") this.decide();
  }

  private decide() {
    if (this.forcedSleep) { this.go("sleep", 1e9); return; }
    const h = new Date().getHours();
    const night = h >= 23 || h < 6;
    if (this.state === "sleep") { this.go("stretch", 1.4); return; }
    const mouseFar = this.mouse.x >= 0 && Math.abs(this.mouse.x - (this.x + this.size / 2)) > 220;
    const r = Math.random();
    if (this.follow && mouseFar && r < 0.45) { this.go("follow", 6); return; }
    if (r < (night ? 0.6 : 0.18)) { this.go("sleep", 20 + Math.random() * 40); return; }
    if (r < 0.6) { this.dir = Math.random() < 0.5 ? -1 : 1; this.go("walk", 3 + Math.random() * 5); return; }
    this.go("sit", 3 + Math.random() * 5);
  }

  private render() {
    const map: Record<State, CocoPose> = {
      walk: "walk", follow: "walk", sit: "sit", sleep: "sleep", stretch: "stretch",
      held: "puff", fall: "puff", purr: "purr", comfort: "purr",
    };
    const pose = map[this.state];
    const svg = cocoSvg({ pose, blink: this.blink, step: this.step, accessories: this.opts.accessories ?? true });
    if (svg !== this.lastSvg) {
      this.el.innerHTML = svg;
      this.lastSvg = svg;
      this.el.style.width = this.size + "px";
      this.el.style.height = this.size * (210 / 220) + "px";
    }
    this.el.style.transform = `translate(${this.x}px, ${-this.y}px) scaleX(${this.dir < 0 && pose !== "sit" && pose !== "purr" ? -1 : 1})`;
    if (this.sayEl?.style.opacity === "1") this.placeBubble();
    if (pose === "sleep") {
      if (!this.zzz) {
        this.zzz = document.createElement("div");
        this.zzz.className = "coco-zzz";
        this.zzz.textContent = "z z z";
        this.opts.layer.appendChild(this.zzz);
      }
      this.zzz.style.left = this.x + this.size * 0.2 + "px";
      this.zzz.style.bottom = this.y + this.size * 0.7 + "px";
    } else if (this.zzz) { this.zzz.remove(); this.zzz = undefined; }
  }
}
