import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { setContractPath } from "@cairn/core";
import { registerConductorIpc, registerProjectIpc } from "./ipc.js";
import { activeTaskRuns, registerTaskIpc } from "./tasks.js";

if (started) app.quit();

let mainWindow: BrowserWindow | null = null;

function contractPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "contract.md")
    : path.join(app.getAppPath(), "resources", "contract.md");
}

export function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: "#fbf7ee",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== "undefined" && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "renderer", "main_window", "index.html"));
  }
  mainWindow = win;
  win.on("closed", () => { mainWindow = null; });
  return win;
}

app.whenReady().then(() => {
  setContractPath(contractPath());
  registerProjectIpc();
  registerConductorIpc();
  registerTaskIpc(() => mainWindow);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

let quitting = false;
app.on("before-quit", (event) => {
  const runs = activeTaskRuns();
  if (quitting || runs.dirs.length === 0) return;
  event.preventDefault();
  const choice = dialog.showMessageBoxSync({
    type: "warning",
    buttons: ["Stop the task and quit", "Keep running"],
    defaultId: 1,
    cancelId: 1,
    message: "A worker task is still running.",
    detail: "Quitting stops the worker safely: Cairn writes honest STOPPED records first. The model call already made is already paid for.",
  });
  if (choice !== 0) return;
  quitting = true;
  runs.cancelAll();
  const grace = new Promise((resolve) => setTimeout(resolve, 8_000));
  void Promise.race([runs.settled(), grace]).then(() => app.quit());
});
