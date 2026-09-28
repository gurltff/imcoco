import { useEffect, useRef, useState } from "react";
import { coco } from "../lib/audio";

/** A circle that grows and shrinks in time with Coco's purr (same clock as the audio). */
export function BreathCircle() {
  const ref = useRef<HTMLDivElement>(null);
  const [inhale, setInhale] = useState(true);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = coco.breathPhase(); // purr gain = 0.65 + 0.35·sin(2πp)
      const s = Math.sin(p * Math.PI * 2);
      if (ref.current) ref.current.style.transform = `scale(${0.7 + 0.3 * (s + 1) / 2})`;
      setInhale(Math.cos(p * Math.PI * 2) > 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="relative mx-auto grid h-48 w-48 place-items-center">
      <div ref={ref} className="absolute inset-0 rounded-full border-[3px] border-navy/70 bg-baby/70" style={{ willChange: "transform" }} />
      <div className="absolute inset-6 rounded-full border-2 border-dashed border-navy/30" />
      <p className="relative font-hand text-3xl text-navy" aria-live="polite">{inhale ? "breathe in…" : "breathe out…"}</p>
    </div>
  );
}
