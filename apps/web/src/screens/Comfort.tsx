import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { COMFORT_LINES, TypingRhythm, analyzeText } from "@coco/core";
import { Coco } from "../components/Coco";
import { BreathCircle } from "../components/BreathCircle";
import { DoodleScatter } from "../components/Doodles";
import { coco } from "../lib/audio";
import { speechSupported, startListening } from "../lib/speech";
import { useLocal, useSettings } from "../lib/store";

type Phase = "away" | "walking" | "here" | "happy";
interface SavedVent { id: number; at: number; text: string }

export function Comfort() {
  const [settings, setSettings] = useSettings();
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [phase, setPhase] = useState<Phase>("away");
  const [sadness, setSadness] = useState(0);
  const [breathing, setBreathing] = useState(false);
  const [hugging, setHugging] = useState(false);
  const [listening, setListening] = useState(false);
  const [saved, setSaved] = useLocal<SavedVent[]>("vents", []);
  const [toast, setToast] = useState("");
  const rhythm = useRef(new TypingRhythm());
  const stopRec = useRef<() => void>();
  const line = useRef(COMFORT_LINES[0]);

  const comforting = phase === "walking" || phase === "here";

  const callCoco = (level: number) => {
    if (comforting) return;
    line.current = COMFORT_LINES[Math.floor(Math.random() * COMFORT_LINES.length)];
    setPhase("walking");
    setSadness(level);
  };

  const feelBetter = () => {
    coco.stopPurr(2.5);
    setBreathing(false);
    setPhase("happy");
    setTimeout(() => setPhase((p) => (p === "happy" ? "away" : p)), 3500);
  };

  // Analyse locally, debounced, only when opted in.
  useEffect(() => {
    if (!settings.comfortDetection) return;
    const t = setTimeout(() => {
      const r = analyzeText(text + " " + interim, rhythm.current.signals());
      if (!comforting && r.sadness >= 0.45) callCoco(r.sadness);
      else if (comforting) {
        setSadness((s) => Math.max(r.sadness, s * 0.9));
        // Recent words sound better? Coco relaxes.
        const tail = analyzeText(text.slice(-80));
        if (tail.positivity >= 0.5 && tail.sadness < 0.2) feelBetter();
        else coco.setPurrIntensity(Math.max(r.sadness, 0.3));
      }
    }, 700);
    return () => clearTimeout(t);
  }, [text, interim, settings.comfortDetection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrival: soft mrrp, then gentle purr scaled by how sad things seem.
  const arrived = () => {
    if (phase !== "walking") return;
    setPhase("here");
    coco.meow("mrrp");
    setTimeout(() => coco.startPurr(Math.max(0.3, sadness * 0.8), 3), 700);
  };

  useEffect(() => () => { coco.stopPurr(1); stopRec.current?.(); }, []);

  const startBreathing = () => {
    setBreathing(true);
    if (!coco.purring) coco.startPurr(0.5, 2);
  };

  const hugStart = () => { setHugging(true); coco.startPurr(1, 0.6); coco.setPurrIntensity(1); };
  const hugEnd = () => {
    if (!hugging) return;
    setHugging(false);
    if (comforting || breathing) coco.setPurrIntensity(Math.max(0.35, sadness * 0.8));
    else coco.stopPurr(2);
  };

  const toggleMic = () => {
    if (listening) { stopRec.current?.(); return; }
    setListening(true);
    stopRec.current = startListening(
      (final, inter) => { if (final) setText((t) => (t ? t + " " : "") + final.trim()); setInterim(inter); },
      () => { setListening(false); setInterim(""); },
    );
  };

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const keep = () => {
    if (!text.trim()) return;
    setSaved([{ id: Date.now(), at: Date.now(), text: text.trim() }, ...saved]);
    setText(""); rhythm.current.reset();
    flash("Tucked away safely, only on this device.");
  };
  const letGo = () => { setText(""); rhythm.current.reset(); flash("Let go. Coco batted it away. 🐾"); };

  return (
    <div className="relative min-h-full px-4 pb-6 pt-2 lg:mx-auto lg:max-w-3xl lg:px-10 lg:pt-10">
      <DoodleScatter items={[{ name: "sparkle", x: "86%", y: "18px", size: 16 }, { name: "cup", x: "4%", y: "70px", size: 24, r: -8 }, { name: "heart", x: "90%", y: "300px", size: 16 }]} />

      <div className="relative flex items-end justify-between">
        <div>
          <p className="smallcaps">Comfort · Nothing is judged</p>
          <h1 className="font-hand text-[40px] leading-none text-cherry">Tell Coco anything</h1>
        </div>
        <AnimatePresence>
          {phase === "away" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 30 }} className="-mb-2 -mr-2">
              <Coco pose="sleep" size={72} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Opt-in detection toggle */}
      <button onClick={() => setSettings({ ...settings, comfortDetection: !settings.comfortDetection })}
        className={`mt-3 flex w-full items-center gap-3 rounded-2xl border-2 border-navy/70 px-3 py-2 text-left transition-colors ${settings.comfortDetection ? "bg-baby/60" : "bg-white/70"}`}
        role="switch" aria-checked={settings.comfortDetection}>
        <span className={`relative h-7 w-12 shrink-0 rounded-full border-2 border-navy/80 ${settings.comfortDetection ? "bg-cherry" : "bg-white"}`}>
          <motion.span layout className={`absolute top-0.5 h-5 w-5 rounded-full border-2 border-navy/80 bg-cream ${settings.comfortDetection ? "right-0.5" : "left-0.5"}`} />
        </span>
        <span className="text-sm leading-snug">
          <b className="font-hand text-lg">Let Coco notice when I'm sad</b><br />
          <span className="text-navy/70">Read only on this device. Nothing is sent or saved.</span>
        </span>
      </button>

      {/* Writing area with Coco walking over */}
      <div className="relative mt-4">
        <div className="sticker relative overflow-hidden p-3">
          <textarea value={text + (interim ? (text ? " " : "") + interim : "")}
            onChange={(e) => { setText(e.target.value); setInterim(""); }}
            onKeyDown={(e) => rhythm.current.record(e.key === "Backspace" || e.key === "Delete")}
            placeholder="It's okay. Type, or tap the mic and just talk…"
            aria-label="Tell Coco anything"
            className="h-40 w-full resize-none lg:h-56 bg-transparent font-hand text-[21px] leading-snug text-navy placeholder:text-navy/40 focus:outline-none" />
          <div className="flex items-center gap-2 border-t-2 border-dashed border-navy/15 pt-2">
            {speechSupported() && (
              <button onClick={toggleMic} aria-pressed={listening} aria-label={listening ? "Stop voice" : "Speak to Coco"}
                className={`grid h-11 w-11 place-items-center rounded-full border-2 border-navy/80 ${listening ? "animate-pulse bg-cherry text-cream" : "bg-baby"}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
              </button>
            )}
            <div className="flex-1" />
            <button className="pill bg-white px-3 py-1 text-base" onClick={letGo} disabled={!text}>Let it go</button>
            <button className="pill bg-baby px-3 py-1 text-base" onClick={keep} disabled={!text}>Keep it</button>
          </div>
        </div>

        {/* Coco walks in from the right and sits by the text box */}
        <AnimatePresence>
          {(phase === "walking" || phase === "here" || phase === "happy") && (
            <motion.button key="coco-comfort" aria-label="Hold to hug Coco"
              className="absolute -bottom-[118px] right-0 z-10 touch-none select-none"
              initial={{ x: 260, opacity: 1 }} animate={{ x: 0 }} exit={{ x: 280, transition: { duration: 1.4, ease: "easeIn" } }}
              transition={{ duration: 2.4, ease: [0.3, 0.1, 0.3, 1] }} onAnimationComplete={arrived}
              onPointerDown={hugStart} onPointerUp={hugEnd} onPointerLeave={hugEnd} onPointerCancel={hugEnd}
              onContextMenu={(e) => e.preventDefault()}>
              <motion.div animate={hugging ? { scale: 1.08 } : { scale: 1 }}>
                <Coco pose={phase === "walking" ? "walk" : phase === "happy" ? "play" : "purr"} size={104} />
              </motion.div>
              {hugging && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-hand text-lg text-cherry">prrrrr ♥</motion.span>}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {phase === "here" && (
          <motion.div key="here" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 min-h-[110px] pr-32">
            <p className="font-hand text-2xl leading-tight text-navy">{line.current}</p>
            <p className="text-xs text-navy/60">Press & hold Coco for a hug.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="pill bg-cherry text-cream" onClick={feelBetter}>I'm okay now</button>
              {!breathing && <button className="pill bg-white" onClick={startBreathing}>Breathe with Coco</button>}
            </div>
          </motion.div>
        )}
        {phase === "happy" && (
          <motion.p key="happy" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 min-h-[110px] pr-32 font-hand text-2xl text-navy">
            Coco headbutts your hand. He's proud of you. 💚
          </motion.p>
        )}
        {phase === "away" && (
          <motion.div key="away" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 flex flex-wrap gap-2">
            <button className="pill bg-baby" onClick={() => callCoco(0.5)}>Sit with me, Coco</button>
            {!breathing && <button className="pill bg-white" onClick={startBreathing}>Breathe with Coco</button>}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {breathing && (
          <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="gingham mt-8 overflow-hidden rounded-[1.4rem] border-[2.5px] border-navy/80 shadow-sticker">
            <div className="m-3 rounded-2xl bg-cream/95 p-4 text-center">
              <p className="smallcaps">In time with Coco's purr</p>
              <BreathCircle />
              <button className="pill mt-2 bg-white" onClick={() => { setBreathing(false); if (!comforting) coco.stopPurr(2); }}>Done breathing</button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {saved.length > 0 && (
        <details className="sticker mt-8 p-3">
          <summary className="cursor-pointer font-hand text-xl">Kept with Coco ({saved.length})</summary>
          <ul className="mt-2 space-y-2">
            {saved.map((v) => (
              <li key={v.id} className="rounded-xl bg-white/70 p-2 text-sm">
                <p className="smallcaps">{new Date(v.at).toLocaleString()}</p>
                <p className="whitespace-pre-wrap">{v.text}</p>
                <button className="mt-1 text-xs text-cherry underline" onClick={() => setSaved(saved.filter((x) => x.id !== v.id))}>Remove</button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed inset-x-0 bottom-28 z-40 lg:bottom-10 mx-auto w-fit rounded-full border-2 border-navy/70 bg-cream px-4 py-2 font-hand text-lg shadow-sticker">{toast}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
