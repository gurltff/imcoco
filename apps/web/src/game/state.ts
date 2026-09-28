import { useLocal, readLocal, writeLocal } from "../lib/store";

export interface GameState {
  level: number;
  xp: number;
  fish: number;
  yarn: number;
  chonk: number; // 0..100 — rounder, never unhealthy
  owned: string[];
  behaviours: number; // how many stages unlocked (1..4)
  snacks: Record<string, number>;
  wins: number;
  lastKibble: number;
}

export const DEFAULT_GAME: GameState = {
  level: 1, xp: 0, fish: 40, yarn: 20, chonk: 10, owned: [], behaviours: 1, snacks: {}, wins: 0, lastKibble: 0,
};

export const xpToNext = (level: number) => 60 + level * 40;

export const useGame = () => useLocal<GameState>("game", DEFAULT_GAME);

/** Apply a change and handle level-ups. Returns true if levelled up. */
export function updateGame(fn: (g: GameState) => Partial<GameState>): boolean {
  const g = { ...DEFAULT_GAME, ...readLocal<GameState>("game", DEFAULT_GAME) };
  const next = { ...g, ...fn(g) };
  let up = false;
  while (next.xp >= xpToNext(next.level)) { next.xp -= xpToNext(next.level); next.level++; up = true; }
  next.chonk = Math.min(100, Math.max(0, next.chonk));
  writeLocal("game", next);
  return up;
}

export const chonkTitle = (c: number) =>
  c < 20 ? "Chubby" : c < 45 ? "Round" : c < 70 ? "Mega Loaf" : c < 95 ? "Big Floof" : "Absolute Unit";

export interface ShopItem { id: string; name: string; cost: number; cur: "fish" | "yarn"; gx: number; gy: number; blurb: string }

export const SHOP: ShopItem[] = [
  { id: "bed", name: "Cat bed", cost: 30, cur: "fish", gx: 5.6, gy: 1.2, blurb: "He sleeps here at night" },
  { id: "plant", name: "Potted plant", cost: 15, cur: "fish", gx: 0.6, gy: 4.4, blurb: "Not for eating. He will try." },
  { id: "box", name: "Cardboard box", cost: 10, cur: "yarn", gx: 6.4, gy: 5.2, blurb: "The best toy money can buy" },
  { id: "post", name: "Scratch post", cost: 20, cur: "fish", gx: 6.8, gy: 2.6, blurb: "Saves the sofa" },
  { id: "flowers", name: "Flower bed", cost: 25, cur: "fish", gx: 1.4, gy: 6.4, blurb: "Butterflies love it" },
  { id: "tree", name: "Cat tree", cost: 60, cur: "yarn", gx: 4.6, gy: 6.6, blurb: "King of the yard" },
  { id: "lamp", name: "Garden lamp", cost: 40, cur: "fish", gx: 3.2, gy: 4.2, blurb: "Glows at night" },
  { id: "rug", name: "Round rug", cost: 20, cur: "yarn", gx: 5.0, gy: 3.8, blurb: "Warm spot for loafing" },
  { id: "mouse", name: "Toy mouse", cost: 8, cur: "yarn", gx: 3.8, gy: 5.8, blurb: "Squeak squeak" },
  { id: "pond", name: "Fish pond", cost: 80, cur: "fish", gx: 7.0, gy: 7.0, blurb: "He just watches. Hungrily." },
  { id: "bench", name: "Garden bench", cost: 50, cur: "fish", gx: 2.6, gy: 7.4, blurb: "For you to sit with him" },
  { id: "sunflower", name: "Sunflowers", cost: 30, cur: "yarn", gx: 7.4, gy: 4.0, blurb: "Tall and cheerful" },
];

export const FOODS = [
  { id: "kibble", name: "Kibble bowl", cost: 0, cur: "fish" as const, chonk: 2, xp: 4, note: "Free every 30s" },
  { id: "fish", name: "Whole fish", cost: 10, cur: "fish" as const, chonk: 5, xp: 10, note: "His favourite" },
  { id: "treat", name: "Tuna treat", cost: 5, cur: "yarn" as const, chonk: 3, xp: 8, note: "Crunchy!" },
  { id: "cake", name: "Tiny cake", cost: 15, cur: "fish" as const, chonk: 8, xp: 16, note: "Special occasions" },
];

export const BEHAVIOURS = [
  { name: "Sunbeam napping", req: 1, cost: 0, desc: "Finds the warmest spot and melts into it." },
  { name: "Loaf mode", req: 2, cost: 60, desc: "Tucks his paws in and becomes bread." },
  { name: "Food bowl drumming", req: 3, cost: 120, desc: "Paws the empty bowl. Loudly. Meaningfully." },
  { name: "Midnight zoomies", req: 5, cost: 220, desc: "Sprints across the yard at night for no reason." },
];
