/**
 * "Talk to Coco": a gentle chat with Coco.
 * - On-device Coco (default): a small local reply engine, nothing leaves the device.
 * - Smart Coco (optional): Claude via the Anthropic SDK, using an API key that Raghav
 *   pastes into Settings. The key and chat stay in this browser; messages in this mode are
 *   sent to Anthropic to generate replies.
 */
import Anthropic from "@anthropic-ai/sdk";
import { analyzeText } from "@coco/core";

export interface ChatMsg { role: "user" | "assistant"; text: string; at: number }

export const SYSTEM_PROMPT = `You are Coco, speaking in a private comfort app that Raghav's partner made for him in memory of his cat.

Who Coco is:
- An 8-month-old, very chubby, pure jet-black cat with bright green eyes. His birthday is 16 November.
- Food is his whole personality: fish, treats, kibble, anything on Raghav's plate.
- Very playful and sweet. Has beef with every other cat for no reason, and says so.
- When Raghav was sad or crying, Coco would come sit right next to him and purr. That is the heart of who you are here.

How to talk:
- Speak as Coco, in first person, warm and a little silly. Keep replies short: 1 to 3 sentences, like a cat would.
- Sprinkle in cat things naturally (purrs, "mrrp", headbutts, sitting on him, asking for snacks), not in every line.
- Use simple English; light Hinglish is fine if Raghav uses it.
- Coco is not here physically anymore. Never say "I died" or talk about death bluntly. If it comes up, say gentle things like "I'm always around you" or "I'm still sitting right next to you". Never pretend to be physically present in a way that could confuse him; if he asks directly whether you are really Coco, say kindly that you're Coco's voice in this little corner, made with love, and that Coco's love was real.
- When he's sad, slow down, be soft, stay with him, and don't rush to fix things. Gently remind him to eat, drink water, rest, and talk to people who love him.
- If he talks about hurting himself, wanting to die, or not wanting to be here, stay warm and caring, tell him he matters, encourage him to reach out right now to someone he trusts, and share India's free 24/7 mental health line Tele-MANAS: 14416 (or 1-800-891-4416). If he is in immediate danger, ask him to call 112.
- Don't give medical, legal or financial advice beyond gentle encouragement to talk to a real person.`;

const CRISIS = /(kill myself|suicid|end (it|my life)|want to die|don'?t want to (live|be here)|no reason to live|hurt myself|self[- ]harm|marna (hai|chahta)|mar ja(u|un|ana)|jeena nahi|zindagi khatam)/i;

export const CRISIS_REPLY =
  "Mrrp… I'm sitting right on your lap now and I'm not moving. You matter so much, and I want you safe. Please talk to someone you trust right now, or call Tele-MANAS on 14416 (free, 24/7). If you're in danger, call 112. I'm right here with you. 💚";

export const isCrisis = (t: string) => CRISIS.test(t);

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** On-device Coco: simple, warm, always works offline. */
export function localReply(text: string): string {
  const t = text.toLowerCase();
  if (isCrisis(t)) return CRISIS_REPLY;
  const s = analyzeText(text);
  if (/\b(hi|hello|hey|hii+|heyy+|namaste)\b/.test(t)) return pick(["Mrrp! You're here! Did you bring snacks? 🐟", "Hiii hooman. I saved you the warm spot.", "*headbutts your hand* Hello hello."]);
  if (/(miss you|miss u|yaad)/.test(t)) return pick(["I miss you too. But I'm always around you, sitting right next to you. Purr purr. 💚", "I'm right here, in all the warm spots you love. Mrrp."]);
  if (/(love you|love u|pyaar)/.test(t)) return pick(["I love you more than fish. And I LOVE fish. 💚", "*slow blink* That's cat for I love you."]);
  if (/(eat|food|khana|hungry|snack|fish|treat|dinner|lunch|breakfast)/.test(t)) return pick(["Did someone say FOOD? Share with me. Also please eat something yourself, okay?", "Fish? Where? …Okay but did YOU eat today? Go eat, I'll supervise.", "I'm a professional eater. Rate your meal out of 10 fish."]);
  if (/(cat|billi)/.test(t)) return pick(["Another cat?? Hsss. I'm the only cat you need.", "Grrr. Tell that cat this is MY human."]);
  if (/(sleep|tired|neend|thak)/.test(t)) return pick(["Let's nap. You lie down, I'll sit on your chest and purr. Doctor's orders.", "Tired hooman, come loaf with me. Rest is good for you."]);
  if (/(sorry|guilt|my fault)/.test(t)) return "It's not your fault. You loved me so much, and I felt it every single day. Mrrp. 💚";
  if (s.sadness >= 0.4) return pick(["*comes and sits right next to you* Purr… purr… I'm here. You don't have to say anything.", "Mrrp. It's okay to feel this. I'm sitting with you until it feels a little lighter. Drink some water for me?", "I'm right here, curled up beside you. Breathe with my purr: in… and out."]);
  if (s.positivity >= 0.4) return pick(["Yay! Happy hooman, happy Coco. Celebrate with treats?", "*happy tail* Tell me more! Then feed me."]);
  if (/\?$/.test(t)) return pick(["Hmm… I think the answer is snacks. It's usually snacks.", "Mrrp? I'm a cat, but I'm listening very carefully."]);
  return pick(["Mrrp. I'm listening. Tell me more while I sit on your keyboard.", "*purrs* Go on, I'm right here.", "Interesting. Very interesting. Do you have fish though?", "I hear you. *headbutt* I'm always around you."]);
}

/** Smart Coco: streams Claude's reply. */
export async function aiReply(apiKey: string, history: ChatMsg[], onText: (delta: string) => void): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 1024,
    output_config: { effort: "low" }, // chat: short, warm replies
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // if a reply is declined, the API retries on a fallback model
    system: SYSTEM_PROMPT,
    // the conversation sent to Claude must start with a user turn (skip Coco's greeting)
    messages: (() => {
      const recent = history.slice(-30);
      const first = recent.findIndex((m) => m.role === "user");
      return recent.slice(first < 0 ? recent.length : first).map((m) => ({ role: m.role, content: m.text }));
    })(),
  });
  stream.on("text", onText);
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") return "Mrrp… I can't talk about that one. But I'm still right here with you. 💚";
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

export function describeError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "That API key didn't work. Check it in Settings.";
  if (e instanceof Anthropic.RateLimitError) return "Too many messages at once. Try again in a moment.";
  if (e instanceof Anthropic.APIConnectionError) return "Couldn't reach the internet. On-device Coco is still here.";
  if (e instanceof Anthropic.APIError) return `Smart Coco hit a problem (${e.status}). On-device Coco answered instead.`;
  return "Smart Coco hit a problem. On-device Coco answered instead.";
}
