/**
 * Local-only sadness detection. Nothing here touches the network.
 * Returns a sadness score in [0, 1] from text plus optional typing-rhythm signals.
 */

const SAD_WORDS: Record<string, number> = {
  // English
  sad: 0.5, cry: 0.7, crying: 0.8, cried: 0.6, tears: 0.7, sobbing: 0.9, lonely: 0.7, alone: 0.5,
  miss: 0.5, missing: 0.6, hurt: 0.5, hurts: 0.6, pain: 0.5, broken: 0.7, empty: 0.6, numb: 0.6,
  tired: 0.3, exhausted: 0.4, depressed: 0.8, down: 0.3, upset: 0.5, hopeless: 0.9, worthless: 0.9,
  grief: 0.8, grieving: 0.8, anxious: 0.4, stressed: 0.4, overwhelmed: 0.5, heartbroken: 0.9,
  lost: 0.4, gone: 0.4, wish: 0.3, sorry: 0.3, awful: 0.5, terrible: 0.5, horrible: 0.5, bad: 0.3,
  // Hinglish
  udaas: 0.7, udas: 0.7, dukhi: 0.7, rona: 0.7, ro: 0.4, roya: 0.7, royi: 0.7, "ro raha": 0.8,
  "rona aa raha": 0.9, akela: 0.7, akeli: 0.7, "yaad aa rahi": 0.8, "yaad aata": 0.7, yaad: 0.4,
  pareshan: 0.5, thak: 0.3, "thak gaya": 0.4, "mann nahi": 0.6, "man nahi": 0.6, "dil dukh": 0.9,
  "accha nahi": 0.5, "achha nahi": 0.5, "bura lag": 0.6, tanha: 0.7, bekar: 0.4,
};

const HAPPY_WORDS: Record<string, number> = {
  better: 0.6, okay: 0.3, ok: 0.3, fine: 0.3, good: 0.4, happy: 0.7, thanks: 0.4, "thank you": 0.5,
  love: 0.3, calm: 0.5, relieved: 0.6, haha: 0.5, lol: 0.4, smile: 0.5, laughing: 0.6,
  "theek hu": 0.6, "theek hoon": 0.6, "thik hu": 0.6, accha: 0.3, achha: 0.3, khush: 0.7, mast: 0.5,
  "i'm okay": 0.7, "im okay": 0.7, "feeling better": 0.9,
};

const NEGATORS = ["not", "no", "never", "nahi", "nahin", "na", "don't", "dont"];
const SAD_EMOJI = /[😢😭☹🙁😞😔💔🥺😿😥😓😩😫🥲]|:\(|:'\(|T_T|;_;/gu;
const HAPPY_EMOJI = /[😊😄😁😂🥰😍☺🙂😺😸❤💕]|:\)|:D/gu;

export interface TypingSignals {
  /** Longest pause (ms) between keystrokes in the recent window. */
  longestPauseMs: number;
  /** Fraction of recent keystrokes that were deletions. */
  deleteRatio: number;
}

export interface SentimentResult {
  sadness: number; // 0..1
  positivity: number; // 0..1
  matched: string[];
}

function scanPhrases(text: string, table: Record<string, number>, words: string[]) {
  let score = 0;
  const matched: string[] = [];
  for (const [phrase, weight] of Object.entries(table)) {
    if (phrase.includes(" ")) {
      if (text.includes(phrase)) { score += weight; matched.push(phrase); }
      continue;
    }
    words.forEach((w, i) => {
      if (w !== phrase) return;
      const negated = NEGATORS.includes(words[i - 1] ?? "") || NEGATORS.includes(words[i - 2] ?? "");
      score += negated ? -weight * 0.5 : weight;
      matched.push(negated ? `not ${phrase}` : phrase);
    });
  }
  return { score, matched };
}

export function analyzeText(input: string, typing?: TypingSignals): SentimentResult {
  const text = input.toLowerCase();
  const words = text.replace(/[^\p{L}\p{N}'\s]/gu, " ").split(/\s+/).filter(Boolean);
  const sad = scanPhrases(text, SAD_WORDS, words);
  const happy = scanPhrases(text, HAPPY_WORDS, words);
  const sadEmoji = (input.match(SAD_EMOJI) ?? []).length;
  const happyEmoji = (input.match(HAPPY_EMOJI) ?? []).length;

  let sadness = sad.score + sadEmoji * 0.5;
  if (typing) {
    if (typing.longestPauseMs > 4000) sadness += 0.15;
    if (typing.deleteRatio > 0.3) sadness += 0.2;
  }
  // "I'm okay" words dampen sadness (but a sad sentence with "ok" in it still counts).
  const positivity = Math.min(1, Math.max(0, happy.score + happyEmoji * 0.4));
  sadness = Math.min(1, Math.max(0, sadness - positivity * 0.4));
  return { sadness, positivity, matched: [...sad.matched, ...happy.matched] };
}

/** Tracks keystrokes to produce TypingSignals over a rolling window. */
export class TypingRhythm {
  private events: { t: number; del: boolean }[] = [];
  constructor(private windowSize = 40) {}
  record(isDelete: boolean, now = Date.now()) {
    this.events.push({ t: now, del: isDelete });
    if (this.events.length > this.windowSize) this.events.shift();
  }
  signals(): TypingSignals {
    let longest = 0;
    for (let i = 1; i < this.events.length; i++) {
      longest = Math.max(longest, this.events[i].t - this.events[i - 1].t);
    }
    const dels = this.events.filter((e) => e.del).length;
    return { longestPauseMs: longest, deleteRatio: this.events.length > 8 ? dels / this.events.length : 0 };
  }
  reset() { this.events = []; }
}
