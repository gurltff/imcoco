/**
 * Coco, hand-drawn in a minimal doodle style: a solid, chubby jet-black silhouette with
 * big round green eyes (black pupils + a shine), thin white whiskers, and his red scarf
 * and chef hat for the café look. Returned as SVG strings so every surface (React, the
 * Shadow-DOM extension, the Electron overlay) can draw the same character.
 */
import type { CocoPose } from "./mood";

export const PALETTE = {
  cream: "#FBF3DC",
  blue: "#A9C8E3",
  red: "#C8323A",
  navy: "#2B3A55",
  fur: "#141418",
  furShine: "#26262E",
  eye: "#5EE07A",
  pupil: "#0B0F0C",
  pink: "#F4A3B5",
  yellow: "#FFE95C",
};

export interface CocoArtOptions {
  pose?: CocoPose;
  blink?: boolean;
  /** Walk cycle frame (0 or 1). */
  step?: number;
  /** Red scarf + chef hat (main app). */
  accessories?: boolean;
  /** Outline colour for the accessories. */
  outline?: string;
  /** Recolour for other cats. */
  fur?: string;
  eye?: string;
}

let P = { ...PALETTE };
const W = "#F4F1EA"; // whisker / line white

type EyeMode = "open" | "closed" | "happy" | "narrow";

/** One big round eye: white rim, green iris, black pupil, shine. */
function eye(x: number, y: number, r: number, mode: EyeMode, look = 0) {
  if (mode === "closed")
    return `<path d="M${x - r} ${y} Q${x} ${y + r * 0.75} ${x + r} ${y}" stroke="${P.eye}" stroke-width="${r * 0.32}" fill="none" stroke-linecap="round"/>`;
  if (mode === "happy")
    return `<path d="M${x - r} ${y + r * 0.35} Q${x} ${y - r * 0.9} ${x + r} ${y + r * 0.35}" stroke="${P.eye}" stroke-width="${r * 0.34}" fill="none" stroke-linecap="round"/>`;
  const iris = r * 0.8;
  let s =
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${W}"/>` +
    `<circle cx="${x + look}" cy="${y + 1}" r="${iris}" fill="url(#coco-iris)"/>` +
    `<circle cx="${x + look}" cy="${y + 1.5}" r="${iris * 0.48}" fill="${P.pupil}"/>` +
    `<circle cx="${x + look + iris * 0.38}" cy="${y - iris * 0.38}" r="${iris * 0.26}" fill="#fff"/>` +
    `<circle cx="${x + look - iris * 0.35}" cy="${y + iris * 0.4}" r="${iris * 0.12}" fill="#fff" opacity=".85"/>`;
  if (mode === "narrow") s += `<path d="M${x - r - 3} ${y - 1} A${r + 3} ${r + 3} 0 0 1 ${x + r + 3} ${y - 6} Z" fill="${P.fur}"/>`;
  return s;
}

function whiskers(cx: number, cy: number, spread = 1) {
  const s = spread;
  return `<path d="M${cx - 26 * s} ${cy} L${cx - 54 * s} ${cy - 7}M${cx - 26 * s} ${cy + 6} L${cx - 52 * s} ${cy + 10}M${cx + 26 * s} ${cy} L${cx + 54 * s} ${cy - 7}M${cx + 26 * s} ${cy + 6} L${cx + 52 * s} ${cy + 10}" stroke="${W}" stroke-width="2" stroke-linecap="round" opacity=".9"/>`;
}

function nose(cx: number, cy: number, open = false) {
  return `<path d="M${cx - 4} ${cy} L${cx + 4} ${cy} L${cx} ${cy + 4.5} Z" fill="${P.pink}" stroke-linejoin="round"/>` +
    (open
      ? `<path d="M${cx - 7} ${cy + 8} Q${cx} ${cy + 20} ${cx + 7} ${cy + 8} Z" fill="#E0566B"/>`
      : `<path d="M${cx - 7} ${cy + 7} Q${cx - 3.5} ${cy + 11} ${cx} ${cy + 6} Q${cx + 3.5} ${cy + 11} ${cx + 7} ${cy + 7}" stroke="${W}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".85"/>`);
}

function blush(cx: number, cy: number, gap: number) {
  return `<ellipse cx="${cx - gap}" cy="${cy}" rx="8" ry="4.5" fill="${P.pink}" opacity=".55"/><ellipse cx="${cx + gap}" cy="${cy}" rx="8" ry="4.5" fill="${P.pink}" opacity=".55"/>`;
}

function scarf(cx: number, y: number, w: number, o: string) {
  return (
    `<path d="M${cx - w} ${y} Q${cx} ${y + 22} ${cx + w} ${y} L${cx + w + 2} ${y + 13} Q${cx} ${y + 38} ${cx - w - 2} ${y + 13} Z" fill="${P.red}" stroke="${o}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="M${cx - w + 8} ${y + 10} Q${cx} ${y + 28} ${cx + w - 8} ${y + 10}" stroke="#F6C3C6" stroke-width="2" fill="none" stroke-dasharray="2 6" stroke-linecap="round"/>` +
    `<path d="M${cx + w * 0.35} ${y + 20} L${cx + w * 0.45} ${y + 44} L${cx + w * 0.7} ${y + 38} L${cx + w * 0.55} ${y + 16} Z" fill="${P.red}" stroke="${o}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<circle cx="${cx + w * 0.42}" cy="${y + 18}" r="6" fill="${P.red}" stroke="${o}" stroke-width="2.6"/>`
  );
}

function hat(cx: number, top: number, o: string) {
  return (
    `<g transform="rotate(-8 ${cx} ${top + 20})">` +
    `<circle cx="${cx - 14}" cy="${top + 4}" r="12" fill="#fff" stroke="${o}" stroke-width="2.6"/>` +
    `<circle cx="${cx + 14}" cy="${top + 4}" r="12" fill="#fff" stroke="${o}" stroke-width="2.6"/>` +
    `<circle cx="${cx}" cy="${top - 4}" r="14" fill="#fff" stroke="${o}" stroke-width="2.6"/>` +
    `<path d="M${cx - 20} ${top + 8} q6 5 12 1 M${cx + 8} ${top + 8} q6 5 12 0" stroke="#D5DEEA" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<rect x="${cx - 19}" y="${top + 6}" width="38" height="15" rx="4" fill="#fff" stroke="${o}" stroke-width="2.6"/>` +
    `<rect x="${cx - 16}" y="${top + 14}" width="32" height="4" rx="2" fill="#E3E9F2"/>` +
    `</g>`
  );
}

function spikyPath(cx: number, cy: number, rx: number, ry: number, spikes = 26) {
  let d = "";
  for (let i = 0; i <= spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 1.1 : 0.96;
    d += `${i === 0 ? "M" : "L"}${(cx + Math.cos(a) * rx * r).toFixed(1)} ${(cy + Math.sin(a) * ry * r).toFixed(1)} `;
  }
  return d + "Z";
}

/** Chubby sitting pear: head melts into a round belly, pointy ears, curled tail. */
function sitting(o: string, acc: boolean, mode: EyeMode, opts: { puff?: boolean; mouth?: boolean; tail?: number }) {
  const F = P.fur;
  const tailSwing = opts.tail ?? 0;
  const tail = `<path d="M166 190 Q${206 + tailSwing} 186 ${200 + tailSwing} 146 Q${196 + tailSwing} 124 ${181 + tailSwing} 130" stroke="${F}" stroke-width="15" fill="none" stroke-linecap="round"/>`;
  const body = opts.puff
    ? `<path d="${spikyPath(110, 140, 74, 64)}" fill="${F}"/>` +
      `<path d="M50 96 L44 30 L84 66 Z M170 96 L176 30 L136 66 Z" fill="${F}"/>`
    : `<path d="M110 62 C128 62 138 64 146 68 L168 30 C172 52 174 74 170 96 C186 120 190 160 178 186 Q172 202 150 204 L70 204 Q48 202 42 186 C30 160 34 120 50 96 C46 74 48 52 52 30 L74 68 C82 64 92 62 110 62 Z" fill="${F}"/>`;
  return (
    tail + body +
    `<path d="M60 40 L66 62 M160 40 L154 62" stroke="${P.pink}" stroke-width="3" stroke-linecap="round" opacity=".55"/>` +
    `<ellipse cx="110" cy="162" rx="42" ry="30" fill="${P.furShine}" opacity=".55"/>` +
    `<path d="M90 204 v-16 M130 204 v-16" stroke="${P.furShine}" stroke-width="3" stroke-linecap="round"/>` +
    eye(84, 104, 19, mode, -1) + eye(136, 104, 19, mode, 1) +
    blush(110, 128, 44) + nose(110, 122, opts.mouth) + whiskers(110, 128) +
    (acc ? scarf(110, 146, 58, o) + hat(110, 50, o) : "")
  );
}

/** Loaf / curled-up sleep, like a little black bread. */
function sleeping(o: string, acc: boolean) {
  const F = P.fur;
  return (
    `<path d="M196 178 Q216 150 198 136 Q186 128 182 140" stroke="${F}" stroke-width="13" fill="none" stroke-linecap="round"/>` +
    `<path d="M34 190 C26 160 34 128 60 116 L58 82 L82 104 Q96 98 110 102 L128 80 L128 112 C150 116 196 128 200 170 Q202 194 170 196 L50 196 Q38 196 34 190 Z" fill="${F}"/>` +
    `<ellipse cx="135" cy="168" rx="46" ry="20" fill="${P.furShine}" opacity=".5"/>` +
    eye(76, 140, 12, "closed") + eye(110, 140, 12, "closed") +
    blush(93, 154, 26) + nose(93, 150) + whiskers(93, 154, 0.8) +
    `<text x="150" y="96" font-family="Patrick Hand, cursive" font-size="22" fill="${o}" opacity=".6">z z</text>` +
    (acc ? scarf(93, 166, 36, o) : "")
  );
}

/** Side view, trotting. */
function walking(o: string, acc: boolean, step: number, blink: boolean, stretch = false) {
  const F = P.fur;
  const a = step % 2 === 0 ? 6 : -6;
  const leg = (x: number, d: number) => `<rect x="${x + d}" y="${stretch ? 150 : 146}" width="18" height="42" rx="9" fill="${F}"/>`;
  return (
    `<path d="M50 130 Q16 112 30 70 Q36 58 46 66" stroke="${F}" stroke-width="15" fill="none" stroke-linecap="round"/>` +
    leg(52, -a) + leg(124, a) +
    `<ellipse cx="104" cy="${stretch ? 142 : 134}" rx="66" ry="40" transform="rotate(${stretch ? 10 : 0} 104 134)" fill="${F}"/>` +
    leg(70, a) + leg(140, -a) +
    `<g transform="translate(${stretch ? 10 : 0} ${stretch ? 30 : 0})">` +
    `<path d="M140 96 L136 44 L162 68 Z M200 96 L206 44 L180 68 Z" fill="${F}"/>` +
    `<circle cx="170" cy="96" r="38" fill="${F}"/>` +
    eye(156, 94, 12, blink || stretch ? "closed" : "open", 2) + eye(186, 94, 12, blink || stretch ? "closed" : "open", 2) +
    nose(172, 110) + whiskers(172, 114, 0.7) +
    (acc ? scarf(166, 124, 30, o) : "") +
    `</g>`
  );
}

export function cocoSvg(opts: CocoArtOptions = {}): string {
  P = { ...PALETTE, fur: opts.fur ?? PALETTE.fur, eye: opts.eye ?? PALETTE.eye };
  const o = opts.outline ?? P.navy;
  const acc = opts.accessories ?? true;
  const pose = opts.pose ?? "sit";
  const tail = ((opts.step ?? 0) % 2) * 6;
  let inner: string;
  switch (pose) {
    case "sleep": inner = sleeping(o, acc); break;
    case "walk": inner = walking(o, acc, opts.step ?? 0, !!opts.blink); break;
    case "stretch": inner = walking(o, acc, 0, false, true); break;
    case "puff": inner = sitting(o, false, "narrow", { puff: true, mouth: true }); break;
    case "eat": inner = sitting(o, acc, "happy", { mouth: true, tail }); break;
    case "purr": inner = sitting(o, acc, "closed", { tail }); break;
    case "play": inner = sitting(o, acc, "happy", { tail }); break;
    default: inner = sitting(o, acc, opts.blink ? "closed" : "open", { tail });
  }
  const defs =
    `<defs><radialGradient id="coco-iris" cx="40%" cy="35%" r="70%">` +
    `<stop offset="0" stop-color="#D2FFD4"/><stop offset=".5" stop-color="${P.eye}"/><stop offset="1" stop-color="#1C8A42"/>` +
    `</radialGradient></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 210" role="img" aria-label="Coco the black cat, ${pose}">${defs}${inner}</svg>`;
}
