import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { setContractPath } from "@cairn/core";
import { setCardMarkerDir } from "./conductor/cardauth.js";
import { registerConductorIpc, registerProjectIpc } from "./ipc.js";
import { beginQuitDrain } from "./rungate.js";
import { activeTaskRuns, registerTaskIpc } from "./tasks.js";

if (started) app.quit();

// Test-only userData isolation. Electron's default profile may contain the
// owner's encrypted conductor connection and remembered projects, so an E2E
// suite must never borrow it. The positive marker prevents an ordinary app
// launch from being redirected by one stray environment variable.
const testUserData = process.env.CAIRN_TEST_USER_DATA;
if (testUserData) {
  if (process.env.CAIRN_E2E !== "1") {
    throw new Error("CAIRN_TEST_USER_DATA requires CAIRN_E2E=1.");
  }
  app.setPath("userData", path.resolve(testUserData));
}

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
  // Result-card authorship markers live beside the stored connection, in the
  // per-user app folder — OUTSIDE every project, where a worker running with
  // `--sandbox workspace-write --cd <project>` cannot write. Set before any
  // IPC is registered: until it is, `readTurns` vouches for no card at all.
  setCardMarkerDir(app.getPath("userData"));
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
let readyToQuit = false;
app.on("before-quit", (event) => {
  if (readyToQuit) return;
  const runs = activeTaskRuns();
  if (runs.dirs.length === 0) return;
  event.preventDefault();
  if (quitting) return; // grace already underway; keep blocking, no second dialog
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
  beginQuitDrain();
  runs.cancelAll();
  const grace = new Promise((resolve) => setTimeout(resolve, 8_000));
  void Promise.race([runs.settled(), grace]).then(() => {
    readyToQuit = true;
    app.quit();
  });
});
