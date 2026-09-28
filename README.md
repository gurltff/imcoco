# Coco's Corner 🐾

A private, cosy comfort app in memory of Coco: a chubby, jet-black, green-eyed 8-month-old who loved food, hated every other cat, and always sat next to you and purred when you were sad.

Everything runs on the device. There is no login, no backend and no analytics.

## Layout

```
packages/coco-core   shared: Coco SVG poses, moods, messages, birthday, sentiment, audio engine, desktop-pet engine
apps/web             React + Vite + TS + Tailwind PWA (mobile-first, 390px)
apps/extension       Chrome MV3 extension: Coco walks on every page (Shadow DOM)
apps/desktop         Electron overlay: Coco floats above all windows (tray: Mute / Sleep / Size / Start on login / Quit)
assets/audio         Coco's real voice
```

## Run

```bash
npm install
npm run dev              # web app on http://localhost:5173 (also on your LAN for phone testing)
npm run build            # builds the extension (and its zip), then the web app into apps/web/dist
```

### Chrome extension
`npm run build:extension`, then open `chrome://extensions`, turn on Developer mode, click **Load unpacked** and choose `apps/extension/dist`.
The same build is zipped to `apps/web/public/coco-extension.zip` so it can be downloaded from the app's Settings.
Set `COCO_APP_URL=<your deployed link>` while building to make "Open Coco's Corner" go there.

### Desktop overlay (Phase 6)
The desktop app is kept out of the npm workspaces so a normal install never downloads Electron.
```bash
cd apps/desktop
npm install
npm start                # run it
npm run package          # unpacked app via electron-builder
```
A Chrome extension can only draw inside browser tabs. The desktop app is a transparent, frameless, always-on-top window that is click-through everywhere except on Coco himself, so he sits above every other app.

## What's inside the web app

- **Home**: daily ribbon message, Coco at his table (tap to pet), mood widget, 4 cards, daily check-in, birthday + letters + hug banners.
- **Comfort**: opt-in, local sadness detection (English + Hinglish, emoji, typing rhythm), voice input, Coco walks over and purrs, hug mode, purr-synced breathing.
- **World** (game style): isometric house and yard, Coco wanders, naps in the sunbeam, chases butterflies, sleeps at night (real clock), "..." attention bubble, stray-cat stare-offs, feeding with loud munching, chonk level, village shop with 12 items, info modal with behaviour stages.
- **Play**: yarn, laser dot and box mini-games that earn fish and yarn.
- **Memories**: photo/video wall (IndexedDB), letters sealed with a paw stamp in Coco's mailbox, birthday cake on 16 November.

## Audio

- Any `assets/audio/meow_*.mp3` is picked up automatically. `meow_1.mp3` is Coco's real meow.
- Purr: if `assets/audio/purr.mp3` exists it is used. Otherwise a synthesized cat purr (25 Hz rumble on filtered noise) plays, so it always works offline.
- Audio unlocks on the first tap (the "tap to wake Coco" screen), because browsers block autoplay.

## Privacy

- Sadness detection (`packages/coco-core/src/sentiment.ts`) is keyword, emoji and typing-rhythm based and is **opt-in**.
- Vents are only stored if you press **Keep it**, and then only in this browser's localStorage.
- Voice input uses the browser's Web Speech API. Some browsers (for example Chrome) process speech on their own servers. Typing is always 100% local.
