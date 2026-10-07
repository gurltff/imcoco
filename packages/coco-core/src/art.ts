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
  /** Recolour for other cats (neighbourhood strays). */
  fur?: string;
  eye?: string;
}

let P = { ...PALETTE };

function eyes(x1: number, x2: number, y: number, mode: "open" | "closed" | "happy" | "narrow", o: string) {
  if (mode === "closed")
    return `<path d="M${x1 - 11} ${y} Q${x1} ${y + 8} ${x1 + 11} ${y}M${x2 - 11} ${y} Q${x2} ${y + 8} ${x2 + 11} ${y}" stroke="${P.eye}" stroke-width="3.5" fill="none" stroke-linecap="round"/>` +
      `<path d="M${x1 - 12} ${y - 2} l-4 -2M${x2 + 12} ${y - 2} l4 -2" stroke="${P.eye}" stroke-width="2" stroke-linecap="round" opacity=".7"/>`;
  if (mode === "happy")
    return `<path d="M${x1 - 11} ${y + 4} Q${x1} ${y - 9} ${x1 + 11} ${y + 4}M${x2 - 11} ${y + 4} Q${x2} ${y - 9} ${x2 + 11} ${y + 4}" stroke="${P.eye}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  const ry = mode === "narrow" ? 8 : 17;
  const one = (x: number, dir: number) =>
    `<ellipse cx="${x}" cy="${y}" rx="15.5" ry="${ry}" fill="url(#coco-iris)" stroke="${o}" stroke-width="2.2"/>` +
    `<ellipse cx="${x + dir * 0.5}" cy="${y + 1.5}" rx="${mode === "narrow" ? 3 : 7}" ry="${ry - 2.5}" fill="${P.pupil}"/>` +
    `<circle cx="${x + 5}" cy="${y - ry / 2.4}" r="5" fill="#fff"/>` +
    `<circle cx="${x - 4.5}" cy="${y + 5}" r="2" fill="#fff" opacity=".85"/>` +
    `<path d="M${x - 13} ${y - ry + 3} Q${x} ${y - ry - 5} ${x + 13} ${y - ry + 3}" stroke="${o}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
    (mode === "narrow" ? `<path d="M${x - 13} ${y - 9 + dir * 5} L${x + 12} ${y - 9 - dir * 5}" stroke="${o}" stroke-width="3" stroke-linecap="round"/>` : "");
  return one(x1, -1) + one(x2, 1);
}

function face(cx: number, cy: number, mode: Parameters<typeof eyes>[3], o: string, mouthOpen = false) {
  const whisk = "#C9CCD8";
  return (
    `<path d="M${cx - 8} ${cy - 30} q2 7 0 12M${cx} ${cy - 33} q1 8 0 13M${cx + 8} ${cy - 30} q-2 7 0 12" stroke="${P.furShine}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>` +
    eyes(cx - 21, cx + 21, cy, mode, o) +
    `<ellipse cx="${cx - 36}" cy="${cy + 15}" rx="8" ry="4.5" fill="${P.pink}" opacity=".6"/>` +
    `<ellipse cx="${cx + 36}" cy="${cy + 15}" rx="8" ry="4.5" fill="${P.pink}" opacity=".6"/>` +
    `<path d="M${cx - 4.5} ${cy + 12} Q${cx} ${cy + 10.5} ${cx + 4.5} ${cy + 12} Q${cx + 1} ${cy + 17} ${cx} ${cy + 17} Q${cx - 1} ${cy + 17} ${cx - 4.5} ${cy + 12}Z" fill="${P.pink}"/>` +
    (mouthOpen
      ? `<path d="M${cx - 8} ${cy + 20} Q${cx} ${cy + 33} ${cx + 8} ${cy + 20} Z" fill="#E0566B" stroke="${whisk}" stroke-width="1.5"/><path d="M${cx - 4} ${cy + 26} q4 3 8 0" fill="#F49AAA"/>`
      : `<path d="M${cx - 9} ${cy + 19} Q${cx - 4.5} ${cy + 25} ${cx} ${cy + 18.5} Q${cx + 4.5} ${cy + 25} ${cx + 9} ${cy + 19}" stroke="${whisk}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`) +
    `<path d="M${cx - 30} ${cy + 15} Q${cx - 44} ${cy + 9} ${cx - 56} ${cy + 11}M${cx - 30} ${cy + 20} Q${cx - 44} ${cy + 20} ${cx - 54} ${cy + 25}M${cx + 30} ${cy + 15} Q${cx + 44} ${cy + 9} ${cx + 56} ${cy + 11}M${cx + 30} ${cy + 20} Q${cx + 44} ${cy + 20} ${cx + 54} ${cy + 25}" stroke="${whisk}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
  );
}

/** little fluffy cheek tufts on the sides of the head */
function cheeks(cx: number, cy: number, rx: number, o: string) {
  return `<path d="M${cx - rx + 2} ${cy + 4} l-9 4 l7 3 l-8 5 l10 0" fill="${P.fur}" stroke="${o}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="M${cx + rx - 2} ${cy + 4} l9 4 l-7 3 l8 5 l-10 0" fill="${P.fur}" stroke="${o}" stroke-width="2.6" stroke-linejoin="round"/>`;
}

function ears(cx: number, top: number, o: string, flat = false) {
  const dy = flat ? 14 : 0;
  const dx = flat ? 10 : 0;
  return (
    `<path d="M${cx - 44} ${top + 38} L${cx - 38 - dx} ${top + dy} L${cx - 10} ${top + 24} Z" fill="${P.fur}" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>` +
    `<path d="M${cx + 44} ${top + 38} L${cx + 38 + dx} ${top + dy} L${cx + 10} ${top + 24} Z" fill="${P.fur}" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>` +
    `<path d="M${cx - 36} ${top + 30} L${cx - 34 - dx} ${top + 12 + dy} L${cx - 20} ${top + 24} Z" fill="url(#coco-ear)"/>` +
    `<path d="M${cx + 36} ${top + 30} L${cx + 34 + dx} ${top + 12 + dy} L${cx + 20} ${top + 24} Z" fill="url(#coco-ear)"/>` +
    `<path d="M${cx - 32} ${top + 26} l-2 -6M${cx - 29} ${top + 27} l1 -6M${cx + 32} ${top + 26} l2 -6M${cx + 29} ${top + 27} l-1 -6" stroke="#E9C9D2" stroke-width="1.4" stroke-linecap="round"/>`
  );
}

function scarf(cx: number, y: number, o: string) {
  return (
    `<path d="M${cx - 44} ${y} Q${cx} ${y + 18} ${cx + 44} ${y} L${cx + 46} ${y + 12} Q${cx} ${y + 34} ${cx - 46} ${y + 12} Z" fill="${P.red}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M${cx + 18} ${y + 16} L${cx + 26} ${y + 40} L${cx + 40} ${y + 34} L${cx + 32} ${y + 12} Z" fill="${P.red}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M${cx - 30} ${y + 9} Q${cx} ${y + 22} ${cx + 30} ${y + 9}" stroke="#F3B9BD" stroke-width="2.2" fill="none" stroke-dasharray="2 6" stroke-linecap="round"/>` +
    `<circle cx="${cx + 22}" cy="${y + 15}" r="6.5" fill="${P.red}" stroke="${o}" stroke-width="2.6"/>` +
    `<path d="M${cx + 25} ${y + 36} l2 4 M${cx + 32} ${y + 34} l2 4 M${cx + 29} ${y + 35} l2 4" stroke="${o}" stroke-width="2" stroke-linecap="round"/>`
  );
}

function hat(cx: number, top: number, o: string) {
  return (
    `<g transform="rotate(-10 ${cx} ${top + 20})">` +
    `<circle cx="${cx - 14}" cy="${top + 4}" r="13" fill="#fff" stroke="${o}" stroke-width="3"/>` +
    `<circle cx="${cx + 14}" cy="${top + 4}" r="13" fill="#fff" stroke="${o}" stroke-width="3"/>` +
    `<circle cx="${cx}" cy="${top - 4}" r="15" fill="#fff" stroke="${o}" stroke-width="3"/>` +
    `<path d="M${cx - 22} ${top + 8} q6 5 12 1 M${cx + 8} ${top + 8} q6 5 12 0" stroke="#D5DEEA" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<rect x="${cx - 20}" y="${top + 6}" width="40" height="16" rx="4" fill="#fff" stroke="${o}" stroke-width="3"/>` +
    `<rect x="${cx - 17}" y="${top + 15}" width="34" height="4" rx="2" fill="#E3E9F2"/>` +
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
    : `<ellipse cx="100" cy="146" rx="74" ry="53" fill="url(#coco-fur)" stroke="${o}" stroke-width="3.5"/>` +
      `<ellipse cx="100" cy="160" rx="38" ry="28" fill="${P.furShine}" opacity=".45"/>` +
      `<path d="M66 150 q4 6 0 12 M134 150 q-4 6 0 12" stroke="${P.furShine}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>` +
      `<ellipse cx="72" cy="134" rx="22" ry="12" fill="${P.furShine}" opacity=".7"/>`;
  return (
    tail + body +
    `<ellipse cx="74" cy="192" rx="17" ry="9" fill="${P.fur}" stroke="${o}" stroke-width="3"/>` +
    `<ellipse cx="126" cy="192" rx="17" ry="9" fill="${P.fur}" stroke="${o}" stroke-width="3"/>` +
    `<path d="M68 192 v5 M76 192 v5 M120 192 v5 M128 192 v5" stroke="#555" stroke-width="1.6" stroke-linecap="round"/>` +
    ears(100, 38, o, puff) +
    (puff ? `<path d="${spikyPath(100, 92, 56, 46, 20)}" fill="${P.fur}" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>`
          : cheeks(100, 92, 60, o) + `<ellipse cx="100" cy="92" rx="60" ry="47" fill="url(#coco-fur)" stroke="${o}" stroke-width="3.5"/>`) +
    face(100, 90, mode, o, opts.mouth) +
    (acc ? scarf(100, 126, o) + hat(100, 34, o) : "")
  );
}

function sleeping(o: string, acc: boolean) {
  return (
    `<ellipse cx="108" cy="154" rx="84" ry="42" fill="${P.fur}" stroke="${o}" stroke-width="3.5"/>` +
    `<path d="M40 176 Q100 198 170 176" stroke="${o}" stroke-width="16" fill="none" stroke-linecap="round"/>` +
    `<path d="M40 176 Q100 198 170 176" stroke="${P.fur}" stroke-width="10" fill="none" stroke-linecap="round"/>` +
    `<g transform="translate(-28 48) scale(.82)">` + ears(100, 38, o) +
    `<ellipse cx="100" cy="92" rx="56" ry="44" fill="${P.fur}" stroke="${o}" stroke-width="3.5"/>` +
    face(100, 92, "closed", o) + (acc ? scarf(100, 124, o) : "") + `</g>`
  );
}

function walking(o: string, acc: boolean, step: number, blink: boolean, stretch = false) {
  const a = step % 2 === 0 ? 6 : -6;
  const lift = stretch ? 16 : 0;
  const leg = (x: number, d: number) => `<rect x="${x + d}" y="150" width="17" height="36" rx="8" fill="${P.fur}" stroke="${o}" stroke-width="3"/>`;
  return (
    `<path d="M44 128 Q14 110 26 74" stroke="${o}" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M44 128 Q14 110 26 74" stroke="${P.fur}" stroke-width="11" fill="none" stroke-linecap="round"/>` +
    leg(46, -a) + leg(116, a) +
    `<ellipse cx="96" cy="${136 + lift / 2}" rx="62" ry="38" transform="rotate(${stretch ? 10 : 0} 96 136)" fill="${P.fur}" stroke="${o}" stroke-width="3.5"/>` +
    leg(62, a) + leg(132, -a) +
    `<g transform="translate(${stretch ? "56 38" : "46 8"}) scale(.78)">` + ears(100, 38, o) +
    `<ellipse cx="100" cy="92" rx="56" ry="46" fill="${P.fur}" stroke="${o}" stroke-width="3.5"/>` +
    face(100, 90, blink || stretch ? "closed" : "open", o) + (acc ? scarf(100, 126, o) : "") + `</g>`
  );
}

export function cocoSvg(opts: CocoArtOptions = {}): string {
  P = { ...PALETTE, fur: opts.fur ?? PALETTE.fur, eye: opts.eye ?? PALETTE.eye, furShine: opts.fur ? "#ffffff" : PALETTE.furShine };
  const o = opts.outline ?? P.navy;
  const acc = opts.accessories ?? true;
  const pose = opts.pose ?? "sit";
  let inner: string;
  switch (pose) {
    case "sleep": inner = sleeping(o, acc); break;
    case "walk": inner = walking(o, acc, opts.step ?? 0, !!opts.blink); break;
    case "stretch": inner = walking(o, acc, 0, false, true); break;
    case "puff": inner = sitting(o, false, "narrow", { puff: true, mouth: true }); break;
    case "eat": inner = sitting(o, acc, "happy", { mouth: true }); break;
    case "purr": inner = sitting(o, acc, "closed", {}); break;
    case "play": inner = sitting(o, acc, "happy", {}); break;
    default: inner = sitting(o, acc, opts.blink ? "closed" : "open", {});
  }
  const defs =
    `<defs>` +
    `<radialGradient id="coco-fur" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="${P.fur === PALETTE.fur ? "#2E2E3A" : P.fur}"/><stop offset="1" stop-color="${P.fur}"/></radialGradient>` +
    `<radialGradient id="coco-iris" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#C6FFC9"/><stop offset=".45" stop-color="${P.eye}"/><stop offset="1" stop-color="#1E8F44"/></radialGradient>` +
    `<linearGradient id="coco-ear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7B8C7"/><stop offset="1" stop-color="#C77A92"/></linearGradient>` +
    `</defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 210" role="img" aria-label="Coco the black cat, ${pose}">${defs}${inner}</svg>`;
}
