/** Warm, gentle copy. Coco never "died" here — he's always around. */

export const DAILY_MESSAGES = [
  "Did you eat today? I'm checking. 🐟",
  "I saved you the warm spot on the bed.",
  "Drink some water, hooman. Then feed me.",
  "I'm right here, sitting next to you. Always.",
  "You're doing better than you think. Mrrp.",
  "Snack break? Snack break. I've decided.",
  "I don't like other cats, but I like YOU.",
  "Take a slow breath with me. In… and out.",
  "Proud of you for today, even the small bits.",
  "Coco's always around you. Look, a sunbeam.",
];

export const COMFORT_LINES = [
  "Coco is here with you.",
  "Coco curled up right beside you.",
  "Purr… purr… you're not alone.",
  "Coco's always around you.",
];

export const CHECKIN_QUESTIONS = [
  { q: "Did you eat today?", yes: "Good hooman! Now share with me.", no: "Go eat something, please? For me. 🍙" },
  { q: "Did you drink water?", yes: "Hydrated hooman, happy Coco.", no: "One glass. I'll watch." },
  { q: "Did you sleep okay?", yes: "Nap champions, both of us.", no: "Let's rest a little later, together." },
];

/** Deterministic per-day pick so the message stays the same all day. */
export function dailyPick<T>(list: T[], date = new Date(), salt = 0): T {
  const day = Math.floor(date.getTime() / 86_400_000) - date.getTimezoneOffset() / 1440;
  return list[Math.abs(Math.floor(day) + salt) % list.length];
}
