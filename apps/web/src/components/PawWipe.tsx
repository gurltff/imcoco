import { motion } from "framer-motion";
import { Doodle } from "./Doodles";

/** A little trail of paw prints that pads across the screen when you change pages. */
export function PawWipe({ dir }: { dir: number }) {
  const steps = 7;
  return (
    <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
      initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
      {Array.from({ length: steps }).map((_, i) => {
        const t = i / (steps - 1);
        const x = dir > 0 ? 8 + t * 78 : 86 - t * 78;
        const y = 78 - t * 60 + (i % 2 ? 6 : -6);
        return (
          <motion.span key={i} className={`absolute ${i % 2 ? "text-cherry" : "text-navy"}`}
            style={{ left: `${x}%`, top: `${y}%`, rotate: dir > 0 ? 55 : -55 }}
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: [0, 0.9, 0.9, 0], scale: [0.5, 1.08, 1, 1] }}
            transition={{ duration: 1.3, delay: i * 0.13, times: [0, 0.2, 0.65, 1], ease: "easeOut" }}>
            <Doodle name="paw" size={46} />
          </motion.span>
        );
      })}
    </motion.div>
  );
}
