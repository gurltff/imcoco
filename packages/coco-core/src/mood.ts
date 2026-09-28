export type CocoPose = "sit" | "sleep" | "eat" | "walk" | "puff" | "purr" | "play" | "stretch";

export type CocoMood = "happy" | "sleepy" | "hungry" | "playful" | "cuddly" | "grumpy";

export const MOOD_INFO: Record<CocoMood, { label: string; emoji: string; line: string }> = {
  happy: { label: "Happy", emoji: "😺", line: "Tail up, eyes soft." },
  sleepy: { label: "Sleepy", emoji: "😴", line: "Loaf mode activated." },
  hungry: { label: "Hungry", emoji: "🐟", line: "Staring at the food bowl. Loudly." },
  playful: { label: "Playful", emoji: "🧶", line: "Zoomies imminent." },
  cuddly: { label: "Cuddly", emoji: "💚", line: "Wants to sit next to you." },
  grumpy: { label: "Grumpy", emoji: "😾", line: "Saw another cat. Unacceptable." },
};

/** Mood from real time of day plus a little daily variety. */
export function currentMood(now = new Date(), lastFedAt?: number): CocoMood {
  const h = now.getHours();
  if (h >= 22 || h < 6) return "sleepy";
  if (lastFedAt === undefined || now.getTime() - lastFedAt > 5 * 3600_000) {
    if (h === 8 || h === 13 || h === 19) return "hungry";
  }
  if (h >= 6 && h < 10) return "cuddly";
  if (h >= 16 && h < 19) return "playful";
  const pool: CocoMood[] = ["happy", "playful", "cuddly", "happy", "grumpy"];
  return pool[(now.getDate() + h) % pool.length];
}

export function isNight(now = new Date()) {
  const h = now.getHours();
  return h >= 20 || h < 6;
}
