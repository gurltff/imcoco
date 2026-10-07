import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { analyzeText } from "@coco/core";
import { Coco } from "../components/Coco";
import { DoodleScatter } from "../components/Doodles";
import { coco } from "../lib/audio";
import { CRISIS_REPLY, aiReply, describeError, isCrisis, localReply, type ChatMsg } from "../lib/cocoChat";
import { useLocal } from "../lib/store";

const HELLO: ChatMsg = { role: "assistant", text: "Mrrp! It's me, Coco. Sit with me and tell me anything. (Snacks also accepted.) 🐟", at: 0 };

export function Chat({ openSettings }: { openSettings: () => void }) {
  const [msgs, setMsgs] = useLocal<ChatMsg[]>("chat", [HELLO]);
  const [apiKey] = useLocal<string>("anthropicKey", "");
  const [smart, setSmart] = useLocal<boolean>("chatSmart", false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [armClear, setArmClear] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const useAI = smart && !!apiKey;

  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => () => coco.stopPurr(1), []);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setText(""); setNote("");
    const history = [...msgs, { role: "user" as const, text: t, at: Date.now() }];
    setMsgs(history);
    // Coco purrs softly when the message sounds sad
    if (analyzeText(t).sadness >= 0.45) { coco.startPurr(0.4, 2); setTimeout(() => coco.stopPurr(3), 9000); }
    setBusy(true);
    const finish = (reply: string) => {
      setMsgs([...history, { role: "assistant", text: reply, at: Date.now() }]);
      setBusy(false);
      coco.meow("mrrp");
    };
    if (isCrisis(t)) { setTimeout(() => finish(CRISIS_REPLY), 600); return; }
    if (!useAI) { setTimeout(() => finish(localReply(t)), 700 + Math.random() * 700); return; }
    let streamed = "";
    const at = Date.now();
    try {
      const reply = await aiReply(apiKey, history, (d) => {
        streamed += d;
        setMsgs([...history, { role: "assistant", text: streamed, at }]);
      });
      finish(reply || streamed);
    } catch (e) {
      setNote(describeError(e));
      finish(localReply(t));
    }
  };

  return (
    <div className="relative flex h-full flex-col px-4 pb-3 pt-1 lg:mx-auto lg:max-w-3xl lg:px-10 lg:pt-8">
      <DoodleScatter items={[{ name: "fish", x: "84%", y: "8px", size: 26 }, { name: "sparkle", x: "6%", y: "18px", size: 14 }]} />
      <div className="relative flex items-end gap-2">
        <Coco pose="purr" size={64} />
        <div className="flex-1">
          <p className="smallcaps">Chat · Coco's always around you</p>
          <h1 className="font-hand text-[34px] leading-none text-cherry">Talk to Coco</h1>
        </div>
      </div>

      {/* Mode switch */}
      <div className="relative mt-2 flex rounded-full border-2 border-navy/70 bg-baby p-1 text-sm" role="tablist" aria-label="Chat mode">
        {([[false, "On-device Coco"], [true, "Smart Coco (AI)"]] as const).map(([v, l]) => (
          <button key={l} role="tab" aria-selected={smart === v} onClick={() => (v && !apiKey ? openSettings() : setSmart(v))}
            className="relative min-h-[40px] flex-1 rounded-full font-hand text-lg">
            {smart === v && <motion.span layoutId="chat-mode" className="absolute inset-0 rounded-full bg-cream" />}
            <span className="relative">{l}</span>
          </button>
        ))}
      </div>
      <p className="mt-1 text-center text-[11px] text-navy/60">
        {useAI ? "Smart mode sends your messages to Anthropic (Claude) to write Coco's replies. Your key and chat stay on this device."
          : smart ? "Add your Claude API key in Settings to wake up Smart Coco." : "Replies are made on this device. Nothing is sent anywhere."}
      </p>

      {/* Messages */}
      <div ref={list} className="no-scrollbar sticker relative mt-2 flex-1 space-y-3 overflow-y-auto bg-white/70 p-3" aria-live="polite">
        {msgs.map((m, i) => (
          <motion.div key={i + m.at} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && <div className="shrink-0"><Coco pose="sit" size={34} bob={false} /></div>}
            <p className={`max-w-[78%] whitespace-pre-wrap rounded-2xl border-2 border-navy/70 px-3 py-2 font-hand text-[19px] leading-snug ${m.role === "user" ? "rounded-br-sm bg-baby" : "rounded-bl-sm bg-cream"}`}>{m.text}</p>
          </motion.div>
        ))}
        <AnimatePresence>
          {busy && msgs[msgs.length - 1]?.role === "user" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 font-hand text-lg text-navy/60">
              <Coco pose="purr" size={34} bob={false} /> Coco is typing with his paws…
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {note && <p className="mt-1 text-center text-xs text-cherry">{note}</p>}

      {/* Composer */}
      <form className="mt-2 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} aria-label="Message Coco" placeholder="Say something to Coco…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          className="max-h-32 min-h-[48px] flex-1 resize-none rounded-2xl border-2 border-navy/70 bg-white px-3 py-2 font-hand text-[19px] focus:outline-none focus:ring-2 focus:ring-cherry/40" />
        <button type="submit" disabled={!text.trim() || busy} className="pill bg-cherry text-cream">Send</button>
      </form>
      <button className="mt-1 self-center text-xs text-navy/60 underline" onClick={() => {
        if (!armClear) { setArmClear(true); setTimeout(() => setArmClear(false), 3000); return; }
        setMsgs([HELLO]); setArmClear(false);
      }}>{armClear ? "Tap again to clear the chat" : "Clear chat"}</button>
    </div>
  );
}
