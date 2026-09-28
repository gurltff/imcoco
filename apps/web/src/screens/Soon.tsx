import { motion } from "framer-motion";
import { Coco } from "../components/Coco";
import { DoodleScatter } from "../components/Doodles";

const COPY = {
  world: { title: "Coco's Home", sub: "Phase 3 · Mini world", body: "Coco is still choosing which sunbeam is his. The little house, yard, snacks and the grumpy neighbourhood cats are on the way." },
  play: { title: "Play with Coco", sub: "Phase 3 · Play time", body: "Yarn, laser dot and a very important box. Coco is stretching first." },
  memories: { title: "Memories", sub: "Phase 5 · Photo wall", body: "Polaroids of Coco, letters sealed with a paw stamp, and his birthday cake are coming soon." },
};

export function Soon({ which }: { which: keyof typeof COPY }) {
  const c = COPY[which];
  const game = which !== "memories";
  return (
    <div className={`relative flex min-h-full flex-col items-center px-6 pt-10 text-center ${game ? "bg-white font-game" : ""}`}>
      {!game && <DoodleScatter items={[{ name: "sparkle", x: "12%", y: "40px" }, { name: "cake", x: "80%", y: "70px", size: 28 }, { name: "cherry", x: "10%", y: "300px" }]} />}
      <p className={game ? "text-sm tracking-widest text-black/60" : "smallcaps"}>{c.sub}</p>
      <h1 className={game ? "mt-1 text-4xl font-bold text-black" : "mt-1 font-hand text-4xl text-cherry"}>{c.title}</h1>
      <motion.div className="mt-8" animate={{ rotate: [0, -2, 2, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
        <Coco pose="sleep" size={170} accessories={!game} outline={game ? "#111" : undefined} />
      </motion.div>
      {game && (
        <div className="relative mt-2 flex items-center gap-2 rounded-md border-2 border-black bg-white px-3 py-2 text-left" style={{ boxShadow: "2px 2px 0 #000" }}>
          <Coco pose="sit" size={28} accessories={false} outline="#111" bob={false} />
          <span className="text-lg">meow (not ready yet… zzz)</span>
        </div>
      )}
      <p className={`mt-6 max-w-[300px] ${game ? "text-xl text-black/80" : "font-hand text-xl"}`}>{c.body}</p>
    </div>
  );
}
