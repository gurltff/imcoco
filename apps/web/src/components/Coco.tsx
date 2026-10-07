import type { CocoPose } from "@coco/core";
import sit from "../game/sprites/app-sit.png";
import sitCafe from "../game/sprites/app-sit-cafe.png";
import happy from "../game/sprites/app-happy.png";
import happyCafe from "../game/sprites/app-happy-cafe.png";
import loaf from "../game/sprites/app-loaf.png";
import loafCafe from "../game/sprites/app-loaf-cafe.png";
import purr from "../game/sprites/app-purr.png";
import purrCafe from "../game/sprites/app-purr-cafe.png";
import run from "../game/sprites/app-run.png";

interface Props {
  pose?: CocoPose;
  size?: number;
  accessories?: boolean;
  /** kept for API compatibility with the old drawn Coco */
  outline?: string;
  bob?: boolean;
  className?: string;
}

const FW = 36, FH = 44; // frame size of the app sprite sheets

type Sheet = { url: string; frames: number; fps: number; seq?: number[] };
function sheetFor(pose: CocoPose, cafe: boolean): Sheet {
  switch (pose) {
    case "sleep": return { url: cafe ? loafCafe : loaf, frames: 4, fps: 0.8, seq: [2, 3] };
    case "purr": return { url: cafe ? purrCafe : purr, frames: 4, fps: 3 };
    case "play":
    case "eat": return { url: cafe ? happyCafe : happy, frames: 2, fps: 3 };
    case "walk": return { url: run, frames: 6, fps: 12 };
    default: return { url: cafe ? sitCafe : sit, frames: 8, fps: 5 };
  }
}

/** Coco as chubby pixel art (big green eyes with pupils), scaled by whole pixels so he stays crisp. */
export function Coco({ pose = "sit", size = 120, accessories = true, bob = true, className = "" }: Props) {
  const s = sheetFor(pose, accessories && pose !== "walk");
  const k = Math.max(1, Math.round((size * 1.1) / FH));
  const w = FW * k, h = FH * k;
  const frames = s.seq ?? Array.from({ length: s.frames }, (_, i) => i);
  // CSS steps() animation over the frames listed in seq
  const anim = frames.length > 1
    ? `pxsheet ${frames.length / s.fps}s steps(${frames.length}) infinite`
    : undefined;
  const start = -frames[0] * w;
  return (
    <div aria-hidden className={`${bob && pose !== "walk" ? "coco-bob" : ""} ${className}`} style={{ width: w, height: h }}>
      <div className="pixel-sheet" style={{
        width: w, height: h,
        backgroundImage: `url(${s.url})`,
        backgroundSize: `${s.frames * w}px ${h}px`,
        backgroundPosition: `${start}px 0`,
        ["--start" as string]: `${start}px`,
        ["--end" as string]: `${start - frames.length * w}px`,
        animation: anim,
      }} />
    </div>
  );
}
