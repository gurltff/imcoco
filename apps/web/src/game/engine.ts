/**
 * Coco's Home: a light Canvas 2D isometric world in thin black line art.
 * Runs ~30fps, pauses when hidden. Coco + stray cats are drawn from the shared SVG art.
 */
import { cocoSvg, type CocoPose } from "@coco/core";

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
interface Stray { gx: number; gy: number; tx: number; ty: number; fur: string; eye: string; mode: "enter" | "standoff" | "flee" | "leave"; dir: number }
interface Floater { x: number; y: number; text: string; t: number; color: string; size: number }

const INK = "#111";
const YELLOW = "#FFE95C";


export class WorldEngine {
  private ctx: CanvasRenderingContext2D;
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
    this.ctx = canvas.getContext("2d")!;
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
    this.TW = Math.min(this.W / 7.4, (this.H - 200) / 4.4, 120);
    this.TH = this.TW / 2;
    this.ox = this.W / 2;
    this.oy = Math.max(110, (this.H - 8 * this.TH) / 2 + 10);
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
        const furs = [["#9C9CA3", "#F3C546"], ["#E39B4F", "#7AC943"], ["#F2F2F2", "#62B5E5"]];
        const [fur, eye] = furs[Math.floor(Math.random() * furs.length)];
        this.strays.push({ gx: left ? -1 : 9, gy: 4 + Math.random() * 3, tx: 0, ty: 0, fur, eye, mode: "enter", dir: left ? 1 : -1 });
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
        else { c.state = "idle"; c.t = 1.5 + Math.random() * 3; }
      }
    }
    if (c.state === "eat") {
      this.munchT -= dt;
      if (this.munchT <= 0) {
        this.munchT = 0.75; this.cb.onMunch();
        const p = this.cocoScreen();
        this.float(["NOM", "MUNCH", "nom nom", "CRUNCH", "*chomp*"][Math.floor(Math.random() * 5)], { x: p.x + (Math.random() - 0.5) * 50, y: p.y - 60 }, INK, 16 + Math.random() * 6);
      }
      if (c.t <= 0) { const f = this.bowl!; this.bowl = null; c.state = "happy"; c.t = 2; this.cb.onFed(f); this.float("*satisfied burp*", { x: this.cocoScreen().x, y: this.cocoScreen().y - 80 }, INK, 14); }
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
    if (r < 0.2) { this.goTo(4.7, 2.2, "walk"); this.napNext = true; return; }
    if (r < 0.38) { c.state = "chase"; c.t = 4 + Math.random() * 2; c.speed = 1.2; return; }
    if (r < 0.75) { this.goTo(0.8 + Math.random() * 6.6, 2.8 + Math.random() * 4.6, "walk"); return; }
    c.state = "idle"; c.t = 2 + Math.random() * 3;
    if (this.napNext) { this.napNext = false; c.state = "nap"; c.t = 8 + Math.random() * 6; }
  }
  private napNext = false;

  // ---------- drawing ----------
  private cocoSize() { return this.TW * 1.25 * (1 + this.cb.getChonk() / 100 * 0.18); }

  private draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#fff";
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
      ctx.fillStyle = "rgba(18,26,56,.42)";
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.fillStyle = "#fff"; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(this.W - 50, 95, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(18,26,56,.9)"; ctx.beginPath(); ctx.arc(this.W - 43, 90, 14, 0, Math.PI * 2); ctx.fill();
      if (owned.includes("lamp")) {
        const p = this.toScreen(ITEMS.lamp.gx, ITEMS.lamp.gy);
        const g = ctx.createRadialGradient(p.x, p.y - 40, 4, p.x, p.y - 20, this.TW * 2.4);
        g.addColorStop(0, "rgba(255,233,92,.75)"); g.addColorStop(1, "rgba(255,233,92,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y - 20, this.TW * 2.4, 0, Math.PI * 2); ctx.fill();
      }
    }

    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / 1.6);
      ctx.font = `700 ${f.size}px Gaegu, "Patrick Hand", cursive`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = this.night ? "#fff" : f.color; ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  }

  private poly(pts: { x: number; y: number }[], fill: string | null = "#fff", lw = 1.6) {
    const ctx = this.ctx;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
  }
  line(x1: number, y1: number, x2: number, y2: number, lw = 1.5) {
    const ctx = this.ctx; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
  }
  up(p: { x: number; y: number }, h: number) { return { x: p.x, y: p.y - h }; }
  S(gx: number, gy: number) { return this.toScreen(gx, gy); }
  get tw() { return this.TW; }
  get c2d() { return this.ctx; }

  private drawGround() {
    const ctx = this.ctx; const S = (a: number, b: number) => this.toScreen(a, b);
    // yard outline, dashed
    ctx.setLineDash([2, 6]); this.poly([S(0, 0), S(8, 0), S(8, 8), S(0, 8)], null, 1.2); ctx.setLineDash([]);
    // sunbeam
    if (!this.night) {
      ctx.globalAlpha = 0.45;
      this.poly([S(4, 1.4), S(5.6, 1.4), S(5.9, 3), S(4.3, 3)], YELLOW, 0.01);
      ctx.globalAlpha = 1;
    }
    // path: stepping stones from the door to the bottom edge
    for (let i = 0; i < 6; i++) {
      const p = S(2.9 + (i % 2) * 0.25, 3.0 + i * 0.85);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, this.TW * 0.28, this.TH * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    }
    // street edge
    this.line(S(0, 8.6).x, S(0, 8.6).y, S(8.6, 8.6).x, S(8.6, 8.6).y, 1.4);
    this.line(S(8.6, 0).x, S(8.6, 0).y, S(8.6, 8.6).x, S(8.6, 8.6).y, 1.4);
    // gravel + grass ticks (deterministic)
    let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    ctx.fillStyle = INK;
    for (let i = 0; i < 60; i++) { const p = S(3.6 + rnd() * 1.4, 0.3 + rnd() * 1.0); ctx.fillRect(p.x, p.y, 1.4, 1.4); }
    for (let i = 0; i < 26; i++) {
      const p = S(rnd() * 8, 3 + rnd() * 5);
      this.line(p.x, p.y, p.x - 2, p.y - 5, 1); this.line(p.x + 3, p.y, p.x + 4, p.y - 6, 1);
    }
  }

  private drawHouse(gx: number, gy: number, w: number, d: number) {
    const S = (a: number, b: number) => this.toScreen(a, b);
    const h = this.TW * 1.25, rh = this.TW * 0.9;
    const A = S(gx, gy), B = S(gx + w, gy), C = S(gx + w, gy + d), D = S(gx, gy + d);
    const U = (p: { x: number; y: number }, k = h) => ({ x: p.x, y: p.y - k });
    this.poly([B, C, U(C), U(B)]); // right wall
    this.poly([D, C, U(C), U(D)]); // front wall
    const R1 = U(S(gx, gy + d / 2), h + rh), R2 = U(S(gx + w, gy + d / 2), h + rh);
    // chimney
    const ch = S(gx + w * 0.7, gy + d * 0.3);
    this.poly([U(ch, h + rh * 0.4), U({ x: ch.x + 12, y: ch.y - 6 }, h + rh * 0.4), U({ x: ch.x + 12, y: ch.y - 6 }, h + rh + 26), U(ch, h + rh + 26)]);
    this.poly([U(B), U(C), R2]); // gable
    this.poly([U(D), U(C), R2, R1]); // roof front slope
    // roof hatching
    for (let i = 1; i < 12; i++) {
      const t = i / 12;
      const a = { x: U(D).x + (U(C).x - U(D).x) * t, y: U(D).y + (U(C).y - U(D).y) * t };
      const b = { x: R1.x + (R2.x - R1.x) * t, y: R1.y + (R2.y - R1.y) * t };
      this.line(a.x, a.y, b.x, b.y, 0.9);
    }
    // door on front wall
    const d0 = S(gx + w * 0.62, gy + d), d1 = S(gx + w * 0.86, gy + d);
    this.poly([d0, d1, U(d1, h * 0.62), U(d0, h * 0.62)]);
    // window
    const w0 = S(gx + w * 0.15, gy + d), w1 = S(gx + w * 0.4, gy + d);
    this.poly([U(w0, h * 0.45), U(w1, h * 0.45), U(w1, h * 0.8), U(w0, h * 0.8)]);
    const wm0 = { x: (w0.x + w1.x) / 2, y: (w0.y + w1.y) / 2 };
    this.line(wm0.x, wm0.y - h * 0.45, wm0.x, wm0.y - h * 0.8, 1.2);
    // vine
    const v = S(gx + w * 0.95, gy + d);
    for (let i = 0; i < 5; i++) { this.line(v.x, v.y - i * 9, v.x, v.y - i * 9 - 9, 1); this.line(v.x, v.y - i * 9 - 5, v.x - 4, v.y - i * 9 - 9, 1); }
    void A;
  }

  private drawTree(gx: number, gy: number, s = 1) {
    const ctx = this.ctx; const p = this.toScreen(gx, gy); const r = this.TW * 0.55 * s;
    this.line(p.x, p.y, p.x, p.y - r * 2.2, 2); this.line(p.x, p.y - r * 1.4, p.x + 8, p.y - r * 1.8, 1.5);
    ctx.beginPath();
    const cy = p.y - r * 2.6;
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; ctx.arc(p.x + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r * 0.6, r * 0.42, a - 1.2, a + 1.2); }
    ctx.closePath(); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    this.line(p.x - r * 0.3, cy, p.x - r * 0.1, cy - 4, 1); this.line(p.x + r * 0.2, cy + 6, p.x + r * 0.35, cy + 2, 1);
  }

  private drawMailbox(gx: number, gy: number) {
    const ctx = this.ctx; const p = this.toScreen(gx, gy);
    this.line(p.x, p.y, p.x, p.y - 26, 2.2);
    ctx.beginPath(); ctx.moveTo(p.x - 12, p.y - 26); ctx.lineTo(p.x + 12, p.y - 26); ctx.lineTo(p.x + 12, p.y - 40);
    ctx.arc(p.x, p.y - 40, 12, 0, Math.PI, true); ctx.closePath();
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    this.line(p.x + 12, p.y - 42, p.x + 12, p.y - 54, 1.5);
    ctx.fillStyle = YELLOW; ctx.fillRect(p.x + 12, p.y - 54, 9, 6); ctx.strokeRect(p.x + 12, p.y - 54, 9, 6);
    ctx.font = "700 11px Gaegu, cursive"; ctx.textAlign = "center"; ctx.fillStyle = INK; ctx.fillText("✉", p.x, p.y - 32);
  }

  private drawFencePost(gx: number, gy: number) {
    const p = this.toScreen(gx, gy), q = this.toScreen(gx + 1.1, gy);
    this.line(p.x, p.y, p.x, p.y - 22, 1.6);
    this.line(p.x, p.y - 8, q.x, q.y - 8, 1.2); this.line(p.x, p.y - 17, q.x, q.y - 17, 1.2);
  }

  private drawBowl(gx: number, gy: number) {
    const ctx = this.ctx; const p = this.toScreen(gx, gy); const w = this.TW * 0.36;
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 6, w, w * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x - w, p.y - 6); ctx.quadraticCurveTo(p.x, p.y + 10, p.x + w, p.y - 6); ctx.stroke();
    if (this.bowl) {
      ctx.fillStyle = YELLOW; ctx.beginPath(); ctx.ellipse(p.x, p.y - 7, w * 0.75, w * 0.26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (this.bowl === "fish") { this.line(p.x - 8, p.y - 12, p.x + 6, p.y - 12, 1.5); this.line(p.x + 6, p.y - 12, p.x + 11, p.y - 16, 1.4); this.line(p.x + 6, p.y - 12, p.x + 11, p.y - 8, 1.4); }
    }
  }

  private drawCoco() {
    const c = this.coco; const ctx = this.ctx; const p = this.cocoScreen(); const size = this.cocoSize();
    const pose: CocoPose =
      c.state === "walk" || c.state === "chase" || c.state === "zoom" ? "walk" :
      c.state === "nap" || c.state === "sleep" ? "sleep" :
      c.state === "eat" ? "eat" : c.state === "puff" ? "puff" : c.state === "cuddle" ? "purr" : c.state === "happy" ? "play" :
      (this.cb.getBehaviours() >= 2 && Math.floor(this.time / 9) % 3 === 2) ? "sleep" : "sit";
    const blink = pose === "sit" && c.blink;
    const key = `coco-${pose}-${blink}-${c.step % 2}`;
    const im = this.img(key, () => cocoSvg({ pose, blink, step: c.step % 2, accessories: false, outline: INK }));
    const chonk = this.cb.getChonk() / 100;
    const w = size * (1 + chonk * 0.12), h = size * (210 / 220);
    // soft shadow
    ctx.fillStyle = "rgba(0,0,0,.08)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, w * 0.38, w * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    const hop = this.jump > 0 ? Math.sin((this.jump / 0.18) * Math.PI) * 8 : 0;
    const breathe = pose === "sleep" || pose === "purr" ? Math.sin(this.time * 2) * 1.2 : 0;
    ctx.save();
    ctx.translate(p.x, p.y - hop);
    if (c.dir < 0 && pose === "walk") ctx.scale(-1, 1);
    if (im.complete) ctx.drawImage(im, -w / 2, -h - breathe, w, h + breathe);
    ctx.restore();
    if (pose === "sleep") {
      ctx.font = "700 14px Gaegu, cursive"; ctx.fillStyle = this.night ? "#fff" : INK; ctx.textAlign = "left";
      ctx.globalAlpha = 0.5 + Math.sin(this.time * 2) * 0.5; ctx.fillText("z z z", p.x + w * 0.2, p.y - h * 0.9); ctx.globalAlpha = 1;
    }
    if (this.attention) {
      const bx = p.x + w * 0.35, by = p.y - h - 10;
      ctx.fillStyle = YELLOW; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.roundRect(bx - 18, by - 14, 36, 22, 11); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx - 8, by + 8); ctx.lineTo(bx - 14, by + 16); ctx.lineTo(bx - 1, by + 8); ctx.fillStyle = YELLOW; ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(bx + i * 8, by - 3 + (Math.floor(this.time * 3) % 3 === i + 1 ? -2 : 0), 2, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  private drawStray(s: Stray) {
    const ctx = this.ctx; const p = this.toScreen(s.gx, s.gy); const size = this.TW * 1.05;
    const pose: CocoPose = s.mode === "standoff" ? "puff" : "walk";
    const step = Math.floor(this.time * (s.mode === "flee" ? 12 : 5)) % 2;
    const im = this.img(`stray-${s.fur}-${pose}-${step}`, () => cocoSvg({ pose, step, accessories: false, outline: INK, fur: s.fur, eye: s.eye }));
    ctx.save(); ctx.translate(p.x, p.y);
    if (s.dir < 0 && pose === "walk") ctx.scale(-1, 1);
    const shake = s.mode === "standoff" ? Math.sin(this.time * 30) * 1.2 : 0;
    if (im.complete) ctx.drawImage(im, -size / 2 + shake, -size * 0.95, size, size * 0.95);
    ctx.restore();
    if (s.mode === "standoff") {
      ctx.font = "700 15px Gaegu, cursive"; ctx.textAlign = "center"; ctx.fillStyle = INK;
      ctx.fillText("hsss", p.x, p.y - size - 4);
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
const ell = (e: WorldEngine, x: number, y: number, rx: number, ry: number, fill = "#fff") => {
  const c = e.c2d; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.5; c.stroke();
};
const rect = (e: WorldEngine, x: number, y: number, w: number, h: number, fill = "#fff") => {
  const c = e.c2d; c.fillStyle = fill; c.fillRect(x, y, w, h); c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(x, y, w, h);
};

export const ITEMS: Record<string, { gx: number; gy: number; draw: ItemDraw }> = {
  bed: { gx: 5.9, gy: 1.6, draw: (e, gx, gy) => { const p = e.S(gx, gy); ell(e, p.x, p.y - 4, e.tw * 0.62, e.tw * 0.26); ell(e, p.x, p.y - 6, e.tw * 0.44, e.tw * 0.16, YELLOW); } },
  plant: { gx: 0.6, gy: 4.4, draw: (e, gx, gy) => { const p = e.S(gx, gy); rect(e, p.x - 9, p.y - 16, 18, 16); for (const a of [-0.6, 0, 0.6]) e.line(p.x, p.y - 16, p.x + Math.sin(a) * 18, p.y - 16 - Math.cos(a) * 20, 1.5); ell(e, p.x - 10, p.y - 32, 5, 3); ell(e, p.x + 10, p.y - 32, 5, 3); ell(e, p.x, p.y - 37, 4, 5); } },
  box: { gx: 6.4, gy: 5.2, draw: (e, gx, gy) => { const p = e.S(gx, gy); rect(e, p.x - 16, p.y - 20, 32, 20); e.line(p.x - 16, p.y - 20, p.x - 24, p.y - 28); e.line(p.x + 16, p.y - 20, p.x + 24, p.y - 28); } },
  post: { gx: 6.8, gy: 2.6, draw: (e, gx, gy) => { const p = e.S(gx, gy); ell(e, p.x, p.y - 2, 14, 5); rect(e, p.x - 5, p.y - 44, 10, 42); for (let i = 0; i < 6; i++) e.line(p.x - 5, p.y - 8 - i * 6, p.x + 5, p.y - 12 - i * 6, 1); ell(e, p.x, p.y - 46, 12, 5); } },
  flowers: { gx: 1.4, gy: 6.4, draw: (e, gx, gy) => { const p = e.S(gx, gy); ell(e, p.x, p.y, e.tw * 0.5, e.tw * 0.2); for (let i = -2; i <= 2; i++) { e.line(p.x + i * 8, p.y - 2, p.x + i * 8, p.y - 14, 1.2); ell(e, p.x + i * 8, p.y - 16, 3.5, 3.5, i % 2 ? YELLOW : "#fff"); } } },
  tree: { gx: 4.6, gy: 6.6, draw: (e, gx, gy) => { const p = e.S(gx, gy); rect(e, p.x - 4, p.y - 64, 8, 64); ell(e, p.x, p.y - 2, 18, 6); ell(e, p.x, p.y - 34, 16, 5); ell(e, p.x, p.y - 66, 14, 6); rect(e, p.x + 8, p.y - 52, 18, 12); } },
  lamp: { gx: 3.2, gy: 4.2, draw: (e, gx, gy) => { const p = e.S(gx, gy); e.line(p.x, p.y, p.x, p.y - 46, 2); ell(e, p.x, p.y - 50, 7, 7, YELLOW); e.line(p.x - 9, p.y - 56, p.x + 9, p.y - 56, 2); } },
  rug: { gx: 5.0, gy: 3.8, draw: (e, gx, gy) => { const p = e.S(gx, gy); ell(e, p.x, p.y, e.tw * 0.8, e.tw * 0.35); const c = e.c2d; c.setLineDash([3, 4]); ell(e, p.x, p.y, e.tw * 0.6, e.tw * 0.25); c.setLineDash([]); } },
  mouse: { gx: 3.8, gy: 5.8, draw: (e, gx, gy) => { const p = e.S(gx, gy); ell(e, p.x, p.y - 5, 8, 5); ell(e, p.x - 6, p.y - 10, 3, 3); const c = e.c2d; c.beginPath(); c.moveTo(p.x + 8, p.y - 5); c.quadraticCurveTo(p.x + 16, p.y - 12, p.x + 20, p.y - 4); c.stroke(); } },
  pond: { gx: 7.0, gy: 7.0, draw: (e, gx, gy) => { const p = e.S(gx, gy); ell(e, p.x, p.y, e.tw * 0.8, e.tw * 0.34); e.line(p.x - 12, p.y - 2, p.x + 2, p.y - 2, 1.4); e.line(p.x + 2, p.y - 2, p.x + 7, p.y - 6, 1.2); e.line(p.x + 2, p.y - 2, p.x + 7, p.y + 2, 1.2); e.line(p.x + 14, p.y + 4, p.x + 24, p.y + 4, 1); } },
  bench: { gx: 2.6, gy: 7.4, draw: (e, gx, gy) => { const p = e.S(gx, gy); rect(e, p.x - 24, p.y - 18, 48, 6); rect(e, p.x - 24, p.y - 32, 48, 8); e.line(p.x - 20, p.y - 12, p.x - 20, p.y, 2); e.line(p.x + 20, p.y - 12, p.x + 20, p.y, 2); } },
  sunflower: { gx: 7.4, gy: 4.0, draw: (e, gx, gy) => { const p = e.S(gx, gy); for (const dx of [-8, 8]) { e.line(p.x + dx, p.y, p.x + dx, p.y - 44, 1.6); ell(e, p.x + dx, p.y - 48, 9, 9, YELLOW); ell(e, p.x + dx, p.y - 48, 4, 4, INK); } } },
};
