import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { xpToNext, type GameState } from "./state";

export const FishIcon = ({ s = 18 }: { s?: number }) => (
  <svg viewBox="0 0 40 24" width={s} height={s * 0.6} aria-hidden><path d="M4 12 Q14 1 28 12 Q14 23 4 12Z" fill="#FFE95C" stroke="#111" strokeWidth="2.4" strokeLinejoin="round" /><path d="M28 12 l8 -7 v14z" fill="#FFE95C" stroke="#111" strokeWidth="2.4" strokeLinejoin="round" /><circle cx="11" cy="11" r="1.8" fill="#111" /></svg>
);
export const YarnIcon = ({ s = 18 }: { s?: number }) => (
  <svg viewBox="0 0 32 32" width={s} height={s} aria-hidden><circle cx="15" cy="15" r="11" fill="#fff" stroke="#111" strokeWidth="2.4" /><path d="M7 10 q8 6 16 -2 M5 16 q10 6 20 -4 M9 24 q8 -4 14 -12" fill="none" stroke="#111" strokeWidth="1.6" /><path d="M25 22 q6 4 2 8" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" /></svg>
);

export function RoundBtn({ label, onClick, children, big }: { label: string; onClick: () => void; children: ReactNode; big?: boolean }) {
  return (
    <button aria-label={label} onClick={onClick} className={`game-btn ${big ? "h-16 w-16" : "h-11 w-11"} shrink-0 active:translate-y-[1px]`}>
      {children}
    </button>
  );
}

export function Hud({ g, onBack, children }: { g: GameState; onBack: () => void; children?: ReactNode }) {
  const need = xpToNext(g.level);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pt-[max(env(safe-area-inset-top),10px)] font-game">
      <div className="pointer-events-auto flex items-center gap-2">
        <button aria-label="Back to Coco's Corner" onClick={onBack} className="game-btn h-10 w-10 text-xl leading-none">‹</button>
        <div className="flex flex-1 items-center lg:max-w-md">
          <span className="z-10 grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-black bg-white text-xl font-bold" style={{ boxShadow: "1px 2px 0 #000" }}>{g.level}</span>
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
