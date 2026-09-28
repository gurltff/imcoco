/**
 * Coco's voice. Shared by the web app, extension and desktop overlay.
 * - Real meows are decoded from mp3 and played at random.
 * - The purr uses purrUrl if provided, otherwise a synthesized cat purr
 *   (filtered noise with ~25 Hz tremolo), so it always works offline.
 * - A slow "breath" modulation drives the purr volume; breathPhase() exposes it so
 *   UI (like the breathing circle) can stay in sync.
 */

export interface CocoAudioOptions {
  meowUrls: string[];
  purrUrl?: string;
  onCaption?: (text: string) => void;
}

export const BREATH_SECONDS = 8; // 4s in, 4s out

export class CocoAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private purrBuffer?: AudioBuffer;
  private purr?: { out: GainNode; stop: () => void; startedAt: number };
  private _volume = 0.8;
  private _muted = false;
  private loading?: Promise<void>;
  private lastMeowIndex = -1;
  private lastMunchCaption = -1e9;

  constructor(private opts: CocoAudioOptions) {}

  get unlocked() { return !!this.ctx && this.ctx.state === "running"; }
  get volume() { return this._volume; }
  get muted() { return this._muted; }
  get purring() { return !!this.purr; }

  /** Call from a user gesture (tap/click/keydown) to satisfy autoplay rules. */
  async unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
      try { (navigator as any).audioSession && ((navigator as any).audioSession.type = "playback"); } catch { /* older Safari */ }
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.applyVolume();
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.preload();
  }

  preload() {
    if (!this.ctx) return Promise.resolve();
    this.loading ??= (async () => {
      const ctx = this.ctx!;
      const load = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return undefined;
          return await ctx.decodeAudioData(await res.arrayBuffer());
        } catch { return undefined; }
      };
      this.opts.meowUrls.forEach((u) => { const a = new Audio(); a.preload = "auto"; a.src = u; });
      this.purrBuffer = this.opts.purrUrl ? await load(this.opts.purrUrl) : undefined;
    })();
    return this.loading;
  }

  setVolume(v: number) { this._volume = Math.min(1, Math.max(0, v)); this.applyVolume(); }
  setMuted(m: boolean) { this._muted = m; this.applyVolume(); }

  private applyVolume() {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(this._muted ? 0 : this._volume, this.ctx.currentTime, 0.05);
  }

  /**
   * Random meow. Uses <audio> elements (not Web Audio) because they:
   * - play data: URLs even where fetch() is blocked by a page's CSP,
   * - still play on iPhones with the silent switch on.
   */
  async meow(kind: "tap" | "attention" | "food" | "mrrp" = "tap") {
    const captions = { tap: "Coco: meow!", attention: "Coco: meow (look at me!)", food: "Coco: MEOW! (food?!)", mrrp: "Coco: mrrp…" };
    this.opts.onCaption?.(captions[kind]);
    this.unlock().catch(() => {});
    const urls = this.opts.meowUrls;
    if (urls.length === 0 || this._muted) return;
    let i = Math.floor(Math.random() * urls.length);
    if (urls.length > 1 && i === this.lastMeowIndex) i = (i + 1) % urls.length;
    this.lastMeowIndex = i;
    const el = new Audio(urls[i]);
    const rate = { tap: 1, attention: 1.05, food: 1.1, mrrp: 1.15 }[kind] * (0.96 + Math.random() * 0.08);
    (el as any).preservesPitch = false;
    (el as any).webkitPreservesPitch = false;
    el.playbackRate = rate;
    el.volume = Math.min(1, this._volume * (kind === "mrrp" ? 0.6 : 1));
    try { await el.play(); } catch { /* blocked until the first tap */ }
  }

  /** Comically loud crunchy munch (synthesized). */
  async munch() {
    await this.unlock();
    if (performance.now() - this.lastMunchCaption > 4000) this.opts.onCaption?.("Coco: NOM NOM MUNCH (very loud)");
    this.lastMunchCaption = performance.now();
    const ctx = this.ctx!;
    const t0 = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const len = Math.floor(ctx.sampleRate * 0.09);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 2);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 1400 + Math.random() * 1200; bp.Q.value = 1.4;
      const g = ctx.createGain(); g.gain.value = 1.4;
      src.connect(bp).connect(g).connect(this.master!);
      src.start(t0 + i * 0.16 + Math.random() * 0.03);
    }
  }

  /** Start (or adjust) the purr. intensity 0..1 scales loudness. */
  async startPurr(intensity = 0.5, fadeSeconds = 1.5) {
    await this.unlock();
    const ctx = this.ctx!;
    const target = 0.15 + 0.85 * Math.min(1, Math.max(0, intensity));
    if (this.purr) { this.setPurrIntensity(intensity); return; }
    this.opts.onCaption?.("Coco is purring softly…");

    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(this.master!);
    // Breath modulation: gain = 0.65 + 0.35·sin(2πt/BREATH)
    const breath = ctx.createGain();
    breath.gain.value = 0.65;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 1 / BREATH_SECONDS;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.35;
    lfo.connect(lfoDepth).connect(breath.gain);
    breath.connect(out);

    const stops: (() => void)[] = [];
    if (this.purrBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.purrBuffer;
      src.loop = true;
      src.connect(breath);
      src.start();
      stops.push(() => src.stop());
    } else {
      stops.push(this.synthPurr(ctx, breath));
    }
    const startedAt = ctx.currentTime;
    lfo.start(startedAt);
    stops.push(() => lfo.stop());
    out.gain.setTargetAtTime(target, startedAt, fadeSeconds / 3);
    this.purr = { out, startedAt, stop: () => stops.forEach((s) => s()) };
  }

  setPurrIntensity(intensity: number) {
    if (!this.purr || !this.ctx) return;
    const target = 0.15 + 0.85 * Math.min(1, Math.max(0, intensity));
    this.purr.out.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
  }

  stopPurr(fadeSeconds = 2) {
    if (!this.purr || !this.ctx) return;
    const p = this.purr;
    this.purr = undefined;
    p.out.gain.cancelScheduledValues(this.ctx.currentTime);
    p.out.gain.setTargetAtTime(0, this.ctx.currentTime, fadeSeconds / 4);
    setTimeout(() => { p.stop(); p.out.disconnect(); }, fadeSeconds * 1000 + 200);
  }

  /** 0..1 position in the breath cycle (0 = start of inhale). Syncs UI to the purr. */
  breathPhase(): number {
    if (!this.ctx) return (performance.now() / 1000 / BREATH_SECONDS) % 1;
    const start = this.purr?.startedAt ?? 0;
    return (((this.ctx.currentTime - start) / BREATH_SECONDS) % 1 + 1) % 1;
  }

  private synthPurr(ctx: AudioContext, dest: AudioNode) {
    // Brown noise loop
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 40;
    // ~25 Hz rumble = the purr
    const trem = ctx.createGain();
    trem.gain.value = 0.5;
    const flutter = ctx.createOscillator();
    flutter.type = "triangle";
    flutter.frequency.value = 25;
    const flutterDepth = ctx.createGain();
    flutterDepth.gain.value = 0.5;
    flutter.connect(flutterDepth).connect(trem.gain);
    // Low body tone
    const body = ctx.createOscillator();
    body.frequency.value = 50;
    const bodyGain = ctx.createGain();
    bodyGain.gain.value = 0.12;
    body.connect(bodyGain).connect(trem);
    noise.connect(hp).connect(lp).connect(trem).connect(dest);
    noise.start(); flutter.start(); body.start();
    return () => { noise.stop(); flutter.stop(); body.stop(); };
  }
}
