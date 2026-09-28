const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("cocoDesktop", {
  hover: (over) => ipcRenderer.send("hover", over),
  onSettings: (fn) => ipcRenderer.on("settings", (_e, s) => fn(s)),
});
