import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { type CocoMood, type CocoPose, CHECKIN_QUESTIONS, DAILY_MESSAGES, MOOD_INFO, birthdayInfo, currentMood, dailyPick, ordinal } from "@coco/core";
import { Coco } from "../components/Coco";
import { PixelCoco } from "../game/ui";
import { Doodle, DoodleScatter } from "../components/Doodles";
import { Hearts, type Burst } from "../components/Hearts";
import { coco } from "../lib/audio";
import { useLocal, writeLocal } from "../lib/store";
import type { Screen } from "../lib/nav";

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

function Card({ title, sub, onClick, children, tilt = 0 }: { title: string; sub: string; onClick: () => void; children: ReactNode; tilt?: number }) {
  return (
    <motion.button variants={item} onClick={onClick} whileHover={{ y: -3, rotate: tilt }} whileTap={{ scale: 0.96 }}
      className="sticker flex flex-col items-center px-2 pb-3 pt-2 text-center">
      <div className="grid h-[92px] w-full place-items-center">{children}</div>
      <span className="font-hand text-[22px] leading-none text-cherry">{title}</span>
      <span className="smallcaps mt-1">{sub}</span>
    </motion.button>
  );
}

function TableScene({ onPet, pose, waving }: { onPet: (x: number, y: number) => void; pose: CocoPose; waving: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative mx-auto h-[210px] w-[280px] lg:origin-top lg:scale-125 lg:mb-14">
      <button ref={ref} aria-label="Pet Coco" className="absolute left-1/2 top-0 -translate-x-1/2"
        onClick={(e) => { const r = ref.current!.parentElement!.getBoundingClientRect(); onPet(e.clientX - r.left, e.clientY - r.top); }}>
        {/* says hello when the app opens (happy wiggle), then shows his mood */}
        <motion.div animate={waving ? { rotate: [0, -6, 6, -4, 4, 0], y: [0, -6, 0, -4, 0] } : { rotate: 0, y: 0 }} transition={{ duration: 1.4, ease: "easeInOut" }} style={{ originY: 1 }}>
          <Coco pose={pose} size={150} />
        </motion.div>
        <AnimatePresence>
          {waving && (
            <motion.span initial={{ opacity: 0, y: 6, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
              className="absolute -right-10 top-2 rounded-2xl rounded-bl-sm border-2 border-navy/70 bg-cream px-2 py-0.5 font-hand text-lg text-navy">hi hooman!</motion.span>
          )}
        </AnimatePresence>
      </button>
      {/* the round blue table, drawn over Coco's lower half */}
      <svg viewBox="0 0 280 110" className="pointer-events-none absolute bottom-0 left-0 w-full">
        <ellipse cx="140" cy="60" rx="126" ry="40" fill="#A9C8E3" stroke="#2B3A55" strokeWidth="3" />
        <path d="M30 70 q20 22 60 30 M250 70 q-20 22 -60 30" fill="none" stroke="#2B3A55" strokeWidth="2" strokeLinecap="round" opacity=".35" />
        {/* plate + fish */}
        <ellipse cx="96" cy="58" rx="34" ry="11" fill="#fff" stroke="#2B3A55" strokeWidth="2.5" />
        <path d="M76 55 Q90 44 106 55 Q90 64 76 55Z" fill="#F2C27B" stroke="#2B3A55" strokeWidth="2" />
        <path d="M106 55 l10 -7 v14z" fill="#F2C27B" stroke="#2B3A55" strokeWidth="2" strokeLinejoin="round" />
        {/* cake */}
        <rect x="150" y="34" width="36" height="24" rx="4" fill="#FBF3DC" stroke="#2B3A55" strokeWidth="2.5" />
        <path d="M150 42 q6 5 12 0 q6 5 12 0 q6 5 12 0" fill="none" stroke="#C8323A" strokeWidth="2.5" />
        <circle cx="168" cy="30" r="5" fill="#C8323A" stroke="#2B3A55" strokeWidth="2" />
        {/* cup */}
        <path d="M204 40 h20 v10 a8 8 0 0 1 -8 8 h-4 a8 8 0 0 1 -8 -8z" fill="#fff" stroke="#2B3A55" strokeWidth="2.5" />
        <path d="M224 44 q6 0 5 5 t-6 4" fill="none" stroke="#2B3A55" strokeWidth="2.2" />
      </svg>
    </div>
  );
}

type Period = "morning" | "day" | "evening" | "night";
const periodOf = (h: number): Period => (h >= 5 && h < 11 ? "morning" : h < 17 ? "day" : h < 20 ? "evening" : "night");
const GREETING: Record<Period, string> = {
  morning: "Good morning, sleepyhead ☀️",
  day: "Sunny afternoon · nap o'clock",
  evening: "Golden hour · snack time?",
  night: "Night night · lamp's on 🌙",
};
const MOOD_POSE: Record<CocoMood, CocoPose> = { sleepy: "sleep", hungry: "eat", playful: "play", cuddly: "purr", happy: "sit", grumpy: "sit" };

/** Soft light behind the hero that follows the real time of day. */
function TimeGlow({ period }: { period: Period }) {
  const bg = {
    morning: "radial-gradient(60% 55% at 50% 30%, rgba(255,214,150,.55), transparent 70%)",
    day: "radial-gradient(60% 55% at 50% 30%, rgba(255,240,180,.35), transparent 70%)",
    evening: "radial-gradient(70% 60% at 50% 35%, rgba(255,150,120,.45), rgba(200,120,180,.18) 55%, transparent 75%)",
    night: "radial-gradient(70% 60% at 50% 35%, rgba(120,150,230,.35), transparent 72%)",
  }[period];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-[-1rem] -top-2 h-[300px]" style={{ background: bg }}>
      {period === "night" && (
        <>
          {[[12, 30], [80, 20], [70, 60], [22, 70], [90, 48], [40, 12]].map(([x, y], i) => (
            <motion.span key={i} className="absolute text-[10px] text-sun" style={{ left: `${x}%`, top: `${y}px` }}
              animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 2 + i * 0.4 }}>✦</motion.span>
          ))}
          {/* little floor lamp beside the table */}
          <svg viewBox="0 0 40 120" className="absolute bottom-6 right-[8%] h-28 w-10">
            <defs><radialGradient id="lampglow"><stop offset="0" stopColor="rgba(255,226,140,.9)" /><stop offset="1" stopColor="rgba(255,226,140,0)" /></radialGradient></defs>
            <circle cx="20" cy="26" r="20" fill="url(#lampglow)" />
            <path d="M8 30 L14 12 H26 L32 30 Z" fill="#FFE29A" stroke="#2B3A55" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M20 30 V112 M10 114 H30" stroke="#2B3A55" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </>
      )}
      {period === "morning" && <span className="absolute right-[10%] top-3 text-2xl">☀️</span>}
      {period === "evening" && <span className="absolute right-[10%] top-6 text-2xl">🌇</span>}
    </div>
  );
}

/** Laptop-only summary card that fills the left column: Coco's day at a glance. */
function CocosDay({ checkedIn }: { checkedIn: string | null }) {
  const [lastFed] = useLocal<number | undefined>("lastFedAt", undefined);
  const [game] = useLocal<{ chonk: number; level: number } | null>("game", null);
  const [letters] = useLocal<unknown[]>("letters", []);
  const b = birthdayInfo();
  const fed = lastFed ? Math.round((Date.now() - lastFed) / 3_600_000) : null;
  const rows: [string, string][] = [
    ["🐟", fed === null ? "Hasn't been fed yet today. Feed him in his world!" : fed < 1 ? "Just ate. Very proud of himself." : `Last snack ${fed}h ago. He's hinting.`],
    ["💬", checkedIn ? (checkedIn === "yes" ? "You checked in today. Good hooman." : "Checked in. Go eat something, please?") : "Today's check-in is waiting for you →"],
    ["🧶", game ? `Level ${game.level} · chonk ${game.chonk}/100` : "Hasn't played yet today"],
    ["✉️", letters.length ? `${letters.length} letter${letters.length > 1 ? "s" : ""} in his mailbox` : "His mailbox is empty"],
    ["🎂", b.isToday ? "It's his birthday today!" : `Birthday in ${b.daysLeft} days (16 Nov)`],
  ];
  return (
    <motion.div variants={item} className="sticker relative mt-4 hidden p-4 lg:block">
      <p className="smallcaps">Coco's day</p>
      <p className="font-hand text-2xl leading-tight text-cherry">Today with Coco</p>
      <ul className="mt-2 space-y-2">
        {rows.map(([icon, text]) => (
          <li key={icon} className="flex items-start gap-3 rounded-xl bg-baby/30 px-3 py-2 text-sm"><span className="text-lg leading-none">{icon}</span><span>{text}</span></li>
        ))}
      </ul>
    </motion.div>
  );
}

export function Home({ onNav }: { onNav: (s: Screen) => void }) {
  const [period, setPeriod] = useState(() => periodOf(new Date().getHours()));
  const [waving, setWaving] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setWaving(false), 2200);
    const id = setInterval(() => setPeriod(periodOf(new Date().getHours())), 60_000);
    return () => { clearTimeout(t); clearInterval(id); };
  }, []);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [lastFed] = useLocal<number | undefined>("lastFedAt", undefined);
  const today = new Date().toDateString();
  const [checkin, setCheckin] = useLocal<{ day: string; answer: "yes" | "no" } | null>("checkin", null);
  const question = dailyPick(CHECKIN_QUESTIONS, new Date(), 3);
  const moodKey = currentMood(new Date(), lastFed);
  const mood = MOOD_INFO[moodKey];
  const bday = birthdayInfo();
  const ribbon = bday.isToday ? `It's my ${ordinal(bday.turning)} birthday!! Cake please. 🎂` : dailyPick(DAILY_MESSAGES);
  const answered = checkin?.day === today ? checkin.answer : null;

  const pet = (x: number, y: number) => {
    coco.meow("tap");
    const id = Date.now();
    setBursts((b) => [...b, { id, x, y }]);
    setTimeout(() => setBursts((b) => b.filter((z) => z.id !== id)), 1400);
  };

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } } }}
      className="relative px-4 pb-6 lg:mx-auto lg:max-w-6xl lg:px-10 lg:pb-10">
      <DoodleScatter items={[
        { name: "croissant", x: "6%", y: "140px", size: 30, r: -12 },
        { name: "sparkle", x: "84%", y: "150px", size: 18 },
        { name: "cake", x: "82%", y: "250px", size: 26, r: 8 },
        { name: "cherry", x: "5%", y: "300px", size: 24 },
        { name: "apple", x: "88%", y: "380px", size: 22, r: 10 },
        { name: "sparkle", x: "12%", y: "225px", size: 14 },
        { name: "cup", x: "7%", y: "420px", size: 26 },
      ]} />

      {/* Red ribbon: Coco's daily message */}
      <motion.div variants={item} className="relative -mx-4 mt-1 flex items-center gap-2 bg-cherry px-4 py-2 text-cream shadow-sticker lg:mx-0 lg:mt-6 lg:rounded-2xl lg:py-3">
        <Doodle name="paw" size={18} className="shrink-0 text-cream" />
        <p className="flex-1 font-hand text-[17px] leading-tight">{ribbon}</p>
        <span className="smallcaps !text-cream/80">Coco says</span>
      </motion.div>

      <div className="lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-10">
      <div className="lg:sticky lg:top-6">
      <motion.div variants={item} className="relative mt-3 text-center">
        <TimeGlow period={period} />
        <p className="relative font-hand text-base tracking-wide text-navy/80">{GREETING[period]}</p>
        <Hearts bursts={bursts} />
        <TableScene onPet={(x, y) => { setWaving(false); pet(x, y); }} pose={waving ? "play" : MOOD_POSE[moodKey]} waving={waving} />
        <h1 className="mt-1 font-hand text-[44px] leading-[0.85] text-babydeep" style={{ WebkitTextStroke: "1px rgb(var(--c-navy))" }}>
          coco's <span className="text-cherry">corner</span>
        </h1>
        <p className="smallcaps mt-1">Coco's always around you</p>
      </motion.div>

      {/* Mood widget */}
      <motion.div variants={item} className="sticker relative mt-4 flex items-center gap-3 px-3 py-2">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-baby/60"><Coco pose={MOOD_POSE[moodKey]} size={50} bob={false} /></div>
        <div className="flex-1">
          <p className="smallcaps">Coco's mood right now</p>
          <p className="font-hand text-2xl leading-none">{mood.emoji} {mood.label}</p>
          <p className="text-xs text-navy/70">{mood.line}</p>
        </div>
      </motion.div>
      <CocosDay checkedIn={answered} />

      </div>
      <div>
      <div className="relative mt-4 grid grid-cols-2 gap-3 lg:mt-3 lg:gap-4">
        <Card title="Play with Coco" sub="Play time" onClick={() => onNav("play")} tilt={-1}>
          <div className="relative"><Coco pose="play" size={84} /><Doodle name="yarn" size={30} className="absolute -right-4 bottom-0" /></div>
        </Card>
        <Card title="Vent to Coco" sub="Comfort" onClick={() => onNav("comfort")} tilt={1}>
          <div className="relative"><Coco pose="purr" size={84} /><Doodle name="heart" size={22} className="absolute -right-3 top-0" /></div>
        </Card>
        <Card title="Coco's Home" sub="Little world" onClick={() => onNav("world")} tilt={1}>
          <div className="relative flex items-end">
            <svg viewBox="0 0 60 56" className="h-16 w-16"><path d="M6 26 L30 6 L54 26 V52 H6Z" fill="#FBF3DC" stroke="#2B3A55" strokeWidth="2.5" strokeLinejoin="round" /><path d="M2 28 L30 3 L58 28" fill="none" stroke="#C8323A" strokeWidth="4" strokeLinecap="round" /><rect x="24" y="34" width="12" height="18" rx="2" fill="#A9C8E3" stroke="#2B3A55" strokeWidth="2" /></svg>
            <PixelCoco pose="loaf" scale={2} className="-mb-3 -ml-8 -mt-10" />
          </div>
        </Card>
        <Card title="Memories" sub="Photo wall" onClick={() => { writeLocal("memTab", "album"); onNav("memories"); }} tilt={-1}>
          <div className="rotate-[-6deg] rounded-sm border-2 border-navy/70 bg-white p-1.5 pb-4 shadow-sticker">
            <div className="grid h-14 w-16 place-items-center bg-baby/50"><Coco pose="sit" size={50} bob={false} /></div>
          </div>
        </Card>
      </div>

      {/* Daily check-in on a gingham banner */}
      <motion.div variants={item} className="gingham relative mt-4 overflow-hidden rounded-[1.4rem] border-[2.5px] border-navy/80 p-3 shadow-sticker">
        <div className="flex items-center gap-3 rounded-2xl bg-cream/95 p-3">
          <Coco pose={answered === "yes" ? "eat" : "sit"} size={62} bob={false} />
          <div className="flex-1">
            <p className="smallcaps">Daily check-in</p>
            <p className="font-hand text-2xl leading-tight text-cherry">"{question.q}"</p>
            {answered ? (
              <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 font-hand text-lg">
                {answered === "yes" ? question.yes : question.no}
              </motion.p>
            ) : (
              <div className="mt-2 flex gap-2">
                <button className="pill bg-baby py-1 text-base" onClick={() => { setCheckin({ day: today, answer: "yes" }); coco.meow("food"); }}>Yes!</button>
                <button className="pill bg-white py-1 text-base" onClick={() => { setCheckin({ day: today, answer: "no" }); coco.meow("attention"); }}>Not yet</button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Chat banner */}
      <motion.button variants={item} whileTap={{ scale: 0.98 }} onClick={() => onNav("chat")}
        className="relative mt-4 flex w-full items-center gap-3 rounded-[1.4rem] border-[2.5px] border-navy/80 bg-cream px-4 py-3 text-left shadow-sticker">
        <Coco pose="play" size={60} bob={false} />
        <div className="flex-1">
          <p className="font-hand text-3xl leading-none text-cherry">Talk to Coco</p>
          <p className="smallcaps">Chat · he always replies</p>
        </div>
        <span className="rounded-2xl rounded-bl-sm border-2 border-navy/70 bg-baby px-2 py-1 font-hand text-lg">mrrp?</span>
      </motion.button>

      {/* Birthday banner */}
      <motion.button variants={item} whileTap={{ scale: 0.98 }} onClick={() => { writeLocal("memTab", "birthday"); onNav("memories"); }}
        className="relative mt-4 flex w-full items-center gap-3 overflow-hidden rounded-[1.4rem] border-[2.5px] border-navy/80 bg-baby px-4 py-3 text-left shadow-sticker">
        <Doodle name="cake" size={48} />
        <div className="flex-1">
          <p className="font-hand text-3xl leading-none text-white" style={{ WebkitTextStroke: "1px #2B3A55" }}>BIRTHDAY CAKE</p>
          <p className="smallcaps !text-navy/80">{bday.isToday ? "Today! Light the candle" : `16 Nov · turning ${bday.turning} · ${bday.daysLeft} days`}</p>
        </div>
        <Coco pose="play" size={64} bob={false} />
      </motion.button>

      {/* Letters strip */}
      <motion.button variants={item} whileTap={{ scale: 0.98 }} onClick={() => { writeLocal("memTab", "letters"); onNav("memories"); }}
        className="gingham-red relative mt-4 flex w-full items-center gap-3 rounded-[1.4rem] border-[2.5px] border-navy/80 px-4 py-3 text-left shadow-sticker">
        <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-navy/80 bg-cherry text-cream"><Doodle name="paw" size={22} /></span>
        <div className="flex-1 rounded-xl bg-cream/90 px-2 py-1">
          <p className="font-hand text-2xl leading-none text-cherry">Letters to Coco</p>
          <p className="smallcaps">Write · seal · mailbox</p>
        </div>
      </motion.button>

      {/* Blue banner, like the reference's bottom banner */}
      <motion.button variants={item} whileTap={{ scale: 0.98 }} onClick={() => onNav("comfort")}
        className="relative mt-4 flex w-full items-center gap-3 overflow-hidden rounded-[1.4rem] border-[2.5px] border-navy/80 bg-baby px-4 py-3 text-left shadow-sticker">
        <div className="flex-1">
          <p className="font-hand text-3xl leading-none text-white" style={{ WebkitTextStroke: "1px #2B3A55" }}>HUG COCO</p>
          <p className="smallcaps !text-navy/80">Press & hold · he purrs louder</p>
        </div>
        <Coco pose="purr" size={70} bob={false} />
        <Doodle name="sparkle" size={16} className="absolute right-24 top-2" />
      </motion.button>
      </div>
      </div>
    </motion.div>
  );
}
