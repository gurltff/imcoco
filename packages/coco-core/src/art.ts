/**
 * Placeholder art for Coco, as SVG strings so every surface (React, the Shadow-DOM
 * extension, the Electron overlay) can render the same character with no framework.
 * Chubby, jet black, bright green eyes. The "cafe" variant adds a red scarf + chef hat.
 * Swap these out for real sprite sheets later: keep the same pose names.
 */
import type { CocoPose } from "./mood";

export const PALETTE = {
  cream: "#FBF3DC",
  blue: "#A9C8E3",
  red: "#C8323A",
  navy: "#2B3A55",
  fur: "#15151A",
  furShine: "#2E2E38",
  eye: "#5EE07A",
  pupil: "#0B2A12",
  pink: "#F4A3B5",
  yellow: "#FFE95C",
};

export interface CocoArtOptions {
  pose?: CocoPose;
  blink?: boolean;
  /** Walk cycle frame (0 or 1). */
  step?: number;
  /** Red scarf + chef hat (main app). Off for the game world. */
  accessories?: boolean;
  outline?: string;
}

const P = PALETTE;

function eyes(x1: number, x2: number, y: number, mode: "open" | "closed" | "happy" | "narrow", o: string) {
  if (mode === "closed")
    return `<path d="M${x1 - 10} ${y} Q${x1} ${y + 7} ${x1 + 10} ${y}M${x2 - 10} ${y} Q${x2} ${y + 7} ${x2 + 10} ${y}" stroke="${P.eye}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  if (mode === "happy")
    return `<path d="M${x1 - 10} ${y + 3} Q${x1} ${y - 8} ${x1 + 10} ${y + 3}M${x2 - 10} ${y + 3} Q${x2} ${y - 8} ${x2 + 10} ${y + 3}" stroke="${P.eye}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  const ry = mode === "narrow" ? 7 : 13;
  const one = (x: number, dir: number) =>
    `<ellipse cx="${x}" cy="${y}" rx="12" ry="${ry}" fill="${P.eye}" stroke="${o}" stroke-width="2"/>` +
    `<ellipse cx="${x}" cy="${y + 1}" rx="${mode === "narrow" ? 3 : 5.5}" ry="${ry - 3}" fill="${P.pupil}"/>` +
    `<circle cx="${x + 4}" cy="${y - ry / 2.2}" r="3.2" fill="#fff"/><circle cx="${x - 4}" cy="${y + 4}" r="1.5" fill="#fff" opacity=".8"/>` +
    (mode === "narrow" ? `<path d="M${x - 13} ${y - 9 + dir * 5} L${x + 12} ${y - 9 - dir * 5}" stroke="${o}" stroke-width="3" stroke-linecap="round"/>` : "");
  return one(x1, -1) + one(x2, 1);
}

function face(cx: number, cy: number, mode: Parameters<typeof eyes>[3], o: string, mouthOpen = false) {
  const whisk = "#B9BCC8";
  return (
    eyes(cx - 20, cx + 20, cy, mode, o) +
    `<ellipse cx="${cx - 34}" cy="${cy + 14}" rx="7" ry="4" fill="${P.pink}" opacity=".55"/>` +
    `<ellipse cx="${cx + 34}" cy="${cy + 14}" rx="7" ry="4" fill="${P.pink}" opacity=".55"/>` +
    `<path d="M${cx - 4} ${cy + 12} L${cx + 4} ${cy + 12} L${cx} ${cy + 16} Z" fill="${P.pink}" stroke-linejoin="round"/>` +
    (mouthOpen
      ? `<path d="M${cx - 7} ${cy + 19} Q${cx} ${cy + 32} ${cx + 7} ${cy + 19} Z" fill="#E0566B" stroke="${whisk}" stroke-width="1.5"/>`
      : `<path d="M${cx - 8} ${cy + 19} Q${cx - 4} ${cy + 24} ${cx} ${cy + 18} Q${cx + 4} ${cy + 24} ${cx + 8} ${cy + 19}" stroke="${whisk}" stroke-width="2" fill="none" stroke-linecap="round"/>`) +
    `<path d="M${cx - 30} ${cy + 16} L${cx - 52} ${cy + 12}M${cx - 30} ${cy + 20} L${cx - 50} ${cy + 22}M${cx + 30} ${cy + 16} L${cx + 52} ${cy + 12}M${cx + 30} ${cy + 20} L${cx + 50} ${cy + 22}" stroke="${whisk}" stroke-width="1.6" stroke-linecap="round"/>`
  );
}

function ears(cx: number, top: number, o: string, flat = false) {
  const dy = flat ? 14 : 0;
  const dx = flat ? 10 : 0;
  return (
    `<path d="M${cx - 44} ${top + 38} L${cx - 38 - dx} ${top + dy} L${cx - 10} ${top + 24} Z" fill="${P.fur}" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>` +
    `<path d="M${cx + 44} ${top + 38} L${cx + 38 + dx} ${top + dy} L${cx + 10} ${top + 24} Z" fill="${P.fur}" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>` +
    `<path d="M${cx - 36} ${top + 30} L${cx - 34 - dx} ${top + 12 + dy} L${cx - 20} ${top + 24} Z" fill="${P.pink}" opacity=".7"/>` +
    `<path d="M${cx + 36} ${top + 30} L${cx + 34 + dx} ${top + 12 + dy} L${cx + 20} ${top + 24} Z" fill="${P.pink}" opacity=".7"/>`
  );
}

function scarf(cx: number, y: number, o: string) {
  return (
    `<path d="M${cx - 44} ${y} Q${cx} ${y + 18} ${cx + 44} ${y} L${cx + 46} ${y + 12} Q${cx} ${y + 34} ${cx - 46} ${y + 12} Z" fill="${P.red}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M${cx + 18} ${y + 16} L${cx + 26} ${y + 40} L${cx + 40} ${y + 34} L${cx + 32} ${y + 12} Z" fill="${P.red}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M${cx + 25} ${y + 36} l2 4 M${cx + 32} ${y + 34} l2 4" stroke="${o}" stroke-width="2" stroke-linecap="round"/>`
  );
}

function hat(cx: number, top: number, o: string) {
  return (
    `<g transform="rotate(-10 ${cx} ${top + 20})">` +
    `<circle cx="${cx - 14}" cy="${top + 4}" r="13" fill="#fff" stroke="${o}" stroke-width="3"/>` +
    `<circle cx="${cx + 14}" cy="${top + 4}" r="13" fill="#fff" stroke="${o}" stroke-width="3"/>` +
    `<circle cx="${cx}" cy="${top - 4}" r="15" fill="#fff" stroke="${o}" stroke-width="3"/>` +
    `<rect x="${cx - 20}" y="${top + 6}" width="40" height="16" rx="4" fill="#fff" stroke="${o}" stroke-width="3"/>` +
    `<path d="M${cx - 8} ${top + 10} v8 M${cx + 6} ${top + 10} v8" stroke="${o}" stroke-width="2" stroke-linecap="round"/>` +
    `</g>`
  );
}

function spikyPath(cx: number, cy: number, rx: number, ry: number, spikes = 26) {
  let d = "";
  for (let i = 0; i <= spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 1.12 : 0.97;
    const x = cx + Math.cos(a) * rx * r;
    const y = cy + Math.sin(a) * ry * r;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d + "Z";
}

function sitting(o: string, acc: boolean, mode: Parameters<typeof eyes>[3], opts: { puff?: boolean; mouth?: boolean }) {
  const puff = !!opts.puff;
  const tail = puff
    ? `<path d="M150 170 Q192 150 178 96" stroke="${o}" stroke-width="30" fill="none" stroke-linecap="round"/><path d="M150 170 Q192 150 178 96" stroke="${P.fur}" stroke-width="23" fill="none" stroke-linecap="round" stroke-dasharray="3 5"/><path d="M150 170 Q192 150 178 96" stroke="${P.fur}" stroke-width="20" fill="none" stroke-linecap="round"/>`
    : `<path d="M148 172 Q190 160 182 118" stroke="${o}" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M148 172 Q190 160 182 118" stroke="${P.fur}" stroke-width="11" fill="none" stroke-linecap="round"/>`;
  const body = puff
    ? `<path d="${spikyPath(100, 146, 66, 50)}" fill="${P.fur}" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>`
    : `<ellipse cx="100" cy="146" rx="64" ry="50" fill="${P.fur}" stroke="${o}" stroke-width="3.5"/>` +
      `<ellipse cx="78" cy="132" rx="20" ry="12" fill="${P.furShine}" opacity=".7"/>`;
  return (
    tail + body +
    `<ellipse cx="78" cy="190" rx="16" ry="9" fill="${P.fur}" stroke="${o}" stroke-width="3"/>` +
    `<ellipse cx="122" cy="190" rx="16" ry="9" fill="${P.fur}" stroke="${o}" stroke-width="3"/>` +
    `<path d="M72 190 v5 M80 190 v5 M116 190 v5 M124 190 v5" stroke="#555" stroke-width="1.5" stroke-linecap="round"/>` +
    ears(100, 38, o, puff) +
    (puff ? `<path d="${spikyPath(100, 92, 56, 46, 20)}" fill="${P.fur}" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>`
          : `<ellipse cx="100" cy="92" rx="56" ry="46" fill="${P.fur}" stroke="${o}" stroke-width="3.5"/>`) +
    face(100, 90, mode, o, opts.mouth) +
    (acc ? scarf(100, 126, o) + hat(100, 34, o) : "")
  );
}

function sleeping(o: string, acc: boolean) {
  return (
    `<ellipse cx="108" cy="156" rx="78" ry="38" fill="${P.fur}" stroke="${o}" stroke-width="3.5"/>` +
    `<path d="M40 176 Q100 198 170 176" stroke="${o}" stroke-width="16" fill="none" stroke-linecap="round"/>` +
    `<path d="M40 176 Q100 198 170 176" stroke="${P.fur}" stroke-width="10" fill="none" stroke-linecap="round"/>` +
    `<g transform="translate(-28 48) scale(.82)">` + ears(100, 38, o) +
    `<ellipse cx="100" cy="92" rx="56" ry="44" fill="${P.fur}" stroke="${o}" stroke-width="3.5"/>` +
    face(100, 92, "closed", o) + (acc ? scarf(100, 124, o) : "") + `</g>`
  );
}

function walking(o: string, acc: boolean, step: number, blink: boolean) {
  const a = step % 2 === 0 ? 6 : -6;
  const leg = (x: number, d: number) => `<rect x="${x + d}" y="150" width="17" height="36" rx="8" fill="${P.fur}" stroke="${o}" stroke-width="3"/>`;
  return (
    `<path d="M44 128 Q14 110 26 74" stroke="${o}" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M44 128 Q14 110 26 74" stroke="${P.fur}" stroke-width="11" fill="none" stroke-linecap="round"/>` +
    leg(46, -a) + leg(116, a) +
    `<ellipse cx="96" cy="136" rx="62" ry="38" fill="${P.fur}" stroke="${o}" stroke-width="3.5"/>` +
    leg(62, a) + leg(132, -a) +
    `<g transform="translate(46 8) scale(.78)">` + ears(100, 38, o) +
    `<ellipse cx="100" cy="92" rx="56" ry="46" fill="${P.fur}" stroke="${o}" stroke-width="3.5"/>` +
    face(100, 90, blink ? "closed" : "open", o) + (acc ? scarf(100, 126, o) : "") + `</g>`
  );
}

export function cocoSvg(opts: CocoArtOptions = {}): string {
  const o = opts.outline ?? P.navy;
  const acc = opts.accessories ?? true;
  const pose = opts.pose ?? "sit";
  let inner: string;
  switch (pose) {
    case "sleep": inner = sleeping(o, acc); break;
    case "walk": inner = walking(o, acc, opts.step ?? 0, !!opts.blink); break;
    case "puff": inner = sitting(o, false, "narrow", { puff: true, mouth: true }); break;
    case "eat": inner = sitting(o, acc, "happy", { mouth: true }); break;
    case "purr": inner = sitting(o, acc, "closed", {}); break;
    case "play": inner = sitting(o, acc, "happy", {}); break;
    default: inner = sitting(o, acc, opts.blink ? "closed" : "open", {});
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 210" role="img" aria-label="Coco the black cat, ${pose}">${inner}</svg>`;
}
