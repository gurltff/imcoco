import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { coco } from "../lib/audio";
import { useLocal, useSettings } from "../lib/store";
import { Coco } from "./Coco";

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 py-2">
      <span>
        <span className="block font-hand text-xl leading-tight">{label}</span>
        {hint && <span className="block text-xs text-navy/60">{hint}</span>}
      </span>
      <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full border-2 border-navy/80 transition-colors ${checked ? "bg-cherry" : "bg-white"}`}>
        <motion.span layout className={`absolute top-0.5 h-6 w-6 rounded-full border-2 border-navy/80 bg-cream ${checked ? "right-0.5" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [s, setS] = useSettings();
  const patch = (p: Partial<typeof s>) => setS({ ...s, ...p });
  const [key, setKey] = useLocal<string>("anthropicKey", "");
  const [draft, setDraft] = useState(key);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bg" className="absolute inset-0 z-40 bg-navy/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div key="sheet" role="dialog" aria-label="Settings"
            className="paper absolute inset-x-0 bottom-0 z-50 max-h-[85%] overflow-y-auto rounded-t-[2rem] border-t-[2.5px] border-navy/80 px-5 pb-8 pt-3 lg:inset-x-auto lg:right-6 lg:w-[440px] lg:rounded-[2rem] lg:border-[2.5px] lg:bottom-6"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-navy/30" />
            <div className="flex items-center gap-3">
              <Coco pose="purr" size={64} />
              <div>
                <h2 className="font-hand text-3xl text-cherry">Settings</h2>
                <p className="smallcaps">Everything stays on this device</p>
              </div>
            </div>
            <div className="mt-3 divide-y-2 divide-dashed divide-navy/15">
              <Toggle label="Mute Coco" checked={s.muted} onChange={(v) => { coco.setMuted(v); patch({ muted: v }); }} />
              <div className="py-3">
                <div className="flex items-center justify-between font-hand text-xl"><span>Volume</span><span className="text-base text-navy/60">{Math.round(s.volume * 100)}%</span></div>
                <input aria-label="Volume" type="range" min={0} max={1} step={0.05} value={s.volume} className="mt-2 h-8 w-full"
                  onChange={(e) => { const v = +e.target.value; coco.setVolume(v); patch({ volume: v }); }}
                  onPointerUp={() => coco.meow("tap")} />
              </div>
              <Toggle label="Captions" hint="Show text for Coco's sounds" checked={s.captions} onChange={(v) => patch({ captions: v })} />
              <Toggle label="Reduce motion" hint="Calmer, fewer animations" checked={s.reducedMotion} onChange={(v) => patch({ reducedMotion: v })} />
              <Toggle label="Coco notices when I'm sad" hint="Opt-in. Checked only on this device, never sent anywhere." checked={s.comfortDetection} onChange={(v) => patch({ comfortDetection: v })} />
            </div>
            <div className="mt-4 rounded-2xl border-2 border-dashed border-navy/30 p-3">
              <p className="font-hand text-xl">Smart Coco (AI chat)</p>
              <p className="text-xs text-navy/70">Paste a Claude API key from console.anthropic.com. It's saved only in this browser. In Smart mode your chat messages go to Anthropic to write Coco's replies.</p>
              <div className="mt-2 flex gap-2">
                <input type="password" autoComplete="off" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="sk-ant-…" aria-label="Claude API key"
                  className="min-h-[44px] min-w-0 flex-1 rounded-xl border-2 border-navy/60 bg-white px-3 text-sm" />
                <button className="pill bg-baby px-3 text-base" onClick={() => setKey(draft.trim())}>{key && key === draft.trim() ? "Saved ✓" : "Save"}</button>
              </div>
              {key && <button className="mt-1 text-xs text-cherry underline" onClick={() => { setKey(""); setDraft(""); }}>Remove key</button>}
            </div>
            <div className="mt-4 rounded-2xl border-2 border-dashed border-navy/30 p-3">
              <p className="font-hand text-xl">Coco on your computer</p>
              <p className="text-xs text-navy/70">Chrome: download, unzip, open chrome://extensions, turn on Developer mode, then "Load unpacked" and pick the folder.</p>
              {import.meta.env.MODE === "artifact"
                ? <p className="mt-2 rounded-xl bg-white/70 p-2 text-xs">Get the folder <b>apps/extension</b> from the imcoco GitHub repo (run <code>npm run build:extension</code>), or ask for the zip.</p>
                : <a className="pill mt-2 w-full bg-white" href="./coco-extension.zip" download>Download Coco for Chrome</a>}
            </div>
            <button className="pill mt-4 w-full bg-baby" onClick={onClose}>Done</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
