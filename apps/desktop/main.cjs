// Coco desktop overlay: a transparent, frameless, always-on-top, click-through window.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");

const settingsFile = () => path.join(app.getPath("userData"), "coco.json");
const defaults = { muted: false, sleeping: false, size: 96, volume: 0.7 };
let settings = { ...defaults };
try { settings = { ...defaults, ...JSON.parse(fs.readFileSync(settingsFile(), "utf8")) }; } catch {}
const save = () => { try { fs.writeFileSync(settingsFile(), JSON.stringify(settings)); } catch {} };

let win, tray;

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    x: workArea.x, y: workArea.y, width: workArea.width, height: workArea.height,
    transparent: true, frame: false, resizable: false, movable: false, hasShadow: false,
    skipTaskbar: true, focusable: false, alwaysOnTop: true, backgroundColor: "#00000000",
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Click-through everywhere except Coco (renderer tells us when the pointer is over him).
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile("index.html");
  win.webContents.on("did-finish-load", () => win.webContents.send("settings", settings));
}

function refreshTray() {
  const login = app.getLoginItemSettings().openAtLogin;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Coco 🐾", enabled: false },
    { type: "separator" },
    { label: "Mute", type: "checkbox", checked: settings.muted, click: (i) => update({ muted: i.checked }) },
    { label: "Sleep", type: "checkbox", checked: settings.sleeping, click: (i) => update({ sleeping: i.checked }) },
    { label: "Size", submenu: [["Small", 70], ["Medium", 96], ["Large", 130]].map(([l, v]) => ({ label: l, type: "radio", checked: settings.size === v, click: () => update({ size: v }) })) },
    { label: "Start on login", type: "checkbox", checked: login, click: (i) => { app.setLoginItemSettings({ openAtLogin: i.checked }); refreshTray(); } },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]));
}

function update(p) {
  settings = { ...settings, ...p };
  save();
  win?.webContents.send("settings", settings);
  refreshTray();
}

ipcMain.on("hover", (_e, over) => win?.setIgnoreMouseEvents(!over, { forward: true }));

app.whenReady().then(() => {
  if (process.platform === "darwin") app.dock?.hide();
  createWindow();
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "tray.png")).resize({ width: 18, height: 18 }));
  tray.setToolTip("Coco");
  refreshTray();
  screen.on("display-metrics-changed", () => { const { workArea } = screen.getPrimaryDisplay(); win?.setBounds(workArea); });
});

app.on("window-all-closed", (e) => e.preventDefault());
