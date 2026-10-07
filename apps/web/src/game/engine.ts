/**
 * Coco's Home: a light Canvas 2D isometric world in thin black line art.
 * Runs ~30fps, pauses when hidden. Coco + stray cats are drawn from the shared SVG art.
 */
import idleUrl from "./sprites/coco-idle.png";
import runUrl from "./sprites/coco-run.png";
import sleepUrl from "./sprites/coco-sleep.png";
import sitUrl from "./sprites/coco-sit.png";
import loafUrl from "./sprites/coco-loaf.png";
import happyUrl from "./sprites/coco-happy.png";
import greyIdle from "./sprites/stray-grey-idle.png";
import greyRun from "./sprites/stray-grey-run.png";
import gingerIdle from "./sprites/stray-ginger-idle.png";
import gingerRun from "./sprites/stray-ginger-run.png";

// Coco's sprites: "Black Cat" by Carysaurus (free asset), eyes recoloured green.
const SHEETS: Record<string, string> = {
  idle: idleUrl, run: runUrl, sleep: sleepUrl, sit: sitUrl, loaf: loafUrl, happy: happyUrl,
  "grey-idle": greyIdle, "grey-run": greyRun, "ginger-idle": gingerIdle, "ginger-run": gingerRun,
};
/** Size of one world pixel in CSS px (the pixel-art grain). */
const PX = 2;
const CREAM = "#f7eed8";

export interface WorldCallbacks {
  onTapCoco(sleeping: boolean): void;
  onTapMailbox(): void;
  onAttention(on: boolean): void;
  onStandoff(on: boolean): void;
  onFed(foodId: string): void;
  onNightChange(night: boolean): void;
  onMunch(): void;
  getOwned(): string[];
  getChonk(): number;
  getBehaviours(): number;
}

type CocoState = "idle" | "walk" | "nap" | "eat" | "chase" | "puff" | "cuddle" | "sleep" | "zoom" | "happy";
interface Stray { gx: number; gy: number; tx: number; ty: number; fur: "grey" | "ginger"; mode: "enter" | "standoff" | "flee" | "leave"; dir: number }
interface Floater { x: number; y: number; text: string; t: number; color: string; size: number }

const INK = "#3b2a20";
const YELLOW = "#FFE95C";


export class WorldEngine {
  private ctx: CanvasRenderingContext2D; // low-res pixel layer
  private screen: CanvasRenderingContext2D;
  private low = document.createElement("canvas");
  private sheets: Record<string, HTMLImageElement> = {};
  private W = 390; private H = 600; private dpr = 1;
  private TW = 48; private TH = 24; private ox = 195; private oy = 120;
  private imgs = new Map<string, HTMLImageElement>();
  private raf = 0; private last = 0; private acc = 0; private time = 0;
  private coco = { gx: 4.5, gy: 4.5, tx: 4.5, ty: 4.5, state: "idle" as CocoState, t: 2, dir: 1, step: 0, stepT: 0, blink: false, speed: 1.2 };
  private attention = false; private attentionT = 25;
  private bowl: string | null = null;
  private strays: Stray[] = [];
  private strayT = 22;
  private floaters: Floater[] = [];
  private butterfly = { x: 0, y: 0, phase: Math.random() * 10 };
  private night = false;
  private blinkT = 3;
  private munchT = 0;
  private ro: ResizeObserver;

  constructor(private canvas: HTMLCanvasElement, private cb: WorldCallbacks) {
    this.screen = canvas.getContext("2d")!;
    this.ctx = this.low.getContext("2d")!;
    for (const [k, url] of Object.entries(SHEETS)) { const im = new Image(); im.src = url; this.sheets[k] = im; }
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    canvas.addEventListener("pointerdown", this.onTap);
    this.night = this.isNight();
    if (this.night) { this.coco.state = "sleep"; this.placeSleep(); }
    cb.onNightChange(this.night);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() { cancelAnimationFrame(this.raf); this.ro.disconnect(); this.canvas.removeEventListener("pointerdown", this.onTap); }

  // ---------- public API ----------
  feed(food: string) {
    this.bowl = food;
    this.attention = false; this.cb.onAttention(false);
    const [bx, by] = this.bowlPos();
    this.goTo(bx + 0.55, by + 0.2, "walk", 1.8);
    this.coco.state = "walk";
    this.pendingEat = true;
    this.float("!!", this.cocoScreen(), "#111", 22);
  }
  private pendingEat = false;

  cuddle(on: boolean) {
    if (on) { this.coco.state = "cuddle"; this.coco.t = 999; this.heartBurst(); }
    else if (this.coco.state === "cuddle") { this.coco.state = this.night ? "sleep" : "happy"; this.coco.t = 1.5; }
  }

  grr() {
    const p = this.cocoScreen();
    this.float(["GRRR", "hsss!", "grr!", "PFFT"][Math.floor(Math.random() * 4)], { x: p.x + (Math.random() - 0.5) * 40, y: p.y - 70 }, INK, 18);
    this.jump = 0.18;
  }
  private jump = 0;

  resolveStandoff(win: boolean) {
    for (const s of this.strays) if (s.mode === "standoff") {
      s.mode = win ? "flee" : "leave";
      s.tx = s.gx < 4 ? -2 : 10; s.ty = s.gy;
      const p = this.toScreen(s.gx, s.gy);
      this.float(win ? "!!! (runs)" : "*yawn*", { x: p.x, y: p.y - 60 }, INK, 16);
    }
    this.coco.state = "happy"; this.coco.t = 2;
    this.float(win ? "hmph. mine." : "…a draw.", { x: this.cocoScreen().x, y: this.cocoScreen().y - 80 }, INK, 16);
  }

  // ---------- setup ----------
  private resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = r.width; this.H = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    this.low.width = Math.ceil(r.width / PX);
    this.low.height = Math.ceil(r.height / PX);
    // size the island to fit, and keep the house roof clear of the floating buttons at the top
    this.TW = Math.min(this.W / 8.6, (this.H - 250) / 6.9, 120);
    this.TH = this.TW / 2;
    this.ox = this.W / 2;
    this.oy = Math.min(this.H - this.TW * 4.75, Math.max(150 + this.TW * 2.4, (this.H - 8 * this.TH) / 2));
  }

  private img(key: string, make: () => string) {
    let im = this.imgs.get(key);
    if (!im) {
      im = new Image();
      im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(make());
      this.imgs.set(key, im);
    }
    return im;
  }

  private toScreen(gx: number, gy: number) { return { x: this.ox + (gx - gy) * this.TW / 2, y: this.oy + (gx + gy) * this.TH / 2 }; }
  private toGrid(x: number, y: number) {
    const a = (x - this.ox) / (this.TW / 2), b = (y - this.oy) / (this.TH / 2);
    return { gx: (a + b) / 2, gy: (b - a) / 2 };
  }
  private cocoScreen() { return this.toScreen(this.coco.gx, this.coco.gy); }
  private bowlPos(): [number, number] { return [3.3, 3.1]; }
  private isNight() { const h = new Date().getHours(); return h >= 20 || h < 6; }

  private placeSleep() {
    const owned = this.cb.getOwned();
    const [gx, gy] = owned.includes("bed") ? [5.9, 1.6] : [2.6, 2.9];
    this.coco.gx = this.coco.tx = gx; this.coco.gy = this.coco.ty = gy;
  }

  private goTo(gx: number, gy: number, state: CocoState, speed = 1.2) {
    this.coco.tx = Math.min(7.6, Math.max(0.4, gx));
    this.coco.ty = Math.min(7.6, Math.max(0.4, gy));
    // keep out of the house footprint
    if (this.coco.tx < 3.1 && this.coco.ty < 2.6) this.coco.ty = 2.8;
    this.coco.state = state; this.coco.speed = speed;
  }

  private float(text: string, p: { x: number; y: number }, color: string, size = 16) {
    this.floaters.push({ x: p.x, y: p.y, text, t: 0, color, size });
  }
  private heartBurst() {
    const p = this.cocoScreen();
    for (let i = 0; i < 3; i++) this.float("♥", { x: p.x + (i - 1) * 16, y: p.y - 50 - i * 6 }, "#111", 18);
  }

  // ---------- input ----------
  private onTap = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const c = this.cocoScreen(); const s = this.cocoSize();
    if (x > c.x - s * 0.5 && x < c.x + s * 0.5 && y > c.y - s * 0.95 && y < c.y + 6) {
      const sleeping = this.coco.state === "sleep" || this.coco.state === "nap";
      this.cb.onTapCoco(sleeping);
      if (this.attention) { this.attention = false; this.attentionT = 35 + Math.random() * 30; this.cb.onAttention(false); }
      this.heartBurst();
      if (!sleeping && this.coco.state !== "eat" && this.coco.state !== "puff") { this.coco.state = "happy"; this.coco.t = 1.6; }
      else if (sleeping) this.float("mrrp… zzz", { x: c.x, y: c.y - s }, INK, 15);
      return;
    }
    const mb = this.toScreen(4.6, 7.9);
    if (Math.abs(x - mb.x) < 22 && y > mb.y - 55 && y < mb.y + 6) { this.cb.onTapMailbox(); return; }
    const g = this.toGrid(x, y);
    if (g.gx > 0 && g.gx < 8 && g.gy > 0 && g.gy < 8 && ["idle", "walk", "happy"].includes(this.coco.state)) {
      this.goTo(g.gx, g.gy, "walk");
      this.float("?", { x, y: y - 10 }, INK, 16);
    }
  };

  // ---------- simulation ----------
  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    if (document.hidden) { this.last = now; return; }
    const dt = Math.min(0.1, (now - (this.last || now)) / 1000);
    this.last = now;
    this.acc += dt;
    if (this.acc < 1 / 30) return; // ~30fps is plenty for line art
    const step = this.acc; this.acc = 0;
    this.update(step);
    this.draw();
  };

  private update(dt: number) {
    this.time += dt;
    this.fullBelly = Math.max(0, this.fullBelly - dt / 25);
    const c = this.coco;
    const n = this.isNight();
    if (n !== this.night) { this.night = n; this.cb.onNightChange(n); if (n) { c.state = "walk"; this.placeSleepTarget(); } }

    this.blinkT -= dt;
    if (this.blinkT < 0) { c.blink = !c.blink; this.blinkT = c.blink ? 0.14 : 2.5 + Math.random() * 3; }
    this.jump = Math.max(0, this.jump - dt);

    // butterfly
    const bt = this.time + this.butterfly.phase;
    const center = this.toScreen(4.5, 4.2);
    this.butterfly.x = center.x + Math.sin(bt * 0.37) * this.TW * 2.6 + Math.sin(bt * 2.1) * 8;
    this.butterfly.y = center.y + Math.cos(bt * 0.29) * this.TH * 2.2 - 40 + Math.sin(bt * 3.3) * 6;

    // attention "..." bubble
    if (!this.night && !this.attention && c.state !== "puff" && c.state !== "eat") {
      this.attentionT -= dt;
      if (this.attentionT <= 0) {
        this.attention = true; this.cb.onAttention(true);
        if (this.cb.getBehaviours() >= 3 && Math.random() < 0.5) {
          const [bx, by] = this.bowlPos(); this.goTo(bx + 0.55, by + 0.2, "walk");
          this.drum = true;
        }
      }
    }

    // strays (the beef)
    if (!this.night && !this.strays.some((s) => s.mode === "enter" || s.mode === "standoff")) {
      this.strayT -= dt;
      if (this.strayT <= 0 && ["idle", "walk", "nap", "happy"].includes(c.state)) {
        this.strayT = 70 + Math.random() * 70;
        const left = Math.random() < 0.5;
        const fur = Math.random() < 0.5 ? "grey" : "ginger";
        this.strays.push({ gx: left ? -1 : 9, gy: 4 + Math.random() * 3, tx: 0, ty: 0, fur, mode: "enter", dir: left ? 1 : -1 });
      }
    }
    for (const s of this.strays) {
      if (s.mode === "enter") { s.tx = c.gx + (s.gx < c.gx ? -1.4 : 1.4); s.ty = c.gy; }
      const dx = s.tx - s.gx, dy = s.ty - s.gy, d = Math.hypot(dx, dy);
      const sp = (s.mode === "flee" ? 4 : 1.1) * dt;
      if (s.mode !== "standoff") {
        if (d > 0.05) { s.gx += (dx / d) * Math.min(sp, d); s.gy += (dy / d) * Math.min(sp, d); s.dir = Math.sign(dx - dy) || s.dir; }
        if (s.mode === "enter" && d < 0.15) {
          s.mode = "standoff"; c.state = "puff"; c.t = 999;
          c.dir = s.gx < c.gx ? -1 : 1;
          this.cb.onStandoff(true);
          const p = this.cocoScreen(); this.float("!!", { x: p.x, y: p.y - 70 }, INK, 22);
        }
      }
    }
    const before = this.strays.length;
    this.strays = this.strays.filter((s) => !((s.mode === "flee" || s.mode === "leave") && (s.gx < -1.5 || s.gx > 9.5)));
    if (before !== this.strays.length && !this.strays.some((s) => s.mode === "standoff")) this.cb.onStandoff(false);

    // Coco
    c.t -= dt;
    const moving = c.state === "walk" || c.state === "chase" || c.state === "zoom";
    if (c.state === "chase") {
      const g = this.toGrid(this.butterfly.x, this.butterfly.y + 40);
      c.tx = Math.min(7.6, Math.max(0.4, g.gx)); c.ty = Math.min(7.6, Math.max(0.4, g.gy));
    }
    if (moving) {
      const dx = c.tx - c.gx, dy = c.ty - c.gy, d = Math.hypot(dx, dy);
      const sp = c.speed * (c.state === "chase" ? 1.7 : c.state === "zoom" ? 4 : 1) * dt;
      if (d > 0.04) {
        c.gx += (dx / d) * Math.min(sp, d); c.gy += (dy / d) * Math.min(sp, d);
        const sx = dx - dy; if (Math.abs(sx) > 0.01) c.dir = Math.sign(sx);
        c.stepT += dt; if (c.stepT > (c.state === "zoom" ? 0.09 : 0.2)) { c.stepT = 0; c.step++; }
      } else if (c.state === "walk" || c.state === "zoom") {
        if (this.pendingEat && this.bowl) { this.pendingEat = false; c.state = "eat"; c.t = 3.6; c.dir = -1; this.munchT = 0; }
        else if (this.drum) { this.drum = false; c.state = "idle"; c.t = 3; this.float("tap tap tap (bowl)", { x: this.cocoScreen().x, y: this.cocoScreen().y - 80 }, INK, 14); }
        else if (this.night) { c.state = "sleep"; c.t = 999; }
        else { c.state = "idle"; c.t = 4 + Math.random() * 4; }
      }
    }
    if (c.state === "eat") {
      this.munchT -= dt;
      if (this.munchT <= 0) {
        this.munchT = 0.75; this.cb.onMunch();
        const p = this.cocoScreen();
        this.float(["NOM", "MUNCH", "nom nom", "CRUNCH", "*chomp*"][Math.floor(Math.random() * 5)], { x: p.x + (Math.random() - 0.5) * 50, y: p.y - 60 }, INK, 16 + Math.random() * 6);
      }
      if (c.t <= 0) { this.fullBelly = 1; this.float("*belly grows*", { x: this.cocoScreen().x, y: this.cocoScreen().y - 100 }, INK, 14); const f = this.bowl!; this.bowl = null; c.state = "happy"; c.t = 2; this.cb.onFed(f); this.float("*satisfied burp*", { x: this.cocoScreen().x, y: this.cocoScreen().y - 80 }, INK, 14); }
    }
    if (c.t <= 0) this.decide();

    for (const f of this.floaters) { f.t += dt; f.y -= 22 * dt; }
    this.floaters = this.floaters.filter((f) => f.t < 1.6);
  }
  private drum = false;

  private placeSleepTarget() {
    const owned = this.cb.getOwned();
    const [gx, gy] = owned.includes("bed") ? [5.9, 1.6] : [2.6, 2.9];
    this.goTo(gx, gy, "walk", 1);
  }

  private decide() {
    const c = this.coco;
    if (c.state === "puff" || c.state === "cuddle" || c.state === "eat") return;
    if (this.night) {
      if (c.state === "sleep" && this.cb.getBehaviours() >= 4 && Math.random() < 0.15) {
        this.goTo(Math.random() * 7 + 0.5, Math.random() * 5 + 2.5, "zoom", 1); this.float("ZOOMIES", this.cocoScreen(), INK, 18); return;
      }
      if (c.state !== "sleep") { this.placeSleepTarget(); return; }
      c.t = 20; return;
    }
    const r = Math.random();
    if (r < 0.12) { this.goTo(4.7, 2.2, "walk"); this.napNext = true; return; }
    if (r < 0.24) { c.state = "chase"; c.t = 3 + Math.random() * 2; c.speed = 1.2; return; }
    if (r < 0.5) { this.goTo(0.8 + Math.random() * 6.6, 2.8 + Math.random() * 4.6, "walk"); return; }
    c.state = "idle"; c.t = 5 + Math.random() * 5; // a proper sit
    if (this.napNext) { this.napNext = false; c.state = "nap"; c.t = 8 + Math.random() * 6; }
  }
  private napNext = false;

  // ---------- drawing (pixel-art pass at 1/PX resolution, then scaled up crisply) ----------
  private spriteK() { return Math.max(1, Math.round(this.TW / 55)); }
  /** On-screen size of Coco's body (CSS px), used for hit-testing and bubbles. */
  private cocoSize() { return 32 * this.spriteK() * PX * this.fatScale(); }
  /** Coco is a chonk: wider than the base sprite, rounder with every meal, plus a puff right after eating. */
  private fatScale() { return 1.05 + this.cb.getChonk() / 100 * 0.6 + this.fullBelly * 0.18; }
  /** taller too as he gets chonkier (but mostly wider) */
  private fatY() { return 1 + this.cb.getChonk() / 100 * 0.22 + this.fullBelly * 0.05; }
  private drawingCoco = false;
  private fullBelly = 0; // 0..1, decays after a meal

  private draw() {
    const ctx = this.ctx;
    ctx.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const sky = ctx.createLinearGradient(0, 0, 0, this.H);
    sky.addColorStop(0, "#b9d8d2"); sky.addColorStop(1, "#97c0ba");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.lineJoin = "round"; ctx.lineCap = "round";

    this.drawGround();
    const owned = this.cb.getOwned();
    type D = { depth: number; draw: () => void };
    const list: D[] = [];
    list.push({ depth: 3.4, draw: () => this.drawHouse(0.5, 0.4, 2.5, 2.2) });
    list.push({ depth: 8.2, draw: () => this.drawTree(7.7, 0.5) });
    list.push({ depth: 8.2, draw: () => this.drawTree(0.3, 7.9, 0.85) });
    list.push({ depth: 12.5, draw: () => this.drawMailbox(4.6, 7.9) });
    for (let i = 0; i < 5; i++) list.push({ depth: 3.5 + i * 1.1, draw: () => this.drawFencePost(3.6 + i * 1.1, 0.1) });
    const [bx, by] = this.bowlPos();
    list.push({ depth: bx + by, draw: () => this.drawBowl(bx, by) });
    for (const id of owned) {
      const item = ITEMS[id]; if (!item) continue;
      list.push({ depth: item.gx + item.gy - (id === "rug" ? 3 : 0), draw: () => item.draw(this, item.gx, item.gy) });
    }
    list.push({ depth: this.coco.gx + this.coco.gy + 0.01, draw: () => this.drawCoco() });
    for (const s of this.strays) list.push({ depth: s.gx + s.gy, draw: () => this.drawStray(s) });
    list.sort((a, b) => a.depth - b.depth).forEach((d) => d.draw());
    this.drawButterfly();

    if (this.night) {
      ctx.fillStyle = "rgba(20,26,62,.5)";
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.fillStyle = "#fff6c8";
      ctx.beginPath(); ctx.arc(this.W - 50, 100, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(20,26,62,1)"; ctx.beginPath(); ctx.arc(this.W - 43, 95, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff6c8";
      for (let i = 0; i < 18; i++) { const sx = (i * 97) % this.W, sy = 70 + ((i * 53) % 120); ctx.fillRect(sx, sy, PX, PX); }
      if (owned.includes("lamp")) {
        const p = this.toScreen(ITEMS.lamp.gx, ITEMS.lamp.gy);
        const g = ctx.createRadialGradient(p.x, p.y - 40, 4, p.x, p.y - 20, this.TW * 2.4);
        g.addColorStop(0, "rgba(255,233,92,.7)"); g.addColorStop(1, "rgba(255,233,92,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y - 20, this.TW * 2.4, 0, Math.PI * 2); ctx.fill();
      }
      // windows glow at night
      const w0 = this.toScreen(0.5 + 2.5 * 0.15, 2.6), w1 = this.toScreen(0.5 + 2.5 * 0.4, 2.6);
      ctx.fillStyle = "rgba(255,220,120,.55)";
      ctx.beginPath(); ctx.moveTo(w0.x, w0.y - this.TW * 0.56); ctx.lineTo(w1.x, w1.y - this.TW * 0.56); ctx.lineTo(w1.x, w1.y - this.TW); ctx.lineTo(w0.x, w0.y - this.TW); ctx.fill();
    }

    // scale the low-res world up with hard pixel edges
    const sc = this.screen;
    sc.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    sc.imageSmoothingEnabled = false;
    sc.clearRect(0, 0, this.W, this.H);
    sc.drawImage(this.low, 0, 0, this.low.width * PX, this.low.height * PX);
    this.drawOverlay();
  }

  /** Text and bubbles at full resolution so they stay readable. */
  private drawOverlay() {
    const ctx = this.screen; const c = this.coco; const p = this.cocoScreen(); const s = this.cocoSize();
    ctx.lineJoin = "round";
    const sleeping = c.state === "sleep" || c.state === "nap";
    if (sleeping) {
      ctx.font = "700 15px Gaegu, cursive"; ctx.fillStyle = this.night ? "#fff" : INK; ctx.textAlign = "left";
      ctx.globalAlpha = 0.5 + Math.sin(this.time * 2) * 0.5; ctx.fillText("z z z", p.x + s * 0.3, p.y - s * 0.9); ctx.globalAlpha = 1;
    }
    if (this.attention) {
      const bx = p.x + s * 0.45, by = p.y - s - 12;
      ctx.fillStyle = YELLOW; ctx.strokeStyle = "#111"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(bx - 18, by - 14, 36, 22, 11); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx - 8, by + 8); ctx.lineTo(bx - 14, by + 16); ctx.lineTo(bx - 1, by + 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#111"; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(bx + i * 8, by - 3 + (Math.floor(this.time * 3) % 3 === i + 1 ? -2 : 0), 2, 0, Math.PI * 2); ctx.fill(); }
    }
    for (const st of this.strays) if (st.mode === "standoff") {
      const q = this.toScreen(st.gx, st.gy);
      ctx.font = "700 16px Gaegu, cursive"; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "#fff";
      ctx.strokeText("hsss", q.x, q.y - s - 4); ctx.fillStyle = INK; ctx.fillText("hsss", q.x, q.y - s - 4);
    }
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / 1.6);
      ctx.font = `700 ${f.size}px Gaegu, "Patrick Hand", cursive`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  }

  private poly(pts: { x: number; y: number }[], fill: string | null = CREAM, lw = 2, stroke = INK) {
    const ctx = this.ctx;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  line(x1: number, y1: number, x2: number, y2: number, lw = 2, color = INK) {
    const ctx = this.ctx; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
  }
  blob(x: number, y: number, r: number, fill: string, lw = 2) {
    const ctx = this.ctx; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
    if (lw) { ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke(); }
  }
  up(p: { x: number; y: number }, h: number) { return { x: p.x, y: p.y - h }; }
  S(gx: number, gy: number) { return this.toScreen(gx, gy); }
  get tw() { return this.TW; }
  get c2d() { return this.ctx; }

  private drawGround() {
    const ctx = this.ctx; const S = (a: number, b: number) => this.toScreen(a, b);
    const E = 8.4; const d = this.TH * 0.55;
    const down = (p: { x: number; y: number }) => ({ x: p.x, y: p.y + d });
    // island sides (soil), then the grass top
    this.poly([S(0, E), S(E, E), down(S(E, E)), down(S(0, E))], "#9a6b45");
    this.poly([S(E, E), S(E, 0), down(S(E, 0)), down(S(E, E))], "#7c5235");
    this.poly([S(0, 0), S(E, 0), S(E, E), S(0, E)], "#8cc463");
    // grass texture (deterministic)
    let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 14; i++) { const p = S(rnd() * E, rnd() * E); ctx.fillStyle = "#9fd174"; ctx.beginPath(); ctx.ellipse(p.x, p.y, this.TW * 0.5, this.TH * 0.4, 0, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 40; i++) {
      const p = S(rnd() * E, rnd() * E);
      this.line(p.x, p.y, p.x - 2, p.y - 6, 2, "#5f9a3d"); this.line(p.x + 3, p.y, p.x + 4, p.y - 7, 2, "#5f9a3d");
    }
    for (let i = 0; i < 22; i++) { const p = S(rnd() * E, 2.8 + rnd() * 5.4); ctx.fillStyle = i % 3 ? "#fff6c8" : YELLOW; ctx.fillRect(p.x, p.y, PX * 1.5, PX * 1.5); }
    // dirt edge highlight
    this.line(S(0, E).x, S(0, E).y, S(E, E).x, S(E, E).y, 2, "#5f9a3d");
    // sunbeam
    if (!this.night) {
      ctx.globalAlpha = 0.45;
      this.poly([S(4, 1.4), S(5.6, 1.4), S(5.9, 3), S(4.3, 3)], YELLOW, 0);
      ctx.globalAlpha = 1;
    }
    // stepping-stone path from the door
    for (let i = 0; i < 6; i++) {
      const p = S(2.9 + (i % 2) * 0.25, 3.0 + i * 0.85);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, this.TW * 0.3, this.TH * 0.32, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#e0ad86"; ctx.fill(); ctx.strokeStyle = "#a8724d"; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  private drawHouse(gx: number, gy: number, w: number, d: number) {
    const S = (a: number, b: number) => this.toScreen(a, b);
    const h = this.TW * 1.25, rh = this.TW * 0.95;
    const B = S(gx + w, gy), C = S(gx + w, gy + d), D = S(gx, gy + d);
    const U = (p: { x: number; y: number }, k = h) => ({ x: p.x, y: p.y - k });
    // stone foundation
    this.poly([D, C, { x: C.x, y: C.y + 6 }, { x: D.x, y: D.y + 6 }], "#a9a29a");
    this.poly([C, B, { x: B.x, y: B.y + 6 }, { x: C.x, y: C.y + 6 }], "#8f8880");
    this.poly([B, C, U(C), U(B)], "#e8d8b4"); // side wall
    this.poly([D, C, U(C), U(D)], "#f7eed8"); // front wall
    // timber frame
    const T = "#6b4226";
    this.line(D.x, D.y - 2, C.x, C.y - 2, 3, T); this.line(U(D).x, U(D).y, U(C).x, U(C).y, 3, T);
    this.line(C.x, C.y, U(C).x, U(C).y, 3, T); this.line(D.x, D.y, U(D).x, U(D).y, 3, T); this.line(B.x, B.y, U(B).x, U(B).y, 3, T);
    const m = S(gx + w, gy + d / 2); this.line(m.x, m.y, m.x, m.y - h, 2.5, T);
    const R1 = U(S(gx, gy + d / 2), h + rh), R2 = U(S(gx + w, gy + d / 2), h + rh);
    // chimney (stone + cap)
    const ch = S(gx + w * 0.7, gy + d * 0.3);
    this.poly([U(ch, h + rh * 0.4), U({ x: ch.x + 14, y: ch.y - 7 }, h + rh * 0.4), U({ x: ch.x + 14, y: ch.y - 7 }, h + rh + 26), U(ch, h + rh + 26)], "#b9b2a6");
    this.poly([U({ x: ch.x - 3, y: ch.y }, h + rh + 26), U({ x: ch.x + 17, y: ch.y - 7 }, h + rh + 26), U({ x: ch.x + 17, y: ch.y - 7 }, h + rh + 32), U({ x: ch.x - 3, y: ch.y }, h + rh + 32)], "#7a4a2a");
    this.poly([U(B), U(C), R2], "#e8d8b4"); // gable
    // round attic window in the gable
    const gw = { x: (U(B).x + U(C).x + R2.x) / 3, y: (U(B).y + U(C).y + R2.y) / 3 + 4 };
    this.blob(gw.x, gw.y, this.TW * 0.12, "#9fd3f2", 2.5);
    // red tiled roof with eaves
    const eave = 6;
    const E1 = { x: U(D).x - eave, y: U(D).y + eave * 0.6 }, E2 = { x: U(C).x + eave * 0.3, y: U(C).y + eave * 0.8 };
    this.poly([E1, E2, R2, R1], "#c2473e", 2.5);
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const a = { x: E1.x + (R1.x - E1.x) * t, y: E1.y + (R1.y - E1.y) * t }, b = { x: E2.x + (R2.x - E2.x) * t, y: E2.y + (R2.y - E2.y) * t };
      this.line(a.x, a.y, b.x, b.y, 2, "#922f2a");
    }
    for (let i = 1; i < 10; i++) {
      const t = i / 10;
      const a = { x: E1.x + (E2.x - E1.x) * t, y: E1.y + (E2.y - E1.y) * t }, b = { x: R1.x + (R2.x - R1.x) * t, y: R1.y + (R2.y - R1.y) * t };
      this.line(a.x, a.y, (a.x * 2 + b.x) / 3, (a.y * 2 + b.y) / 3, 1.5, "#a83a33");
    }
    this.line(R1.x, R1.y, R2.x, R2.y, 4, "#7d2622");
    // door with arch + step
    const d0 = S(gx + w * 0.6, gy + d), d1 = S(gx + w * 0.86, gy + d);
    this.poly([d0, d1, U(d1, h * 0.64), U(d0, h * 0.64)], "#8a5530", 2.5);
    this.line((d0.x + d1.x) / 2, (d0.y + d1.y) / 2 - 2, (d0.x + d1.x) / 2, (d0.y + d1.y) / 2 - h * 0.62, 1.5, "#5c3519");
    this.blob(d1.x - 6, d1.y - h * 0.3, 2, YELLOW, 0);
    this.poly([{ x: d0.x - 4, y: d0.y + 2 }, { x: d1.x + 4, y: d1.y - 1 }, { x: d1.x + 8, y: d1.y + 5 }, { x: d0.x, y: d0.y + 8 }], "#bdb6aa");
    // window with frame, cross and flower box
    const w0 = S(gx + w * 0.15, gy + d), w1 = S(gx + w * 0.4, gy + d);
    this.poly([U(w0, h * 0.45), U(w1, h * 0.45), U(w1, h * 0.8), U(w0, h * 0.8)], this.night ? "#ffd884" : "#9fd3f2", 3, T);
    const wm = { x: (w0.x + w1.x) / 2, y: (w0.y + w1.y) / 2 };
    this.line(wm.x, wm.y - h * 0.45, wm.x, wm.y - h * 0.8, 2, T);
    this.line(U(w0, h * 0.625).x, U(w0, h * 0.625).y, U(w1, h * 0.625).x, U(w1, h * 0.625).y, 2, T);
    this.poly([U(w0, h * 0.38), U(w1, h * 0.38), U(w1, h * 0.45), U(w0, h * 0.45)], "#8a5530", 2);
    for (let i = 0; i < 4; i++) { const t = (i + 0.5) / 4; this.blob(w0.x + (w1.x - w0.x) * t, w0.y + (w1.y - w0.y) * t - h * 0.47, 3.5, i % 2 ? "#e85a6a" : "#6fb04a", 0); }
    // bushes along the front
    for (const t of [0.05, 0.45, 0.95]) { const p = S(gx + w * t, gy + d + 0.15); this.blob(p.x, p.y - 6, this.TW * 0.16, "#5f9e3c", 2); this.blob(p.x - 3, p.y - 9, this.TW * 0.07, "#8cc463", 0); }
  }

  private drawTree(gx: number, gy: number, s = 1) {
    const p = this.toScreen(gx, gy); const r = this.TW * 0.55 * s;
    this.poly([{ x: p.x - 5, y: p.y }, { x: p.x + 5, y: p.y }, { x: p.x + 4, y: p.y - r * 1.9 }, { x: p.x - 4, y: p.y - r * 1.9 }], "#7a4a2a");
    const cy = p.y - r * 2.4;
    this.blob(p.x - r * 0.45, cy + r * 0.25, r * 0.6, "#4f8a32");
    this.blob(p.x + r * 0.45, cy + r * 0.25, r * 0.6, "#4f8a32");
    this.blob(p.x, cy - r * 0.15, r * 0.75, "#62a33f");
    this.blob(p.x - r * 0.2, cy - r * 0.35, r * 0.32, "#8cc463", 0);
    this.blob(p.x + r * 0.3, cy + r * 0.1, r * 0.2, "#8cc463", 0);
  }

  private drawMailbox(gx: number, gy: number) {
    const ctx = this.ctx; const p = this.toScreen(gx, gy);
    this.poly([{ x: p.x - 2, y: p.y }, { x: p.x + 2, y: p.y }, { x: p.x + 2, y: p.y - 26 }, { x: p.x - 2, y: p.y - 26 }], "#7a4a2a");
    ctx.beginPath(); ctx.moveTo(p.x - 12, p.y - 26); ctx.lineTo(p.x + 12, p.y - 26); ctx.lineTo(p.x + 12, p.y - 40);
    ctx.arc(p.x, p.y - 40, 12, 0, Math.PI, true); ctx.closePath();
    ctx.fillStyle = "#c8323a"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    this.line(p.x + 12, p.y - 42, p.x + 12, p.y - 54, 2);
    ctx.fillStyle = YELLOW; ctx.fillRect(p.x + 12, p.y - 54, 9, 6); ctx.strokeRect(p.x + 12, p.y - 54, 9, 6);
    ctx.fillStyle = "#fff"; ctx.fillRect(p.x - 6, p.y - 36, 12, 7);
  }

  private drawFencePost(gx: number, gy: number) {
    const p = this.toScreen(gx, gy), q = this.toScreen(gx + 1.1, gy);
    this.line(p.x, p.y - 9, q.x, q.y - 9, 3, "#9a6a40"); this.line(p.x, p.y - 18, q.x, q.y - 18, 3, "#9a6a40");
    this.poly([{ x: p.x - 3, y: p.y }, { x: p.x + 3, y: p.y }, { x: p.x + 3, y: p.y - 24 }, { x: p.x, y: p.y - 28 }, { x: p.x - 3, y: p.y - 24 }], "#b07a4a");
  }

  private drawBowl(gx: number, gy: number) {
    const ctx = this.ctx; const p = this.toScreen(gx, gy); const w = this.TW * 0.36;
    ctx.beginPath(); ctx.moveTo(p.x - w, p.y - 6); ctx.quadraticCurveTo(p.x, p.y + 12, p.x + w, p.y - 6); ctx.closePath();
    ctx.fillStyle = "#7fb2e0"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 6, w, w * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.bowl ? "#e9a64f" : "#d9e9f6"; ctx.fill(); ctx.stroke();
    if (this.bowl === "fish") { ctx.fillStyle = "#f2c27b"; ctx.beginPath(); ctx.ellipse(p.x - 2, p.y - 9, 9, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    else if (this.bowl) for (let i = 0; i < 5; i++) { ctx.fillStyle = "#b5733a"; ctx.fillRect(p.x - 10 + i * 4, p.y - 9 + (i % 2) * 2, PX * 1.5, PX * 1.5); }
  }

  private sheet(name: string) { return this.sheets[name]; }

  /** Draw one 48×48 sprite frame with feet on point (x, y). */
  private sprite(img: HTMLImageElement | undefined, frame: number, x: number, y: number, flip: boolean, sx = 1, sy = 1) {
    if (!img || !img.complete || !img.naturalWidth) return;
    const ctx = this.ctx; const k = this.spriteK() * PX;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale((flip ? -1 : 1) * sx, sy * (this.drawingCoco ? this.fatY() : 1));
    ctx.drawImage(img, frame * 48, 0, 48, 48, -24.5 * k, -48 * k, 48 * k, 48 * k);
    ctx.restore();
  }

  private idleKind: "stand" | "sit" | "loaf" = "sit";
  private lastState = "";

  private drawCoco() { this.drawingCoco = true; try { this.drawCocoInner(); } finally { this.drawingCoco = false; } }

  private drawCocoInner() {
    const c = this.coco;
    if (c.state !== this.lastState) {
      // pick a resting pose each time he stops: stand, sit up, or (once learned) loaf
      if (c.state === "idle") {
        const r = Math.random();
        this.idleKind = this.cb.getBehaviours() >= 2 && r < 0.25 ? "loaf" : r < 0.85 ? "sit" : "stand";
      }
      this.lastState = c.state;
    } const ctx = this.ctx; const p = this.cocoScreen(); const s = this.cocoSize();
    const chonk = this.fatScale();
    // belly jiggle: a soft squash-and-stretch wobble, stronger right after food
    const wob = Math.sin(this.time * (c.state === "walk" || c.state === "chase" ? 14 : 3)) * (0.025 + this.fullBelly * 0.05);
    ctx.fillStyle = "rgba(40,60,30,.22)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, s * 0.45, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    const flip = c.dir < 0;
    const moving = c.state === "walk" || c.state === "chase" || c.state === "zoom";
    if (moving) {
      const fps = c.state === "zoom" ? 22 : c.state === "chase" ? 16 : 11;
      this.sprite(this.sheet("run"), Math.floor(this.time * fps) % 6, p.x, p.y, flip, chonk * (1 + wob), 1 - wob);
    } else if (c.state === "sleep" || c.state === "nap") {
      // curled up in a loaf, eyes shut, slow breathing belly
      const br = 1 + Math.sin(this.time * 2) * 0.04;
      this.sprite(this.sheet("loaf"), 2, p.x, p.y, flip, chonk * br, 1 / br);
    } else if (c.state === "puff") {
      const sh = Math.sin(this.time * 40) * 1.5;
      this.sprite(this.sheet("idle"), 0, p.x + sh, p.y, flip, chonk * 1.18, 1.15);
    } else if (c.state === "cuddle") {
      const br = 1 + Math.sin(this.time * 3) * 0.03;
      this.sprite(this.sheet("loaf"), 2 + (Math.floor(this.time * 0.8) % 2), p.x, p.y, flip, chonk * br, 1 / br);
    } else if (c.state === "happy") {
      const hop = Math.abs(Math.sin(this.time * 9)) * 6 + this.jump * 30;
      this.sprite(this.sheet("happy"), Math.floor(this.time * 4) % 2, p.x, p.y - hop, flip, chonk * (1 + wob * 2), 1 - wob * 2);
    } else if (c.state === "idle" && this.idleKind === "sit") {
      const hop = this.jump > 0 ? Math.sin((this.jump / 0.18) * Math.PI) * 8 : 0;
      this.sprite(this.sheet("sit"), Math.floor(this.time * 5) % 8, p.x, p.y - hop, false, chonk * (1 + wob), 1 - wob);
    } else if (c.state === "idle" && this.idleKind === "loaf") {
      const seq = [0, 0, 1, 2, 2, 2, 3, 1];
      this.sprite(this.sheet("loaf"), seq[Math.floor(this.time * 0.8) % seq.length], p.x, p.y, flip, chonk * (1 + Math.sin(this.time * 2) * 0.02));
    } else {
      const f = Math.floor(this.time * 8) % 12;
      const bob = c.state === "eat" ? (Math.floor(this.time * 5) % 2) * 3 : 0;
      const hop = this.jump > 0 ? Math.sin((this.jump / 0.18) * Math.PI) * 8 : 0;
      this.sprite(this.sheet(c.state === "eat" ? "sit" : "idle"), c.state === "eat" ? 0 : f, p.x, p.y + bob - hop, flip, chonk * (1 + wob), 1 - wob);
    }
  }

  private drawStray(st: Stray) {
    const ctx = this.ctx; const p = this.toScreen(st.gx, st.gy); const s = this.cocoSize();
    ctx.fillStyle = "rgba(40,60,30,.22)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, s * 0.4, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    if (st.mode === "standoff") {
      const sh = Math.sin(this.time * 30) * 1.2;
      this.sprite(this.sheet(`${st.fur}-idle`), 0, p.x + sh, p.y, st.dir < 0, 1.15, 1.12);
    } else {
      this.sprite(this.sheet(`${st.fur}-run`), Math.floor(this.time * (st.mode === "flee" ? 20 : 11)) % 6, p.x, p.y, st.dir < 0);
    }
  }

  private drawButterfly() {
    const ctx = this.ctx; const { x, y } = this.butterfly; const f = Math.abs(Math.sin(this.time * 14));
    ctx.fillStyle = YELLOW; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(x - 4 * f, y, 5 * f + 1, 4, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + 4 * f, y, 5 * f + 1, 4, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    this.line(x, y - 4, x, y + 4, 1.4);
  }
}

// ---------- furniture (line art) ----------
type ItemDraw = (e: WorldEngine, gx: number, gy: number) => void;
const ell = (e: WorldEngine, x: number, y: number, rx: number, ry: number, fill = CREAM) => {
  const c = e.c2d; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
};
const rect = (e: WorldEngine, x: number, y: number, w: number, h: number, fill = CREAM) => {
  const c = e.c2d; c.fillStyle = fill; c.fillRect(x, y, w, h); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x, y, w, h);
};

export const ITEMS: Record<string, { gx: number; gy: number; draw: ItemDraw }> = {
  bed: { gx: 5.9, gy: 1.6, draw: (e, gx, gy) => { const p = e.S(gx, gy); ell(e, p.x, p.y - 4, e.tw * 0.62, e.tw * 0.26, "#c8323a"); ell(e, p.x, p.y - 7, e.tw * 0.44, e.tw * 0.16, "#f6dcd9"); } },
  plant: { gx: 0.6, gy: 4.4, draw: (e, gx, gy) => { const p = e.S(gx, gy); for (const a of [-0.6, 0, 0.6]) e.line(p.x, p.y - 16, p.x + Math.sin(a) * 18, p.y - 16 - Math.cos(a) * 20, 3, "#4f8a32"); ell(e, p.x - 10, p.y - 32, 6, 4, "#62a33f"); ell(e, p.x + 10, p.y - 32, 6, 4, "#62a33f"); ell(e, p.x, p.y - 37, 5, 6, "#8cc463"); rect(e, p.x - 9, p.y - 16, 18, 16, "#c96f45"); } },
  box: { gx: 6.4, gy: 5.2, draw: (e, gx, gy) => { const p = e.S(gx, gy); rect(e, p.x - 16, p.y - 20, 32, 20, "#d4a26a"); e.line(p.x - 16, p.y - 20, p.x - 24, p.y - 28, 3, "#b5814a"); e.line(p.x + 16, p.y - 20, p.x + 24, p.y - 28, 3, "#b5814a"); e.line(p.x - 6, p.y - 12, p.x + 6, p.y - 12, 2, "#8a5a34"); } },
  post: { gx: 6.8, gy: 2.6, draw: (e, gx, gy) => { const p = e.S(gx, gy); ell(e, p.x, p.y - 2, 14, 5, "#7fb2e0"); rect(e, p.x - 5, p.y - 44, 10, 42, "#e0c08c"); for (let i = 0; i < 6; i++) e.line(p.x - 5, p.y - 8 - i * 6, p.x + 5, p.y - 12 - i * 6, 1.5, "#a8724d"); ell(e, p.x, p.y - 46, 12, 5, "#7fb2e0"); } },
  flowers: { gx: 1.4, gy: 6.4, draw: (e, gx, gy) => { const p = e.S(gx, gy); ell(e, p.x, p.y, e.tw * 0.5, e.tw * 0.2, "#9a6b45"); for (let i = -2; i <= 2; i++) { e.line(p.x + i * 8, p.y - 2, p.x + i * 8, p.y - 14, 2, "#4f8a32"); ell(e, p.x + i * 8, p.y - 16, 4, 4, ["#e85a6a", YELLOW, "#f7eed8", "#b07fe0", "#e85a6a"][i + 2]); } } },
  tree: { gx: 4.6, gy: 6.6, draw: (e, gx, gy) => { const p = e.S(gx, gy); rect(e, p.x - 4, p.y - 64, 8, 64, "#e0c08c"); ell(e, p.x, p.y - 2, 18, 6, "#b07fe0"); ell(e, p.x, p.y - 34, 16, 5, "#b07fe0"); ell(e, p.x, p.y - 66, 14, 6, "#b07fe0"); rect(e, p.x + 8, p.y - 52, 18, 12, "#d4a26a"); } },
  lamp: { gx: 3.2, gy: 4.2, draw: (e, gx, gy) => { const p = e.S(gx, gy); e.line(p.x, p.y, p.x, p.y - 46, 3, "#3b2a20"); ell(e, p.x, p.y - 50, 7, 7, YELLOW); e.line(p.x - 9, p.y - 57, p.x + 9, p.y - 57, 3, "#3b2a20"); } },
  rug: { gx: 5.0, gy: 3.8, draw: (e, gx, gy) => { const p = e.S(gx, gy); ell(e, p.x, p.y, e.tw * 0.8, e.tw * 0.35, "#a9c8e3"); const c = e.c2d; c.setLineDash([4, 4]); ell(e, p.x, p.y, e.tw * 0.6, e.tw * 0.25, "#a9c8e3"); c.setLineDash([]); } },
  mouse: { gx: 3.8, gy: 5.8, draw: (e, gx, gy) => { const p = e.S(gx, gy); ell(e, p.x, p.y - 5, 8, 5, "#b9b2a6"); ell(e, p.x - 6, p.y - 10, 3, 3, "#f4a3b5"); const c = e.c2d; c.beginPath(); c.moveTo(p.x + 8, p.y - 5); c.quadraticCurveTo(p.x + 16, p.y - 12, p.x + 20, p.y - 4); c.stroke(); } },
  pond: { gx: 7.0, gy: 7.0, draw: (e, gx, gy) => { const p = e.S(gx, gy); ell(e, p.x, p.y, e.tw * 0.8, e.tw * 0.34, "#6fa8d8"); ell(e, p.x + 4, p.y + 2, e.tw * 0.5, e.tw * 0.18, "#8fc0e8"); e.line(p.x - 12, p.y - 2, p.x + 2, p.y - 2, 3, "#e9893f"); e.line(p.x + 2, p.y - 2, p.x + 7, p.y - 6, 2, "#e9893f"); e.line(p.x + 2, p.y - 2, p.x + 7, p.y + 2, 2, "#e9893f"); } },
  bench: { gx: 2.6, gy: 7.4, draw: (e, gx, gy) => { const p = e.S(gx, gy); rect(e, p.x - 24, p.y - 18, 48, 6, "#b07a4a"); rect(e, p.x - 24, p.y - 32, 48, 8, "#b07a4a"); e.line(p.x - 20, p.y - 12, p.x - 20, p.y, 3); e.line(p.x + 20, p.y - 12, p.x + 20, p.y, 3); } },
  sunflower: { gx: 7.4, gy: 4.0, draw: (e, gx, gy) => { const p = e.S(gx, gy); for (const dx of [-8, 8]) { e.line(p.x + dx, p.y, p.x + dx, p.y - 44, 3, "#4f8a32"); ell(e, p.x + dx, p.y - 48, 9, 9, YELLOW); ell(e, p.x + dx, p.y - 48, 4, 4, "#7a4a2a"); } } },
};
