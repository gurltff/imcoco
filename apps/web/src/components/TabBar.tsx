import { motion } from "framer-motion";
import type { Screen } from "../lib/nav";

const I = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const icons: Record<string, JSX.Element> = {
  home: <svg viewBox="0 0 24 24" {...I}><path d="M4 11 L12 4 L20 11 V20 H4Z" /><path d="M10 20 v-5 h4 v5" /></svg>,
  comfort: <svg viewBox="0 0 24 24" {...I}><path d="M12 20 C3 14 3 7 8 5 C10 4.5 12 6.5 12 7.5 C12 6.5 14 4.5 16 5 C21 7 21 14 12 20Z" /></svg>,
  chat: <svg viewBox="0 0 24 24" {...I}><path d="M4 5h16v11H9l-5 4z" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></svg>,
  world: <svg viewBox="0 0 24 24" {...I}><path d="M3 12 L12 7 L21 12 L12 17Z" /><path d="M3 12 v4 l9 5 l9 -5 v-4" /><path d="M9 11 v-4 l3 -2 l3 2 v4" /></svg>,
  memories: <svg viewBox="0 0 24 24" {...I}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 16 l5 -5 l4 4 l2 -2 l5 5" /><circle cx="15.5" cy="8.5" r="1.5" /></svg>,
  settings: <svg viewBox="0 0 28 28" fill="currentColor"><ellipse cx="14" cy="18" rx="6.5" ry="5.5" /><circle cx="6.5" cy="11.5" r="2.7" /><circle cx="11" cy="7" r="2.7" /><circle cx="17" cy="7" r="2.7" /><circle cx="21.5" cy="11.5" r="2.7" /></svg>,
};

const TABS: { id: Screen | "settings"; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "comfort", label: "Comfort" },
  { id: "chat", label: "Chat" },
  { id: "world", label: "World" },
  { id: "memories", label: "Memories" },
  { id: "settings", label: "Settings" },
];

export function TabBar({ current, onNav, onSettings }: { current: Screen; onNav: (s: Screen) => void; onSettings: () => void }) {
  return (
    <nav className="relative z-30 mx-3 mb-3 flex items-stretch justify-around rounded-[1.6rem] border-[2.5px] border-navy/80 bg-baby px-1 py-1 shadow-sticker lg:m-4 lg:h-[calc(100dvh-2rem)] lg:w-60 lg:flex-col lg:justify-start lg:gap-1 lg:px-3 lg:py-5">
      <div className="hidden px-2 pb-4 lg:block">
        <p className="font-hand text-3xl leading-none text-cherry">coco's corner</p>
        <p className="smallcaps mt-1">always around you</p>
      </div>
      {TABS.map((t) => {
        const active = t.id === current || (t.id === "world" && current === "play");
        return (
          <button key={t.id} onClick={() => (t.id === "settings" ? onSettings() : onNav(t.id))}
            aria-current={active ? "page" : undefined}
            className="relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-navy lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:hover:bg-cream/50">
            {active && <motion.span layoutId="tab-pill" className="absolute inset-0.5 rounded-2xl bg-cream" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
            <span className={`relative h-6 w-6 ${active ? "text-cherry" : ""}`}>{icons[t.id]}</span>
            <span className="relative text-[9px] font-extrabold uppercase tracking-wide lg:text-sm lg:normal-case lg:tracking-normal">{t.label}</span>
          </button>
        );
      })}
      <div className="mt-auto hidden rounded-2xl bg-cream/70 p-3 text-center font-hand text-lg leading-tight lg:block">Coco is sitting right next to you. 💚</div>
    </nav>
  );
}
