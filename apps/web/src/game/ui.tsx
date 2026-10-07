import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { xpToNext, type GameState } from "./state";
import idleUrl from "./sprites/coco-idle.png";
import runUrl from "./sprites/coco-run.png";
import sleepUrl from "./sprites/coco-sleep.png";
import cursorUrl from "./sprites/cursor-default.png";
import stickersUrl from "./sprites/stickers.png";
import sitUrl from "./sprites/coco-sit.png";
import loafUrl from "./sprites/coco-loaf.png";

export const SHEETS = {
  idle: { url: idleUrl, frames: 12, fps: 8 },
  run: { url: runUrl, frames: 6, fps: 12 },
  sleep: { url: sleepUrl, frames: 1, fps: 1 },
  sit: { url: sitUrl, frames: 8, fps: 5 },
  loaf: { url: loafUrl, frames: 4, fps: 1 },
};

/** One die-cut pixel sticker of Coco (0–5) from the sticker sheet. */
export function Sticker({ i, scale = 2, className = "" }: { i: number; scale?: number; className?: string }) {
  const c = 52 * scale;
  return <div aria-hidden className={`pixel-sheet ${className}`} style={{ width: c, height: c, backgroundImage: `url(${stickersUrl})`, backgroundSize: `${6 * c}px ${c}px`, backgroundPosition: `${-i * c}px 0` }} />;
}
/** Little pixel Coco cursor for the game screens. */
export const CAT_CURSOR = `url(${cursorUrl}) 0 0, auto`;

/** Coco as an animated pixel sprite (48×48 frames, scaled by whole numbers so pixels stay crisp). */
export function PixelCoco({ pose = "idle", scale = 2, flip = false, className = "" }: { pose?: keyof typeof SHEETS; scale?: number; flip?: boolean; className?: string }) {
  const s = SHEETS[pose]; const size = 48 * scale;
  return (
    <div aria-hidden className={`pixel-sheet ${className}`} style={{
      width: size, height: size, backgroundImage: `url(${s.url})`, backgroundSize: `${s.frames * size}px ${size}px`,
      ["--end" as string]: `${-s.frames * size}px`,
      animation: s.frames > 1 ? `pxsheet ${s.frames / s.fps}s steps(${s.frames}) infinite` : undefined,
      transform: flip ? "scaleX(-1)" : undefined,
    }} />
  );
}

import fishPx from "./sprites/icon-fish.png";
import yarnPx from "./sprites/icon-yarn.png";
import starPx from "./sprites/icon-star.png";

/** Little pixel icons for the game HUD and shop prices. */
const PxIcon = ({ src, w, h, s = 2 }: { src: string; w: number; h: number; s?: number }) => (
  <img src={src} width={w * s} height={h * s} alt="" aria-hidden style={{ imageRendering: "pixelated" }} />
);
export const FishIcon = ({ s = 18 }: { s?: number }) => <PxIcon src={fishPx} w={17} h={8} s={Math.max(1, Math.round(s / 10))} />;
export const YarnIcon = ({ s = 18 }: { s?: number }) => <PxIcon src={yarnPx} w={12} h={10} s={Math.max(1, Math.round(s / 9))} />;
export const StarIcon = () => <PxIcon src={starPx} w={7} h={7} s={2} />;

export function RoundBtn({ label, onClick, children, big }: { label: string; onClick: () => void; children: ReactNode; big?: boolean }) {
  return (
    <button aria-label={label} onClick={onClick} className={`game-btn ${big ? "h-16 w-16" : "h-11 w-11"} shrink-0 active:translate-y-[1px]`}>
      {children}
    </button>
  );
}

export function Hud({ g, onBack, children, strip = true }: { g: GameState; onBack: () => void; children?: ReactNode; strip?: boolean }) {
  const need = xpToNext(g.level);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 font-game">
      <div className={`${strip ? "hud-strip" : ""} pointer-events-none px-3 pb-2 pt-[max(env(safe-area-inset-top),10px)] [&>*]:pointer-events-auto`}>
      <div className="flex items-center gap-2">
        <button aria-label="Back to Coco's Corner" onClick={onBack} className="game-btn h-10 w-10 text-xl leading-none">‹</button>
        <div className="flex flex-1 items-center lg:max-w-md">
          <span className="relative z-10 grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-black bg-sun text-xl font-bold" style={{ boxShadow: "1px 2px 0 #000" }}><span className="absolute -top-2 -left-1"><StarIcon /></span>{g.level}</span>
          <div className="relative -ml-2 h-6 flex-1 overflow-hidden rounded-r-md border-[2.5px] border-black bg-white" aria-label={`XP ${g.xp} of ${need}`}>
            <motion.div className="h-full bg-sun" animate={{ width: `${(g.xp / need) * 100}%` }} />
            <span className="absolute inset-0 grid place-items-center text-sm font-bold">{g.xp}/{need}</span>
          </div>
        </div>
        <span className="flex h-8 items-center gap-1 rounded-full border-[2.5px] border-black bg-white px-2 text-lg font-bold lg:ml-auto"><FishIcon />{g.fish}</span>
        <span className="flex h-8 items-center gap-1 rounded-full border-[2.5px] border-black bg-white px-2 text-lg font-bold"><YarnIcon />{g.yarn}</span>
      </div>
      {children}
      </div>
    </div>
  );
}

export function GameModal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="absolute inset-0 z-40 grid place-items-center bg-black/35 p-3 font-game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 10 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative flex max-h-[88%] w-full max-w-[370px] flex-col overflow-hidden rounded-lg border-[3px] border-black bg-[#efefef]" style={{ boxShadow: "3px 4px 0 #000" }}>
            <div className="border-b-[3px] border-black bg-[#8a8a8a] py-2 text-center text-2xl font-bold text-white" style={{ textShadow: "1px 1px 0 #000" }}>{title}</div>
            <button aria-label="Close" onClick={onClose} className="game-btn absolute -right-0 -top-0 m-1 h-9 w-9 text-xl font-bold">✕</button>
            <div className="overflow-y-auto p-3">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function YellowBtn({ children, onClick, disabled, className = "" }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`min-h-[44px] rounded-md border-[2.5px] border-black px-3 text-lg font-bold leading-tight active:translate-y-[1px] disabled:opacity-40 ${disabled ? "bg-[#ddd]" : "bg-sun"} ${className}`}
      style={{ boxShadow: "1px 2px 0 #000" }}>{children}</button>
  );
}

export function Toast({ text }: { text: string }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div key={text} initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-x-0 top-28 z-30 mx-auto w-fit max-w-[90%] rounded-md border-[2.5px] border-black bg-white px-3 py-1 text-center font-game text-xl" style={{ boxShadow: "2px 2px 0 #000" }}>
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
