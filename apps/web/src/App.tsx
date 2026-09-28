import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Captions } from "./components/Captions";
import { Coco } from "./components/Coco";
import { SettingsSheet } from "./components/SettingsSheet";
import { TabBar } from "./components/TabBar";
import { DoodleScatter } from "./components/Doodles";
import { coco } from "./lib/audio";
import type { Screen } from "./lib/nav";
import { useSettings } from "./lib/store";
import { Comfort } from "./screens/Comfort";
import { Home } from "./screens/Home";
import { Soon } from "./screens/Soon";

const ORDER: Screen[] = ["home", "comfort", "world", "play", "memories"];

function Splash({ onWake }: { onWake: () => void }) {
  return (
    <motion.button key="splash" onClick={onWake} className="paper absolute inset-0 z-50 flex flex-col items-center justify-center text-center"
      exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.45 } }}>
      <DoodleScatter items={[
        { name: "croissant", x: "12%", y: "18%", size: 34, r: -10 }, { name: "cherry", x: "78%", y: "14%", size: 28 },
        { name: "sparkle", x: "22%", y: "70%", size: 18 }, { name: "cake", x: "74%", y: "72%", size: 30 }, { name: "fish", x: "60%", y: "30%", size: 32 },
      ]} />
      <p className="smallcaps">a cosy little corner</p>
      <h1 className="font-hand text-6xl leading-none text-cherry">Coco's<br /><span className="text-babydeep" style={{ WebkitTextStroke: "1px #2B3A55" }}>Corner</span></h1>
      <Coco pose="sleep" size={190} className="mt-6" />
      <motion.p className="mt-6 font-hand text-2xl" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2.4 }}>
        tap to wake Coco
      </motion.p>
      <p className="smallcaps mt-1">sound on 🔊</p>
    </motion.button>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [dir, setDir] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [awake, setAwake] = useState(() => sessionStorage.getItem("coco:awake") === "1");
  const [settings] = useSettings();
  const scroller = useRef<HTMLDivElement>(null);

  const nav = (s: Screen) => {
    if (s === screen) return;
    setDir(ORDER.indexOf(s) > ORDER.indexOf(screen) ? 1 : -1);
    setScreen(s);
  };
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [screen]);

  const wake = async () => {
    sessionStorage.setItem("coco:awake", "1");
    setAwake(true);
    await coco.unlock();
    coco.meow("tap");
  };

  return (
    <MotionConfig reducedMotion={settings.reducedMotion ? "always" : "user"}>
      <div className={`flex min-h-full items-center justify-center sm:py-6 ${settings.reducedMotion ? "reduce-motion" : ""}`}>
        {/* Phone-shaped container (full screen on phones) */}
        <div className="paper relative flex h-[100dvh] w-full flex-col overflow-hidden sm:h-[844px] sm:max-h-[calc(100dvh-3rem)] sm:w-[400px] sm:rounded-phone sm:border-[3px] sm:border-navy/80 sm:shadow-2xl">
          <header className="relative z-20 flex items-center justify-between px-5 pb-1 pt-[max(env(safe-area-inset-top),12px)]">
            <span className="font-hand text-lg text-navy/80">coco's corner</span>
            <span className="font-hand text-sm text-navy/50">est. with love</span>
          </header>

          <div ref={scroller} className="no-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div key={screen} custom={dir} className="min-h-full"
                variants={{
                  enter: (d: number) => ({ x: d * 60, opacity: 0, filter: "blur(2px)" }),
                  center: { x: 0, opacity: 1, filter: "blur(0px)" },
                  exit: (d: number) => ({ x: d * -60, opacity: 0, filter: "blur(2px)" }),
                }}
                initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 32 }}>
                {screen === "home" && <Home onNav={nav} />}
                {screen === "comfort" && <Comfort />}
                {screen === "world" && <Soon which="world" />}
                {screen === "play" && <Soon which="play" />}
                {screen === "memories" && <Soon which="memories" />}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="pb-[env(safe-area-inset-bottom)]">
            <TabBar current={screen} onNav={nav} onSettings={() => setSettingsOpen(true)} />
          </div>

          <Captions />
          <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
          <AnimatePresence>{!awake && <Splash onWake={wake} />}</AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
