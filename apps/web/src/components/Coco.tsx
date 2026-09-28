import { useEffect, useMemo, useState } from "react";
import { cocoSvg, type CocoPose } from "@coco/core";

interface Props {
  pose?: CocoPose;
  size?: number;
  accessories?: boolean;
  outline?: string;
  bob?: boolean;
  className?: string;
}

/** Coco, drawn from the shared core art. Blinks on his own. */
export function Coco({ pose = "sit", size = 120, accessories = true, outline, bob = true, className = "" }: Props) {
  const [blink, setBlink] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 140);
        loop();
      }, 2500 + Math.random() * 3500);
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (pose !== "walk") return;
    const id = window.setInterval(() => setStep((s) => s + 1), 220);
    return () => clearInterval(id);
  }, [pose]);

  const svg = useMemo(() => cocoSvg({ pose, blink, step, accessories, outline }), [pose, blink, step, accessories, outline]);
  return (
    <div
      className={`${bob && pose !== "walk" ? "coco-bob" : ""} ${className}`}
      style={{ width: size, height: size * (210 / 220) }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
