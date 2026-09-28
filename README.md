# Coco's Corner 🐾

A private, cosy comfort app in memory of Coco: a chubby, jet-black, green-eyed 8-month-old who loved food, hated every other cat, and always sat next to you and purred when you were sad.

Everything runs on the device. There is no login, no backend and no analytics.

## Layout

```
packages/coco-core   shared character art (SVG poses), moods, messages, sentiment, audio engine
apps/web             React + Vite + TS + Tailwind PWA (mobile-first, 390px)
apps/extension       Phase 4: Chrome MV3 desktop pet (uses coco-core)
apps/desktop         Phase 6: Electron always-on-top overlay (uses coco-core)
assets/audio         Coco's real voice
```

## Run

```bash
npm install
npm run dev          # http://localhost:5173 (also on your LAN for phone testing)
npm run build        # production build + service worker in apps/web/dist
```

## Audio

- Any `assets/audio/meow_*.mp3` is picked up automatically. `meow_1.mp3` is Coco's real meow.
- Purr: if `assets/audio/purr.mp3` exists it is used. Otherwise a synthesized cat purr (25 Hz rumble on filtered noise) plays, so it always works offline.
- Audio unlocks on the first tap (the "tap to wake Coco" screen), because browsers block autoplay.

## Privacy

- Sadness detection (`packages/coco-core/src/sentiment.ts`) is keyword, emoji and typing-rhythm based and is **opt-in**.
- Vents are only stored if you press **Keep it**, and then only in this browser's localStorage.
- Voice input uses the browser's Web Speech API. Some browsers (for example Chrome) process speech on their own servers. Typing is always 100% local.
