import { AnimatePresence, motion } from "framer-motion";
import { Doodle } from "./Doodles";

export interface Burst { id: number; x: number; y: number }

/** Little hearts that float up where Coco was petted. */
export function Hearts({ bursts }: { bursts: Burst[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <AnimatePresence>
        {bursts.flatMap((b) => [0, 1, 2].map((i) => (
          <motion.span key={`${b.id}-${i}`} className="absolute"
            style={{ left: b.x - 10, top: b.y - 10 }}
            initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], scale: 1, x: (i - 1) * 26, y: -60 - i * 10 }}
            exit={{ opacity: 0 }} transition={{ duration: 1.1, delay: i * 0.08, ease: "easeOut" }}>
            <Doodle name="heart" size={20} />
          </motion.span>
        )))}
      </AnimatePresence>
    </div>
  );
}
