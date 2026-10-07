import { motion } from "framer-motion";
import { Doodle } from "./Doodles";

/** A little trail of paw prints that pads across the screen when you change pages. */
export function PawWipe({ dir }: { dir: number }) {
  const steps = 7;
  return (
    <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
      initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
      <motion.div className="absolute inset-0 bg-cream" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.55, 0] }} transition={{ duration: 0.75, times: [0, 0.35, 1] }} />
      {Array.from({ length: steps }).map((_, i) => {
        const t = i / (steps - 1);
        const x = dir > 0 ? 8 + t * 78 : 86 - t * 78;
        const y = 78 - t * 60 + (i % 2 ? 6 : -6);
        return (
          <motion.span key={i} className={`absolute ${i % 2 ? "text-cherry" : "text-navy"}`}
            style={{ left: `${x}%`, top: `${y}%`, rotate: dir > 0 ? 55 : -55 }}
            initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: [0, 0.9, 0], scale: [0.3, 1.1, 1] }}
            transition={{ duration: 0.55, delay: i * 0.05, ease: "easeOut" }}>
            <Doodle name="paw" size={42} />
          </motion.span>
        );
      })}
    </motion.div>
  );
}
