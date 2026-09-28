import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { birthdayInfo, ordinal } from "@coco/core";
import { Coco } from "../components/Coco";
import { Doodle, DoodleScatter } from "../components/Doodles";
import { coco } from "../lib/audio";
import { deleteMemory, listMemories, putMemory, type Memory } from "../lib/db";
import { useLocal } from "../lib/store";

type Tab = "album" | "letters" | "birthday";

export function Memories() {
  const [tab, setTab] = useLocal<Tab>("memTab", "album");
  return (
    <div className="relative min-h-full px-4 pb-8 pt-1">
      <DoodleScatter items={[{ name: "sparkle", x: "86%", y: "14px", size: 16 }, { name: "cherry", x: "4%", y: "20px", size: 22 }]} />
      <p className="smallcaps text-center">Coco's always around you</p>
      <h1 className="text-center font-hand text-[40px] leading-none text-cherry">Memories</h1>
      <div className="relative mx-auto mt-3 flex max-w-[340px] rounded-full border-[2.5px] border-navy/80 bg-baby p-1 shadow-sticker" role="tablist">
        {([["album", "Photo wall"], ["letters", "Letters"], ["birthday", "Birthday"]] as const).map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className="relative min-h-[44px] flex-1 rounded-full font-hand text-lg">
            {tab === id && <motion.span layoutId="mem-pill" className="absolute inset-0 rounded-full bg-cream" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
            <span className={`relative ${tab === id ? "text-cherry" : ""}`}>{l}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          {tab === "album" && <Album />}
          {tab === "letters" && <Letters />}
          {tab === "birthday" && <Birthday />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------------- Photo wall ----------------
function Album() {
  const [items, setItems] = useState<Memory[]>([]);
  const [open, setOpen] = useState<Memory | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const urls = useMemo(() => new Map(items.map((m) => [m.id, URL.createObjectURL(m.blob)])), [items]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const refresh = () => listMemories().then(setItems).catch(() => setItems([]));
  useEffect(() => { refresh(); }, []);

  const add = async (files: FileList | null) => {
    if (!files) return;
    let i = 0;
    for (const f of Array.from(files)) {
      const type = f.type.startsWith("video") ? "video" : "image";
      await putMemory({ id: Date.now() + i++, blob: f, type, caption: "", at: Date.now(), tilt: Math.round((Math.random() - 0.5) * 8) });
    }
    refresh();
  };

  return (
    <div className="mt-4">
      <input ref={input} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <button className="pill w-full bg-cherry text-cream" onClick={() => input.current?.click()}>+ Add photos & videos of Coco</button>
      <p className="mt-1 text-center text-xs text-navy/60">Saved only on this device.</p>
      <div className="gingham mt-4 min-h-[300px] rounded-[1.4rem] border-[2.5px] border-navy/80 p-3 shadow-sticker">
        {items.length === 0 ? (
          <div className="grid min-h-[270px] place-items-center rounded-2xl bg-cream/90 p-4 text-center">
            <div><Coco pose="sit" size={110} /><p className="font-hand text-xl">The wall is waiting for Coco's best angles.</p></div>
          </div>
        ) : (
          <div className="columns-2 gap-3">
            {items.map((m, i) => (
              <motion.button key={m.id} layoutId={`mem-${m.id}`} onClick={() => setOpen(m)}
                initial={{ opacity: 0, y: 20, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: m.tilt }} transition={{ delay: i * 0.04 }}
                className="relative mb-4 block w-full break-inside-avoid bg-white p-2 pb-7 shadow-sticker">
                <span className="absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2 rotate-[-4deg] bg-baby/80" />
                {m.type === "image" ? <img src={urls.get(m.id)} alt={m.caption || "Coco"} className="w-full object-cover" loading="lazy" />
                  : <video src={urls.get(m.id)} className="w-full" muted playsInline preload="metadata" />}
                <span className="absolute inset-x-1 bottom-1 truncate font-hand text-base">{m.caption || (m.type === "video" ? "▶ video" : "")}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-navy/60 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.div layoutId={`mem-${open.id}`} className="w-full max-w-[360px] bg-white p-3 pb-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {open.type === "image" ? <img src={urls.get(open.id)} alt={open.caption} className="max-h-[55vh] w-full object-contain" />
                : <video src={urls.get(open.id)} className="max-h-[55vh] w-full" controls autoPlay playsInline />}
              <input defaultValue={open.caption} placeholder="Write a caption…" aria-label="Caption"
                onBlur={async (e) => { await putMemory({ ...open, caption: e.target.value }); refresh(); }}
                className="mt-2 w-full border-b-2 border-dashed border-navy/30 bg-transparent font-hand text-2xl focus:outline-none" />
              <div className="mt-3 flex justify-between">
                <button className="text-sm text-cherry underline" onClick={async () => { if (confirm("Remove this memory from the wall?")) { await deleteMemory(open.id); setOpen(null); refresh(); } }}>Remove</button>
                <button className="pill bg-baby" onClick={() => setOpen(null)}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------- Letters ----------------
interface Letter { id: number; at: number; text: string }

function Mailbox({ bump }: { bump: number }) {
  return (
    <motion.svg key={bump} viewBox="0 0 120 130" className="h-32 w-28" animate={bump ? { rotate: [0, -4, 4, 0] } : {}} transition={{ duration: 0.5 }}>
      <path d="M60 128 V78" stroke="#2B3A55" strokeWidth="6" strokeLinecap="round" />
      <path d="M18 80 V44 a24 24 0 0 1 24 -24 h36 a24 24 0 0 1 24 24 V80 Z" fill="#A9C8E3" stroke="#2B3A55" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M30 56 h48" stroke="#2B3A55" strokeWidth="3" strokeLinecap="round" />
      <path d="M102 50 V14 h16 v12 h-16" fill="#C8323A" stroke="#2B3A55" strokeWidth="3" strokeLinejoin="round" />
      <text x="58" y="75" textAnchor="middle" fontFamily="Patrick Hand" fontSize="13" fill="#2B3A55">COCO</text>
    </motion.svg>
  );
}

function Letters() {
  const [letters, setLetters] = useLocal<Letter[]>("letters", []);
  const [text, setText] = useState("");
  const [stage, setStage] = useState<"write" | "seal" | "fly">("write");
  const [reading, setReading] = useState<Letter | null>(null);
  const [bump, setBump] = useState(0);

  const seal = () => {
    if (!text.trim()) return;
    setStage("seal");
    setTimeout(() => setStage("fly"), 1100);
    setTimeout(() => {
      setLetters([{ id: Date.now(), at: Date.now(), text: text.trim() }, ...letters]);
      setText(""); setStage("write"); setBump((b) => b + 1); coco.meow("mrrp");
    }, 2000);
  };

  return (
    <div className="mt-4">
      <div className="relative min-h-[300px]">
        <AnimatePresence mode="wait">
          {stage === "write" ? (
            <motion.div key="paper" initial={{ opacity: 0, rotate: -2, y: 10 }} animate={{ opacity: 1, rotate: -1, y: 0 }} exit={{ opacity: 0 }}
              className="sticker relative bg-white p-4"
              style={{ backgroundImage: "repeating-linear-gradient(transparent 0 31px, rgba(169,200,227,.7) 31px 32px)", backgroundPosition: "0 14px" }}>
              <p className="font-hand text-2xl text-cherry">Dear Coco,</p>
              <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Letter to Coco" placeholder="Tell him about your day…"
                className="h-44 w-full resize-none bg-transparent font-hand text-[21px] leading-[32px] text-navy placeholder:text-navy/40 focus:outline-none" />
              <p className="text-right font-hand text-xl">— Raghav</p>
              <button className="pill mt-2 w-full bg-cherry text-cream" disabled={!text.trim()} onClick={seal}>Seal with a paw 🐾</button>
            </motion.div>
          ) : (
            <motion.div key="env" className="grid min-h-[300px] place-items-center">
              <motion.div className="relative h-32 w-52"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={stage === "seal" ? { scale: 1, opacity: 1 } : { x: 90, y: 180, scale: 0.2, rotate: 20, opacity: 0 }}
                transition={{ duration: stage === "seal" ? 0.4 : 0.8, ease: "easeIn" }}>
                <svg viewBox="0 0 200 120" className="h-full w-full"><rect x="4" y="4" width="192" height="112" rx="8" fill="#FBF3DC" stroke="#2B3A55" strokeWidth="3.5" /><path d="M6 8 L100 70 L194 8" fill="none" stroke="#2B3A55" strokeWidth="3" /></svg>
                <motion.div className="absolute left-1/2 top-[48%] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-navy/80 bg-cherry text-cream"
                  initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.45, type: "spring", stiffness: 500, damping: 14 }}>
                  <Doodle name="paw" size={28} />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-end gap-3">
        <Mailbox bump={bump} />
        <div className="flex-1 pb-2">
          <p className="font-hand text-2xl leading-none">Coco's mailbox</p>
          <p className="text-sm text-navy/60">{letters.length ? `${letters.length} sealed letter${letters.length > 1 ? "s" : ""}. Tap one to read.` : "Empty for now. He's waiting by it."}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {letters.map((l) => (
          <motion.button key={l.id} layout onClick={() => setReading(l)} whileTap={{ scale: 0.95 }} className="sticker relative flex h-24 flex-col items-center justify-center bg-cream">
            <svg viewBox="0 0 200 120" className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] opacity-40"><path d="M6 8 L100 70 L194 8" fill="none" stroke="#2B3A55" strokeWidth="4" /></svg>
            <span className="relative grid h-9 w-9 place-items-center rounded-full bg-cherry text-cream"><Doodle name="paw" size={18} /></span>
            <span className="relative mt-1 text-xs text-navy/70">{new Date(l.at).toLocaleDateString()}</span>
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {reading && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-navy/50 p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReading(null)}>
            <motion.div initial={{ scaleY: 0.1, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} exit={{ scaleY: 0.1, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="sticker w-full max-w-[360px] origin-top bg-white p-5" onClick={(e) => e.stopPropagation()}>
              <p className="smallcaps">{new Date(reading.at).toLocaleString()}</p>
              <p className="font-hand text-2xl text-cherry">Dear Coco,</p>
              <p className="mt-1 max-h-[50vh] overflow-y-auto whitespace-pre-wrap font-hand text-xl leading-snug">{reading.text}</p>
              <div className="mt-4 flex items-center justify-between">
                <button className="text-sm text-cherry underline" onClick={() => { if (confirm("Throw away this letter?")) { setLetters(letters.filter((x) => x.id !== reading.id)); setReading(null); } }}>Remove</button>
                <button className="pill bg-baby" onClick={() => setReading(null)}>Fold it back</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------- Birthday ----------------
function Birthday() {
  const b = birthdayInfo();
  const [lit, setLit] = useState(false);
  const [blown, setBlown] = useState(false);
  const [listening, setListening] = useState(false);
  const stopMic = useRef<() => void>();
  useEffect(() => () => stopMic.current?.(), []);

  const blow = () => {
    setBlown(true); setLit(false); stopMic.current?.(); setListening(false);
    coco.meow("food");
    setTimeout(() => coco.meow("tap"), 900);
  };

  // Optional: blow into the microphone. Audio is analysed locally for loudness only.
  const micBlow = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      const data = new Uint8Array(an.fftSize); let raf = 0; let loud = 0;
      setListening(true);
      const tick = () => {
        an.getByteTimeDomainData(data);
        let sum = 0; for (const v of data) sum += (v - 128) ** 2;
        loud = Math.sqrt(sum / data.length) > 22 ? loud + 1 : 0;
        if (loud > 6) { blow(); return; }
        raf = requestAnimationFrame(tick);
      };
      stopMic.current = () => { cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); ctx.close(); };
      tick();
    } catch { setListening(false); }
  };

  return (
    <div className="mt-4 text-center">
      <div className="rounded-[1.4rem] border-[2.5px] border-navy/80 bg-baby p-4 shadow-sticker">
        <p className="font-hand text-4xl leading-none text-white" style={{ WebkitTextStroke: "1px #2B3A55" }}>BIRTHDAY CAKE</p>
        <p className="smallcaps !text-navy/80">15 November · Coco's day</p>
        <p className="mt-2 font-hand text-2xl">
          {b.isToday ? `Happy ${ordinal(b.turning)} birthday, Coco! 🎂` : `Coco turns ${b.turning} in ${b.daysLeft} day${b.daysLeft === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="relative mx-auto mt-4 h-[300px] w-[300px]">
        <div className="absolute left-1/2 top-2 -translate-x-1/2"><Coco pose={blown ? "eat" : "sit"} size={130} /></div>
        {/* party hat */}
        <svg viewBox="0 0 40 50" className="absolute left-[53%] top-0 h-12 w-10 rotate-12"><path d="M4 46 L20 4 L36 46Z" fill="#C8323A" stroke="#2B3A55" strokeWidth="2.5" strokeLinejoin="round" /><path d="M12 30 l6 4 M22 20 l6 4 M16 42 l8 -2" stroke="#FBF3DC" strokeWidth="2.5" strokeLinecap="round" /><circle cx="20" cy="4" r="4" fill="#FFE95C" stroke="#2B3A55" strokeWidth="2" /></svg>
        <svg viewBox="0 0 300 170" className="absolute bottom-0 left-0 w-full">
          <ellipse cx="150" cy="150" rx="130" ry="18" fill="#FBF3DC" stroke="#2B3A55" strokeWidth="3" />
          <rect x="60" y="70" width="180" height="78" rx="10" fill="#fff" stroke="#2B3A55" strokeWidth="3" />
          <path d="M60 88 q15 14 30 0 q15 14 30 0 q15 14 30 0 q15 14 30 0 q15 14 30 0 q15 14 30 0" fill="none" stroke="#C8323A" strokeWidth="4" strokeLinecap="round" />
          <text x="150" y="130" textAnchor="middle" fontFamily="Patrick Hand" fontSize="22" fill="#2B3A55">COCO · {b.turning}</text>
          <rect x="140" y="26" width="20" height="44" rx="4" fill="#A9C8E3" stroke="#2B3A55" strokeWidth="3" />
          <text x="150" y="58" textAnchor="middle" fontFamily="Patrick Hand" fontSize="20" fill="#2B3A55">{b.turning}</text>
          {lit && <motion.path d="M150 24 q-9 -12 0 -22 q9 10 0 22z" fill="#FFE95C" stroke="#C8323A" strokeWidth="2" animate={{ scaleY: [1, 1.15, 0.95, 1], rotate: [-3, 3, -2, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} style={{ originX: "150px", originY: "24px" }} />}
          {blown && <motion.path d="M150 22 q6 -10 0 -18 q-6 -8 2 -16" fill="none" stroke="#2B3A55" strokeWidth="2" strokeDasharray="3 4" initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -20 }} transition={{ duration: 2 }} />}
        </svg>
        <AnimatePresence>
          {blown && Array.from({ length: 14 }).map((_, i) => (
            <motion.span key={i} className="absolute left-1/2 top-1/2" initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
              animate={{ x: Math.cos(i / 14 * Math.PI * 2) * 140, y: Math.sin(i / 14 * Math.PI * 2) * 120 - 40, opacity: 0, scale: 1.2, rotate: 180 }}
              transition={{ duration: 1.6, ease: "easeOut" }}>
              <Doodle name={(["sparkle", "heart", "cherry", "fish"] as const)[i % 4]} size={20} />
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {!lit && !blown && <button className="pill bg-sun" onClick={() => setLit(true)}>Light the candle 🕯️</button>}
        {lit && <button className="pill bg-cherry text-cream" onClick={blow}>Blow it out 💨</button>}
        {lit && !listening && navigator.mediaDevices && <button className="pill bg-white" onClick={micBlow}>Blow into the mic</button>}
        {listening && <p className="w-full font-hand text-lg">Listening for a big blow… (only checks loudness, on this device)</p>}
        {blown && <button className="pill bg-white" onClick={() => { setBlown(false); setLit(false); }}>Again</button>}
      </div>
      {blown && (
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 font-hand text-2xl leading-snug">
          Happy birthday, little chonk. 💚<br />Coco's always around you, and he'd like the first slice.
        </motion.p>
      )}
    </div>
  );
}
