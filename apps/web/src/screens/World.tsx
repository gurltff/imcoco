import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { birthdayInfo } from "@coco/core";
import { BEHAVIOURS, FOODS, SHOP, chonkTitle, updateGame, useGame, type GameState } from "../game/state";
import { WorldEngine } from "../game/engine";
import { CAT_CURSOR, FishIcon, GameModal, Hud, PixelCoco, RoundBtn, Toast, YarnIcon, YellowBtn } from "../game/ui";
import { coco } from "../lib/audio";
import { readLocal, useSettings, writeLocal } from "../lib/store";
import type { Screen } from "../lib/nav";

const I = { fill: "none", stroke: "#111", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function World({ onNav }: { onNav: (s: Screen) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<WorldEngine>();
  const [g] = useGame();
  const gRef = useRef(g); gRef.current = g;
  const [settings, setSettings] = useSettings();
  const [modal, setModal] = useState<null | "info" | "shop" | "feed" | "settings">(null);
  const [standoff, setStandoff] = useState(false);
  const [tough, setTough] = useState(0);
  const [toast, setToast] = useState("");
  const [cuddling, setCuddling] = useState(false);
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast((x) => (x === t ? "" : x)), 2200); };
  const reward = (p: Partial<Record<"xp" | "fish" | "yarn" | "chonk", number>>) => {
    if (updateGame((s) => ({ xp: s.xp + (p.xp ?? 0), fish: s.fish + (p.fish ?? 0), yarn: s.yarn + (p.yarn ?? 0), chonk: s.chonk + (p.chonk ?? 0) })))
      setTimeout(() => flash(`Level up! Coco is now level ${readLocal<GameState>("game", g).level} ✨`), 300);
  };

  useEffect(() => {
    const e = new WorldEngine(canvas.current!, {
      onTapCoco: (sleeping) => { sleeping ? coco.meow("mrrp") : coco.meow("tap"); reward({ xp: 2 }); },
      onTapMailbox: () => { writeLocal("memTab", "letters"); onNav("memories"); },
      onAttention: (on) => { if (on) coco.meow("attention"); },
      onStandoff: (on) => { setStandoff(on); setTough(0); },
      onFed: (food) => {
        const f = FOODS.find((x) => x.id === food)!;
        updateGame((s) => ({ snacks: { ...s.snacks, [food]: (s.snacks[food] ?? 0) + 1 } }));
        writeLocal("lastFedAt", Date.now());
        reward({ xp: f.xp, chonk: f.chonk });
        flash(`Chonk level +${f.chonk} · ${chonkTitle(readLocal<GameState>("game", g).chonk)}`);
      },
      onNightChange: (night) => { if (night && coco.unlocked) coco.startPurr(0.05, 4); else coco.stopPurr(2); },
      onMunch: () => coco.munch(),
      getOwned: () => gRef.current.owned,
      getChonk: () => gRef.current.chonk,
      getBehaviours: () => gRef.current.behaviours,
    });
    engine.current = e;
    return () => { e.destroy(); coco.stopPurr(1); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Standoff mini game: 5 seconds to look tough.
  useEffect(() => {
    if (!standoff) return;
    coco.meow("attention");
    const t = setTimeout(() => {
      setTough((v) => {
        if (v < 100) { engine.current?.resolveStandoff(false); reward({ fish: 2, xp: 3 }); flash("The stray got bored. A draw! +2 🐟"); }
        return v;
      });
    }, 5000);
    return () => clearTimeout(t);
  }, [standoff]); // eslint-disable-line react-hooks/exhaustive-deps

  const grr = () => {
    engine.current?.grr();
    setTough((v) => {
      const n = Math.min(100, v + 9);
      if (n >= 100 && v < 100) {
        engine.current?.resolveStandoff(true);
        coco.meow("tap");
        updateGame((s) => ({ wins: s.wins + 1 }));
        reward({ fish: 12, xp: 15 });
        flash("Coco won the stare-off! +12 🐟");
      }
      return n;
    });
  };

  const feed = (id: string) => {
    const f = FOODS.find((x) => x.id === id)!;
    const s = readLocal<GameState>("game", g);
    if (id === "kibble" && Date.now() - s.lastKibble < 30_000) { flash("Kibble refills in a moment…"); return; }
    if (s[f.cur] < f.cost) { flash(`Need ${f.cost} ${f.cur === "fish" ? "🐟" : "🧶"}`); return; }
    updateGame((x) => ({ [f.cur]: x[f.cur] - f.cost, ...(id === "kibble" ? { lastKibble: Date.now() } : {}) }));
    setModal(null);
    coco.meow("food");
    engine.current?.feed(id);
  };

  const buy = (id: string) => {
    const it = SHOP.find((x) => x.id === id)!;
    const s = readLocal<GameState>("game", g);
    if (s[it.cur] < it.cost) { flash(`Need ${it.cost} ${it.cur === "fish" ? "🐟" : "🧶"}`); return; }
    updateGame((x) => ({ [it.cur]: x[it.cur] - it.cost, owned: [...x.owned, id], xp: x.xp + 10 }));
    flash(`${it.name} placed in the yard!`);
  };

  const learn = () => {
    const b = BEHAVIOURS[g.behaviours];
    if (!b) return;
    if (g.level < b.req) { flash(`Reach level ${b.req} first`); return; }
    if (g.yarn < b.cost) { flash(`Need ${b.cost} 🧶`); return; }
    updateGame((s) => ({ yarn: s.yarn - b.cost, behaviours: s.behaviours + 1, xp: s.xp + 20 }));
    coco.meow("tap");
    flash(`Coco learned: ${b.name}!`);
  };

  const cuddle = (on: boolean) => {
    if (on === cuddling) return;
    setCuddling(on);
    engine.current?.cuddle(on);
    if (on) { coco.startPurr(1, 0.6); reward({ xp: 3 }); } else coco.stopPurr(1.5);
  };

  return (
    <div className="relative h-full overflow-hidden bg-[#a8cdc6] font-game text-black">
      <canvas ref={canvas} style={{ cursor: CAT_CURSOR }} className="absolute inset-0 h-full w-full touch-manipulation" aria-label="Coco's little house and yard. Tap Coco to pet him." />

      <Hud g={g} onBack={() => onNav("home")}>
        <div className="pointer-events-auto mt-2 flex items-start justify-between">
          <div className="rounded-md border-2 border-black bg-white px-2 py-0.5 text-base">
            Chonk: <b>{chonkTitle(g.chonk)}</b> <span className="text-black/50">({g.chonk}/100)</span>
          </div>
          <div className="flex gap-1.5">
            <RoundBtn label="Coco's info" onClick={() => setModal("info")}><svg viewBox="0 0 24 24" className="h-5 w-5" {...I}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></svg></RoundBtn>
            <RoundBtn label="Feed Coco" onClick={() => setModal("feed")}><svg viewBox="0 0 24 24" className="h-5 w-5" {...I}><path d="M3 12h18a9 5 0 0 1-18 0z" /><path d="M7 12q5-5 10 0" /></svg></RoundBtn>
            <RoundBtn label="Play" onClick={() => onNav("play")}><YarnIcon s={20} /></RoundBtn>
            <RoundBtn label="Mailbox" onClick={() => { writeLocal("memTab", "letters"); onNav("memories"); }}><svg viewBox="0 0 24 24" className="h-5 w-5" {...I}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 7l9 6 9-6" /></svg></RoundBtn>
          </div>
        </div>
      </Hud>

      <Toast text={toast} />

      {/* Bottom corners: paw (settings) + house (village), with the yellow Cuddle action */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="flex flex-col items-center">
          <RoundBtn big label="Settings" onClick={() => setModal("settings")}>
            <svg viewBox="0 0 28 28" className="h-8 w-8" fill="none" stroke="#111" strokeWidth="1.8"><ellipse cx="14" cy="18" rx="6.5" ry="5.5" /><circle cx="6.5" cy="11.5" r="2.7" /><circle cx="11" cy="7" r="2.7" /><circle cx="17" cy="7" r="2.7" /><circle cx="21.5" cy="11.5" r="2.7" /></svg>
          </RoundBtn>
          <span className="text-sm">settings</span>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button onPointerDown={() => cuddle(true)} onPointerUp={() => cuddle(false)} onPointerLeave={() => cuddle(false)} onContextMenu={(e) => e.preventDefault()}
            className={`h-14 w-14 touch-none select-none rounded-full border-[2.5px] border-black text-lg font-bold ${cuddling ? "bg-white" : "bg-sun"}`} style={{ boxShadow: "1px 2px 0 #000" }}>
            {cuddling ? "prr♥" : "Cuddle"}
          </button>
          <div className="flex flex-col items-center">
            <RoundBtn big label="Village shop" onClick={() => setModal("shop")}>
              <svg viewBox="0 0 28 28" className="h-8 w-8" {...I} strokeWidth={1.8}><path d="M4 13 L14 5 L24 13 V24 H4Z" /><path d="M11 24v-6h6v6" /><circle cx="14" cy="12" r="1.8" /></svg>
            </RoundBtn>
            <span className="text-sm">village</span>
          </div>
        </div>
      </div>

      {/* Beef with cats: tap to look tough */}
      <AnimatePresence>
        {standoff && tough < 100 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="absolute inset-x-3 bottom-28 z-20 rounded-lg border-[3px] border-black bg-white p-3 text-center" style={{ boxShadow: "3px 3px 0 #000" }}>
            <p className="text-xl font-bold">A stray cat is in Coco's yard!!</p>
            <p className="text-base text-black/60">Tap fast to help him look tough (no one gets hurt)</p>
            <div className="my-2 h-4 overflow-hidden rounded border-2 border-black"><motion.div className="h-full bg-sun" animate={{ width: `${tough}%` }} /></div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={grr} className="h-16 w-full rounded-md border-[3px] border-black bg-sun text-3xl font-bold" style={{ boxShadow: "2px 3px 0 #000" }}>GRRR! 😾</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <InfoModal open={modal === "info"} onClose={() => setModal(null)} g={g} onLearn={learn} />

      <GameModal open={modal === "feed"} title="Snack time" onClose={() => setModal(null)}>
        <p className="mb-2 text-lg">Food is Coco's favourite thing in the world. He gets rounder and cuter, never unhealthy.</p>
        <div className="grid grid-cols-2 gap-2">
          {FOODS.map((f) => (
            <button key={f.id} onClick={() => feed(f.id)} className="rounded-md border-[2.5px] border-black bg-white p-2 text-left active:translate-y-[1px]" style={{ boxShadow: "1px 2px 0 #000" }}>
              <p className="text-xl font-bold leading-none">{f.name}</p>
              <p className="text-sm text-black/60">{f.note}</p>
              <p className="mt-1 flex items-center gap-1 text-lg">{f.cost === 0 ? "free" : <>{f.cost} {f.cur === "fish" ? <FishIcon /> : <YarnIcon />}</>} · +{f.chonk} chonk</p>
            </button>
          ))}
        </div>
      </GameModal>

      <GameModal open={modal === "shop"} title="Village shop" onClose={() => setModal(null)}>
        <p className="mb-2 text-lg">Earn 🐟 and 🧶 by playing, petting and winning stare-offs.</p>
        <div className="grid grid-cols-2 gap-2">
          {SHOP.map((it) => {
            const own = g.owned.includes(it.id);
            return (
              <div key={it.id} className="flex flex-col rounded-md border-[2.5px] border-black bg-white p-2" style={{ boxShadow: "1px 2px 0 #000" }}>
                <p className="text-xl font-bold leading-none">{it.name}</p>
                <p className="flex-1 text-sm text-black/60">{it.blurb}</p>
                {own ? <p className="mt-1 text-lg">✓ placed</p> : (
                  <YellowBtn className="mt-1 flex items-center justify-center gap-1" onClick={() => buy(it.id)} disabled={g[it.cur] < it.cost}>
                    {it.cost} {it.cur === "fish" ? <FishIcon /> : <YarnIcon />}
                  </YellowBtn>
                )}
              </div>
            );
          })}
        </div>
      </GameModal>

      <GameModal open={modal === "settings"} title="Settings" onClose={() => setModal(null)}>
        <label className="flex items-center justify-between py-2 text-xl">Mute
          <input type="checkbox" className="h-6 w-6 accent-black" checked={settings.muted} onChange={(e) => { coco.setMuted(e.target.checked); setSettings({ ...settings, muted: e.target.checked }); }} />
        </label>
        <label className="block py-2 text-xl">Volume
          <input type="range" min={0} max={1} step={0.05} value={settings.volume} className="mt-1 w-full accent-black" onChange={(e) => { coco.setVolume(+e.target.value); setSettings({ ...settings, volume: +e.target.value }); }} />
        </label>
        <p className="py-2 text-base text-black/60">Day and night follow your real clock. At night Coco sleeps and purrs softly.</p>
        <YellowBtn className="w-full" onClick={() => onNav("home")}>Back to Coco's Corner</YellowBtn>
      </GameModal>
    </div>
  );
}

function InfoModal({ open, onClose, g, onLearn }: { open: boolean; onClose: () => void; g: GameState; onLearn: () => void }) {
  const [tab, setTab] = useState<"info" | "beh" | "snacks">("info");
  const b = birthdayInfo();
  return (
    <GameModal open={open} title="Coco" onClose={onClose}>
      <div className="flex gap-3">
        <div className="flex w-32 shrink-0 flex-col items-center rounded border-2 border-black bg-white p-1">
          <span className="text-base">Normal</span>
          <PixelCoco scale={2} />
          <span className="text-lg">Level {g.level}</span>
        </div>
        <div className="text-lg leading-snug">
          <p>Loves food more than anything. Sits right next to you when you're sad. Has beef with every other cat, for no reason.</p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 rounded border-2 border-black/20 bg-white/60 p-2 text-base">
        <span>Lives at: <b>Coco's Home</b></span><span>Age: <b>8 months</b></span>
        <span>Coat: <b>jet black</b></span><span>Eyes: <b>bright green</b></span>
        <span className="col-span-2">Birthday: <b>16 Nov</b> {b.isToday ? "(today! 🎂)" : `(turning ${b.turning} in ${b.daysLeft} days)`}</span>
      </div>

      <div className="mt-3 flex gap-1" role="tablist">
        {([["info", "Info"], ["beh", "Behaviours"], ["snacks", "Snacks"]] as const).map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`flex-1 rounded-t-md border-2 border-b-0 border-black py-1 text-lg ${tab === id ? "bg-white font-bold" : "bg-[#ccc]"}`}>{l}</button>
        ))}
      </div>
      <div className="rounded-b-md border-2 border-black bg-white p-2">
        {tab === "info" && (
          <div className="space-y-2 text-lg">
            <p>Personality</p>
            <div className="flex flex-wrap gap-1">{["playful", "sweet", "foodie", "cat-hater"].map((t) => <span key={t} className="rounded-full border-2 border-black px-2 text-base">{t}</span>)}</div>
            <p>Chonk level: <b>{chonkTitle(g.chonk)}</b></p>
            <div className="h-4 overflow-hidden rounded border-2 border-black"><div className="h-full bg-sun" style={{ width: `${g.chonk}%` }} /></div>
            <p className="text-base text-black/60">Stare-offs won: {g.wins}</p>
          </div>
        )}
        {tab === "beh" && (
          <div className="space-y-2">
            <p className="text-base text-black/60">Use 🧶 yarn to teach Coco new behaviours.</p>
            {BEHAVIOURS.map((bh, i) => {
              const unlocked = i < g.behaviours;
              const next = i === g.behaviours;
              return (
                <div key={bh.name} className="flex items-center gap-2 rounded border-2 border-black bg-[#f4f4f4] p-2">
                  <span className="rounded border-2 border-black bg-white px-1.5 text-base">Stage {i + 1}</span>
                  <div className="flex-1 text-lg leading-tight">
                    {unlocked || next ? bh.name : "???"}
                    {next && <p className="text-sm text-black/60">Needs level {bh.req}</p>}
                    {unlocked && <p className="text-sm text-black/60">{bh.desc}</p>}
                  </div>
                  {unlocked ? <span className="rounded border-2 border-black bg-white px-2 text-base">✓ learned</span>
                    : next ? <YellowBtn onClick={onLearn} className="!text-base">Learn<br />{bh.cost} 🧶</YellowBtn>
                    : <span className="rounded border-2 border-black/40 bg-[#ddd] px-2 text-base text-black/60">🔒 locked</span>}
                </div>
              );
            })}
          </div>
        )}
        {tab === "snacks" && (
          <ul className="space-y-1 text-lg">
            {FOODS.map((f) => <li key={f.id} className="flex justify-between border-b border-dashed border-black/20 py-1"><span>{f.name}</span><span>eaten ×{g.snacks[f.id] ?? 0}</span></li>)}
          </ul>
        )}
      </div>
    </GameModal>
  );
}
