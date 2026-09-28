import type { CSSProperties } from "react";

const S = { stroke: "#2B3A55", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const doodles = {
  croissant: (
    <svg viewBox="0 0 40 28"><path d="M4 20 Q6 6 20 4 Q34 6 36 20 Q30 16 26 22 Q20 14 14 22 Q10 16 4 20Z" fill="#F2C27B" {...S} /><path d="M14 8 l3 10 M24 7 l-2 11" {...S} fill="none" /></svg>
  ),
  cherry: (
    <svg viewBox="0 0 32 32"><path d="M12 22 Q14 10 22 4 Q20 12 22 20" fill="none" {...S} /><circle cx="11" cy="23" r="6" fill="#C8323A" {...S} /><circle cx="22" cy="22" r="6" fill="#C8323A" {...S} /><path d="M20 4 q6 -2 8 2 q-5 2 -8 -2z" fill="#8BC48A" {...S} /></svg>
  ),
  cake: (
    <svg viewBox="0 0 36 36"><rect x="6" y="16" width="24" height="14" rx="3" fill="#FBF3DC" {...S} /><path d="M6 20 q4 4 8 0 q4 4 8 0 q4 4 8 0" fill="none" stroke="#C8323A" strokeWidth="2.2" strokeLinecap="round" /><path d="M18 16 v-6" {...S} /><path d="M18 10 q-3 -4 0 -7 q3 3 0 7z" fill="#FFE95C" {...S} /></svg>
  ),
  apple: (
    <svg viewBox="0 0 32 32"><path d="M16 10 C6 6 3 18 8 25 C11 29 14 28 16 27 C18 28 21 29 24 25 C29 18 26 6 16 10Z" fill="#FBF3DC" {...S} /><path d="M16 10 q0 -5 3 -7" fill="none" {...S} /></svg>
  ),
  sparkle: (
    <svg viewBox="0 0 24 24"><path d="M12 2 Q13 11 22 12 Q13 13 12 22 Q11 13 2 12 Q11 11 12 2Z" fill="none" {...S} /></svg>
  ),
  cup: (
    <svg viewBox="0 0 36 30"><path d="M5 8 h22 v10 a9 9 0 0 1 -9 9 h-4 a9 9 0 0 1 -9 -9z" fill="#fff" {...S} /><path d="M27 11 q6 0 6 5 t-7 5" fill="none" {...S} /><path d="M12 2 q2 2 0 4 M18 2 q2 2 0 4" fill="none" {...S} /></svg>
  ),
  fish: (
    <svg viewBox="0 0 40 24"><path d="M4 12 Q14 1 28 12 Q14 23 4 12Z" fill="#A9C8E3" {...S} /><path d="M28 12 l8 -7 v14z" fill="#A9C8E3" {...S} /><circle cx="11" cy="11" r="1.6" fill="#2B3A55" /></svg>
  ),
  yarn: (
    <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="#C8323A" {...S} /><path d="M8 10 q8 6 16 -2 M6 17 q10 6 20 -4 M10 25 q8 -4 14 -12" fill="none" stroke="#fff" strokeWidth="1.6" /><path d="M26 22 q6 4 2 8" fill="none" {...S} /></svg>
  ),
  heart: (
    <svg viewBox="0 0 24 22"><path d="M12 20 C2 13 2 5 7 3 C10 2 12 5 12 6 C12 5 14 2 17 3 C22 5 22 13 12 20Z" fill="#C8323A" {...S} /></svg>
  ),
  paw: (
    <svg viewBox="0 0 28 28"><ellipse cx="14" cy="18" rx="7" ry="6" fill="currentColor" /><circle cx="6" cy="11" r="3" fill="currentColor" /><circle cx="11" cy="6" r="3" fill="currentColor" /><circle cx="17" cy="6" r="3" fill="currentColor" /><circle cx="22" cy="11" r="3" fill="currentColor" /></svg>
  ),
};

export type DoodleName = keyof typeof doodles;

export function Doodle({ name, size = 28, className = "", style }: { name: DoodleName; size?: number; className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={`inline-block ${className}`} style={{ width: size, height: size, ...style }}>{doodles[name]}</span>;
}

/** Absolutely positioned doodles scattered around a container (like the reference). */
export function DoodleScatter({ items }: { items: { name: DoodleName; x: string; y: string; size?: number; r?: number }[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((d, i) => (
        <Doodle key={i} name={d.name} size={d.size ?? 24} className="floaty absolute opacity-80"
          style={{ left: d.x, top: d.y, ["--r" as string]: `${d.r ?? 0}deg`, animationDelay: `${i * 0.7}s` }} />
      ))}
    </div>
  );
}
