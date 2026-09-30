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
import { Memories } from "./screens/Memories";
import { Play } from "./screens/Play";
import { World } from "./screens/World";

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
  const game = screen === "world" || screen === "play";

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
      <div className={`flex min-h-full items-center justify-center sm:py-6 lg:py-0 ${settings.reducedMotion ? "reduce-motion" : ""}`}>
        {/* Phone-shaped container (full screen on phones) */}
        {/* Phone: full screen. Tablet: phone-shaped frame. Laptop (lg+): full window with a sidebar. */}
        <div className="paper relative flex h-[100dvh] w-full flex-col overflow-hidden sm:h-[844px] sm:max-h-[calc(100dvh-3rem)] sm:w-[400px] sm:rounded-phone sm:border-[3px] sm:border-navy/80 sm:shadow-2xl lg:h-[100dvh] lg:max-h-none lg:w-full lg:flex-row lg:rounded-none lg:border-0 lg:shadow-none">
          {!game && <header className="relative z-20 flex items-center lg:hidden justify-between px-5 pb-1 pt-[max(env(safe-area-inset-top),12px)]">
            <span className="font-hand text-lg text-navy/80">coco's corner</span>
            <span className="font-hand text-sm text-navy/50">est. with love</span>
          </header>}

          <div ref={scroller} className={`no-scrollbar relative flex-1 overflow-x-hidden ${game ? "overflow-hidden bg-white" : "overflow-y-auto"}`}>
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div key={screen} custom={dir} className={game ? "h-full" : "min-h-full"}
                variants={{
                  enter: (d: number) => ({ x: d * 60, opacity: 0, filter: "blur(2px)" }),
                  center: { x: 0, opacity: 1, filter: "blur(0px)" },
                  exit: (d: number) => ({ x: d * -60, opacity: 0, filter: "blur(2px)" }),
                }}
                initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 32 }}>
                {screen === "home" && <Home onNav={nav} />}
                {screen === "comfort" && <Comfort />}
                {screen === "world" && <World onNav={nav} />}
                {screen === "play" && <Play onNav={nav} />}
                {screen === "memories" && <Memories />}
              </motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence initial={false}>
            {!game && (
              <motion.div key="tabs" className="pb-[env(safe-area-inset-bottom)] lg:order-first lg:pb-0" initial={{ y: 90 }} animate={{ y: 0 }} exit={{ y: 90, opacity: 0, position: "absolute", bottom: 0, left: 0, right: 0, transition: { duration: 0.2 } }} transition={{ type: "spring", stiffness: 380, damping: 34 }}>
                <TabBar current={screen} onNav={nav} onSettings={() => setSettingsOpen(true)} />
              </motion.div>
            )}
          </AnimatePresence>

          <Captions />
          <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
          <AnimatePresence>{!awake && <Splash onWake={wake} />}</AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
