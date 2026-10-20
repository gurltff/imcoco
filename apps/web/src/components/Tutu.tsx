import { useEffect, useMemo, useState } from "react";
import { tutuSvg } from "@coco/core";

/** Tutu, Coco's little kitten friend. Blinks on his own. */
export function Tutu({ size = 90, pose = "sit", className = "" }: { size?: number; pose?: "sit" | "sleep"; className?: string }) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let t: number;
    const loop = () => { t = window.setTimeout(() => { setBlink(true); window.setTimeout(() => setBlink(false), 150); loop(); }, 2200 + Math.random() * 3000); };
    loop();
    return () => clearTimeout(t);
  }, []);
  const svg = useMemo(() => tutuSvg({ pose, blink }), [pose, blink]);
  return <div aria-hidden className={`coco-bob ${className}`} style={{ width: size, height: size * (210 / 220), animationDelay: ".6s" }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
