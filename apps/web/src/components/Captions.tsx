import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { onCaption } from "../lib/audio";
import { useSettings } from "../lib/store";

/** Visual captions for every audio moment (accessibility). */
export function Captions() {
  const [settings] = useSettings();
  const [items, setItems] = useState<{ id: number; text: string }[]>([]);
  useEffect(() => onCaption((text) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-1), { id, text }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2400);
  }), []);
  if (!settings.captions) return null;
  return (
    <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-28 z-50 flex flex-col items-center gap-1">
      <AnimatePresence>
        {items.map((c) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: -8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
            className="rounded-full border-2 border-navy/70 bg-white/95 px-3 py-1 font-hand text-base text-navy shadow-sticker">
            🔊 {c.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
