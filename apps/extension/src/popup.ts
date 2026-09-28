import { cocoSvg } from "@coco/core";
import { loadSettings, saveSettings } from "./settings";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

(async () => {
  const face = $("face");
  face.outerHTML = cocoSvg({ pose: "sit" }).replace("<svg ", '<svg style="width:46px;height:44px" ');
  let s = await loadSettings();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let host = "";
  try { host = tab?.url ? new URL(tab.url).hostname : ""; } catch { /* chrome:// pages */ }
  $("host").textContent = host || "(not a web page)";

  const render = () => {
    ($("enabled") as HTMLInputElement).checked = s.enabled;
    ($("site") as HTMLInputElement).checked = !s.deny.includes(host);
    ($("site") as HTMLInputElement).disabled = !host;
    ($("muted") as HTMLInputElement).checked = s.muted;
    ($("volume") as HTMLInputElement).value = String(s.volume);
    ($("follow") as HTMLInputElement).checked = s.follow;
    ($("comfort") as HTMLInputElement).checked = s.comfort;
    ($("appUrl") as HTMLInputElement).value = s.appUrl;
    $("sleep").textContent = s.sleeping ? "Wake up, Coco ☀️" : "Sleep, Coco 💤";
    document.querySelectorAll<HTMLButtonElement>("#sizes button").forEach((b) => b.classList.toggle("on", +b.dataset.v! === s.size));
  };
  const set = async (p: Partial<typeof s>) => { s = { ...s, ...p }; await saveSettings(p); render(); };
  render();

  $("enabled").onchange = (e) => set({ enabled: (e.target as HTMLInputElement).checked });
  $("site").onchange = (e) => {
    const on = (e.target as HTMLInputElement).checked;
    set({ deny: on ? s.deny.filter((h) => h !== host) : [...new Set([...s.deny, host])] });
  };
  $("muted").onchange = (e) => set({ muted: (e.target as HTMLInputElement).checked });
  $("volume").oninput = (e) => set({ volume: +(e.target as HTMLInputElement).value });
  $("follow").onchange = (e) => set({ follow: (e.target as HTMLInputElement).checked });
  $("comfort").onchange = (e) => set({ comfort: (e.target as HTMLInputElement).checked });
  $("appUrl").onchange = (e) => set({ appUrl: (e.target as HTMLInputElement).value });
  document.querySelectorAll<HTMLButtonElement>("#sizes button").forEach((b) => (b.onclick = () => set({ size: +b.dataset.v! })));
  $("sleep").onclick = () => set({ sleeping: !s.sleeping });
  $("open").onclick = () => chrome.tabs.create({ url: s.appUrl });
})();
