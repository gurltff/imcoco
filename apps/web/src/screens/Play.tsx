import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { updateGame, useGame } from "../game/state";
import { CAT_CURSOR, Hud, PixelCoco, SHEETS, Toast, YellowBtn } from "../game/ui";
import { readLocal } from "../lib/store";
import { DEFAULT_GAME, type GameState } from "../game/state";
import meadow from "../game/sprites/bg-meadow.png";
import garden from "../game/sprites/bg-garden.png";
import stage from "../game/sprites/bg-stage.png";
import boxSheet from "../game/sprites/box.png";
import meadowWide from "../game/sprites/bg-meadow-wide.png";
import gardenWide from "../game/sprites/bg-garden-wide.png";
import stageWide from "../game/sprites/bg-stage-wide.png";

// tall scenes for phones, wide scenes for laptops: picked by the play area's shape
const BG = { yarn: meadow, laser: garden, box: stage };
const BG_WIDE = { yarn: meadowWide, laser: gardenWide, box: stageWide };
/** Coco gets visibly wider and a bit taller as his chonk level rises. */
export const chonkScale = () => {
  const c = (readLocal<GameState>("game", DEFAULT_GAME).chonk ?? 10) / 100;
  return { x: 1.05 + c * 0.6, y: 1 + c * 0.22 };
};
import { coco } from "../lib/audio";
import type { Screen } from "../lib/nav";

const earn = (p: { fish?: number; yarn?: number; xp?: number }) =>
  updateGame((s) => ({ fish: s.fish + (p.fish ?? 0), yarn: s.yarn + (p.yarn ?? 0), xp: s.xp + (p.xp ?? 0) }));

/** Moves the pixel Coco sprite directly in the DOM for 60fps chasing without React re-renders. */
function useCocoSprite(size: number) {
  const el = useRef<HTMLDivElement>(null);
  const set = (x: number, y: number, pose: "walk" | "sit" | "play" | "puff", dir: number, _step: number) => {
    if (!el.current) return;
    const sheet = pose === "walk" ? SHEETS.run : SHEETS.idle;
    const now = performance.now();
    const f = Math.floor(now / (1000 / (pose === "walk" ? 14 : 8))) % sheet.frames;
    const hop = pose === "play" ? Math.abs(Math.sin(now / 90)) * 10 : 0;
    const st = el.current.style;
    st.backgroundImage = `url(${sheet.url})`;
    st.backgroundSize = `${sheet.frames * size}px ${size}px`;
    st.backgroundPosition = `${-f * size}px 0`;
    const f2 = chonkScale();
    st.transformOrigin = "50% 100%";
    st.transform = `translate(${x - size * 0.51}px, ${y - size - hop}px) scale(${(dir < 0 ? -1 : 1) * f2.x}, ${f2.y})`;
  };
  return { el, set };
}

function Laser({ flash }: { flash: (t: string) => void }) {
  const area = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const S = 144;
  const sprite = useCocoSprite(S);
  const st = useRef({ dx: 200, dy: 150, cx: 60, cy: 300, auto: true, cool: 0, step: 0, t: 0, dir: 1, catches: 0 });
  useEffect(() => {
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const s = st.current; const r = area.current!.getBoundingClientRect();
      s.t += dt;
      if (s.auto) { s.dx = r.width / 2 + Math.sin(s.t * 0.9) * r.width * 0.35; s.dy = r.height * 0.55 + Math.sin(s.t * 1.7) * r.height * 0.25; }
      const floorY = Math.min(r.height - 10, Math.max(S, s.dy + 20));
      const vx = s.dx - s.cx, vy = floorY - s.cy, d = Math.hypot(vx, vy);
      s.cool -= dt;
      let pose: "walk" | "sit" | "play" = "sit";
      if (d > 14) { const sp = 260 * dt; s.cx += (vx / d) * Math.min(sp, d); s.cy += (vy / d) * Math.min(sp, d); pose = "walk"; s.dir = Math.sign(vx) || s.dir; s.step += dt * 5; }
      else if (s.cool <= 0) {
        s.cool = 1.2; s.catches++;
        earn({ yarn: 2, xp: 2 }); flash("Gotcha! +2 🧶");
        if (s.catches % 3 === 0) coco.meow("tap");
        s.auto = true; s.t += 2 + Math.random() * 3;
        pose = "play";
      }
      if (s.cool > 0.6) pose = "play";
      sprite.set(s.cx, s.cy, pose, s.dir, Math.floor(s.step) % 2);
      if (dot.current) dot.current.style.transform = `translate(${s.dx - 9}px, ${s.dy - 9}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const move = (e: React.PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    st.current.auto = false; st.current.dx = e.clientX - r.left; st.current.dy = e.clientY - r.top;
  };
  return (
    <div ref={area} onPointerMove={move} onPointerDown={move} onPointerLeave={() => (st.current.auto = true)} className="relative h-full touch-none overflow-hidden">
      <p className="absolute inset-x-6 top-2 rounded-md bg-white/75 text-center text-lg text-black/70">Move your finger or mouse. Coco hunts the dot.</p>
      <div ref={dot} className="absolute left-0 top-0 h-[18px] w-[18px] rounded-full border-2 border-black bg-sun" style={{ boxShadow: "0 0 12px 4px rgba(255,233,92,.9)" }} />
      <div ref={sprite.el} className="pointer-events-none absolute left-0 top-0" style={{ width: S, height: S, imageRendering: "pixelated", backgroundRepeat: "no-repeat" }} />
    </div>
  );
}

function Yarn({ flash }: { flash: (t: string) => void }) {
  const area = useRef<HTMLDivElement>(null);
  const ball = useRef<HTMLDivElement>(null);
  const S = 144, R = 22;
  const sprite = useCocoSprite(S);
  const st = useRef({ x: 200, y: 100, vx: 60, vy: 0, cx: 60, cool: 0, step: 0, dir: 1, bats: 0 });
  useEffect(() => {
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const s = st.current; const r = area.current!.getBoundingClientRect(); const floor = r.height - 12;
      s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 1 - 0.6 * dt;
      if (s.y > floor - R) { s.y = floor - R; s.vy *= -0.55; s.vx *= 0.92; }
      if (s.x < R) { s.x = R; s.vx = Math.abs(s.vx) * 0.8; }
      if (s.x > r.width - R) { s.x = r.width - R; s.vx = -Math.abs(s.vx) * 0.8; }
      const d = s.x - s.cx;
      let pose: "walk" | "sit" | "play" = "sit";
      if (Math.abs(d) > 40) { s.cx += Math.sign(d) * 190 * dt; s.dir = Math.sign(d); s.step += dt * 5; pose = "walk"; }
      s.cool -= dt;
      if (Math.abs(d) < 48 && s.y > floor - 90 && s.cool <= 0) {
        s.cool = 0.7; s.vx = (d >= 0 ? 1 : -1) * (220 + Math.random() * 160); s.vy = -380 - Math.random() * 200;
        s.bats++; earn({ yarn: 1, xp: 1 });
        if (s.bats % 4 === 0) { coco.meow("tap"); flash(`Bat bat bat! ${s.bats} bats`); }
      }
      if (s.cool > 0.4) pose = "play";
      sprite.set(s.cx, floor, pose, s.dir, Math.floor(s.step) % 2);
      if (ball.current) ball.current.style.transform = `translate(${s.x - R}px, ${s.y - R}px) rotate(${s.x * 3}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const bat = () => { const s = st.current; s.vy = -520; s.vx = (Math.random() - 0.5) * 500; };
  return (
    <div ref={area} className="relative h-full overflow-hidden">
      <p className="absolute inset-x-6 top-2 rounded-md bg-white/75 text-center text-lg text-black/70">Tap the yarn ball to toss it. Each bat = +1 🧶</p>
      
      <button aria-label="Toss the yarn" ref={ball as any} onPointerDown={bat} className="absolute left-0 top-0" style={{ width: R * 2, height: R * 2 }}>
        <svg viewBox="0 0 32 32" className="h-full w-full"><circle cx="16" cy="16" r="14" fill="#FFE95C" stroke="#111" strokeWidth="2" /><path d="M6 10 q10 6 20 -2 M4 17 q12 6 24 -4 M8 26 q10 -4 16 -14" fill="none" stroke="#111" strokeWidth="1.6" /></svg>
      </button>
      <div ref={sprite.el} className="pointer-events-none absolute left-0 top-0" style={{ width: S, height: S, imageRendering: "pixelated", backgroundRepeat: "no-repeat" }} />
    </div>
  );
}

function BoxGame({ flash }: { flash: (t: string) => void }) {
  const [order, setOrder] = useState([0, 1, 2]); // order[slot] = box id
  const [cat, setCat] = useState(1); // box id Coco is in
  const [phase, setPhase] = useState<"ready" | "show" | "shuffle" | "pick" | "result">("ready");
  const [picked, setPicked] = useState<number | null>(null);
  const start = () => {
    setPicked(null);
    const c = Math.floor(Math.random() * 3); setCat(c); setPhase("show");
    setTimeout(() => {
      setPhase("shuffle");
      let n = 0;
      const id = setInterval(() => {
        setOrder((o) => { const a = [...o]; const i = Math.floor(Math.random() * 3); const j = (i + 1 + Math.floor(Math.random() * 2)) % 3; [a[i], a[j]] = [a[j], a[i]]; return a; });
        if (++n >= 7) { clearInterval(id); setTimeout(() => setPhase("pick"), 450); }
      }, 420);
    }, 1400);
  };
  const pick = (box: number) => {
    if (phase !== "pick") return;
    setPicked(box); setPhase("result");
    if (box === cat) { earn({ fish: 6, xp: 4 }); coco.meow("tap"); flash("Found him! +6 🐟"); }
    else { coco.meow("attention"); flash("Empty! A smug meow from another box…"); }
  };
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-3">
      <p className="rounded-md bg-black/40 px-3 py-1 text-center text-xl text-[#ffe9a8]">Coco hides in a box. Keep your eye on him!</p>
      <div className="relative h-36 w-full max-w-[340px]">
        {[0, 1, 2].map((box) => {
          const slot = order.indexOf(box);
          const open = phase === "show" ? box === cat : phase === "result" ? box === picked || box === cat : false;
          return (
            <motion.button key={box} onClick={() => pick(box)} aria-label={`Box ${slot + 1}`}
              className="absolute bottom-0 flex w-[30%] flex-col items-center" animate={{ left: `${slot * 35}%` }} transition={{ type: "spring", stiffness: 300, damping: 26 }}>
              <motion.div animate={{ y: open && box === cat ? -18 : 40, opacity: open && box === cat ? 1 : 0 }} className="-mb-10 h-20">
                <PixelCoco pose="sit" scale={2} />
              </motion.div>
              <div className="pixel-sheet relative w-full" style={{ aspectRatio: "32 / 30", backgroundImage: `url(${boxSheet})`, backgroundSize: "200% 100%", backgroundPosition: open ? "100% 0" : "0 0" }} />
            </motion.button>
          );
        })}
      </div>
      {(phase === "ready" || phase === "result") && <YellowBtn onClick={start} className="px-8 text-2xl">{phase === "ready" ? "Start" : "Again!"}</YellowBtn>}
      {phase === "pick" && <p className="rounded-md bg-black/40 px-3 text-2xl font-bold text-[#ffe9a8]">Which box?</p>}
      {phase === "shuffle" && <p className="rounded-md bg-black/40 px-3 text-2xl text-[#ffe9a8]">shuffle shuffle…</p>}
    </div>
  );
}

export function Play({ onNav }: { onNav: (s: Screen) => void }) {
  const [g] = useGame();
  const [tab, setTab] = useState<"yarn" | "laser" | "box">("yarn");
  const [toast, setToast] = useState("");
  const area = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = area.current; if (!el) return;
    const ro = new ResizeObserver(() => setWide(el.clientWidth > el.clientHeight * 1.1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast((x) => (x === t ? "" : x)), 1500); };
  return (
    <div className="relative flex h-full flex-col bg-white font-game text-black" style={{ cursor: CAT_CURSOR }}>
      <div className="relative h-[60px] shrink-0"><Hud g={g} onBack={() => onNav("world")} /></div>
      <div className="mx-3 mt-1 flex gap-1 lg:mx-auto lg:w-full lg:max-w-3xl" role="tablist">
        {([["yarn", "Yarn"], ["laser", "Laser dot"], ["box", "The box"]] as const).map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`min-h-[44px] flex-1 rounded-md border-[2.5px] border-black text-xl ${tab === id ? "bg-sun font-bold" : "bg-white"}`} style={{ boxShadow: "1px 2px 0 #000" }}>{l}</button>
        ))}
      </div>
      <div ref={area} className="pixel-sheet relative m-3 flex-1 overflow-hidden rounded-lg border-[2.5px] border-black lg:mx-auto lg:mb-6 lg:w-full lg:max-w-4xl" style={{ backgroundImage: `url(${(wide ? BG_WIDE : BG)[tab]})`, backgroundSize: "100% 100%" }}>
        {tab === "yarn" && <Yarn flash={flash} />}
        {tab === "laser" && <Laser flash={flash} />}
        {tab === "box" && <BoxGame flash={flash} />}
      </div>
      <Toast text={toast} />
    </div>
  );
}
