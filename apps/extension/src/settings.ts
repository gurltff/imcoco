export interface ExtSettings {
  enabled: boolean;
  muted: boolean;
  volume: number;
  size: number;
  follow: boolean;
  sleeping: boolean;
  comfort: boolean; // opt-in sadness detection, local only
  deny: string[]; // sites where Coco stays away
  appUrl: string;
}

export const DEFAULTS: ExtSettings = {
  enabled: true, muted: false, volume: 0.7, size: 90, follow: true, sleeping: false, comfort: false, deny: [],
  appUrl: "__APP_URL__",
};

export async function loadSettings(): Promise<ExtSettings> {
  const s = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...s } as ExtSettings;
}

export const saveSettings = (p: Partial<ExtSettings>) => chrome.storage.sync.set(p);

export function onSettings(fn: (s: ExtSettings) => void) {
  chrome.storage.onChanged.addListener(async (_c, area) => { if (area === "sync") fn(await loadSettings()); });
}
