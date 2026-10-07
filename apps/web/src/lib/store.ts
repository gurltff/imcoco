import { useCallback, useEffect, useState } from "react";

const PREFIX = "coco:";
const listeners = new Map<string, Set<(v: unknown) => void>>();

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch { return fallback; }
}

export function writeLocal<T>(key: string, value: T) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* private mode */ }
  listeners.get(key)?.forEach((fn) => fn(value));
}

/** localStorage-backed state shared across components. Everything stays on this device. */
export function useLocal<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readLocal(key, fallback));
  useEffect(() => {
    const set = listeners.get(key) ?? new Set();
    const fn = (v: unknown) => setValue(v as T);
    set.add(fn);
    listeners.set(key, set);
    return () => { set.delete(fn); };
  }, [key]);
  const update = useCallback((next: T | ((prev: T) => T)) => {
    const v = typeof next === "function" ? (next as (p: T) => T)(readLocal(key, fallback)) : next;
    writeLocal(key, v);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return [value, update] as const;
}

export interface Settings {
  muted: boolean;
  volume: number;
  captions: boolean;
  reducedMotion: boolean;
  comfortDetection: boolean;
  /** app colour theme (Coco's world has its own real day/night cycle) */
  theme: "light" | "dark";
}

export const DEFAULT_SETTINGS: Settings = {
  muted: false,
  volume: 0.8,
  captions: true,
  reducedMotion: false,
  comfortDetection: false,
  theme: "light",
};

export function useSettings() {
  const [s, set] = useLocal<Settings>("settings", DEFAULT_SETTINGS);
  const merged = { ...DEFAULT_SETTINGS, ...s };
  if (merged.theme !== "dark") merged.theme = "light"; // older saved values ("auto"/"day") -> light
  return [merged, set] as const;
}
