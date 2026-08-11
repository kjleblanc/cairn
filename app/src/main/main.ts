import { app, BrowserWindow, dialog, screen } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { setContractPath } from "@cairn/core";
import { startPhoneBridge, stopPhoneBridge } from "./bridge/runtime.js";
import { setCardMarkerDir } from "./conductor/cardauth.js";
import { setTurnMarkerDir } from "./conductor/turnauth.js";
import { setEvidenceMarkerDir } from "./evidence.js";
import { registerBridgeIpc, registerConductorIpc, registerProjectIpc } from "./ipc.js";
import {
  activePendingSerialCandidates,
  installPendingSerialCandidateRecovery,
  parkPendingSerialCandidatesForRestart,
} from "./pendingcandidate.js";
import { beginQuitDrain } from "./rungate.js";
import { activeTaskRuns, registerTaskIpc } from "./tasks.js";
import { createCriticCalibrationOrchestrator } from "./criticcalibration.js";
import { createCriticCalibrationE2eFake } from "./criticcalibrationfake.js";

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

// Q8's only desktop entrance is a positively marked fake inside an isolated
// Playwright profile. A partial or stray marker fails at boot rather than
// creating a store in the owner's profile or installing a transport in normal
// production. Q10 must add live calibration separately; it may not reuse this.
const calibrationE2eRequested = process.env.CAIRN_TEST_CRITIC_CALIBRATION === "1";
const calibrationE2eMode = process.env.CAIRN_TEST_CRITIC_CALIBRATION_MODE ?? "respond";
if (process.env.CAIRN_TEST_CRITIC_CALIBRATION !== undefined && !calibrationE2eRequested) {
  throw new Error("CAIRN_TEST_CRITIC_CALIBRATION must be exactly 1 when present.");
}
if (calibrationE2eRequested && (process.env.CAIRN_E2E !== "1" || process.env.CAIRN_MOCK !== "1"
  || !testUserData || !process.env.CAIRN_OPEN)) {
  throw new Error("Critic calibration E2E requires CAIRN_E2E=1, CAIRN_MOCK=1, CAIRN_TEST_USER_DATA, and CAIRN_OPEN.");
}
if (calibrationE2eRequested && calibrationE2eMode !== "respond" && calibrationE2eMode !== "hold") {
  throw new Error("CAIRN_TEST_CRITIC_CALIBRATION_MODE must be respond or hold.");
}

let mainWindow: BrowserWindow | null = null;
let quitting = false;
let readyToQuit = false;
let bootstrapReady = false;

function contractPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "contract.md")
    : path.join(app.getAppPath(), "resources", "contract.md");
}

// Where an E2E window goes: past the far corner of every connected display,
// unfocusable and out of the taskbar and alt-tab, so the owner's screen and
// focus are never touched. The window still renders normally, so the suite
// runs at full speed.
function offScreenParking(): { x: number; y: number; focusable: boolean; skipTaskbar: boolean } {
  const far =
    Math.max(0, ...screen.getAllDisplays().map((d) => Math.max(d.bounds.x + d.bounds.width, d.bounds.y + d.bounds.height))) + 2000;
  return { x: far, y: far, focusable: false, skipTaskbar: true };
}

export function createWindow(): BrowserWindow {
  // E2E launches park their window OFF every display instead of showing it
  // (Task 154). A suite run launches the real app dozens of times, and every
  // normally-shown window pops onto the owner's screen and steals focus.
  // `show: false` was tried first and is NOT viable: a hidden page gets
  // almost no animation frames (measured 3 rAF in 2 s; timers run fine) and
  // Playwright's waits poll on rAF, so every interaction crawls and
  // timing-sensitive specs (the live-reply reattach) fail deterministically.
  // backgroundThrottling stays off so the app's polling timers are never
  // starved if the parked window counts as occluded. Keyed on CAIRN_E2E (the
  // same gate as CAIRN_TEST_USER_DATA above, set only by the suite's
  // isolated-profile fixture) so no ordinary launch can be parked by a stray
  // variable.
  const e2e = process.env.CAIRN_E2E === "1";
  const win = new BrowserWindow({
    width: 1320,
    height: 820,
    minWidth: 760,
    minHeight: 620,
    backgroundColor: "#fbf7ee",
    ...(e2e ? offScreenParking() : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      ...(e2e ? { backgroundThrottling: false } : {}),
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

// One Cairn at a time. A second launch — a double-clicked shortcut, a stray
// `npm start` — must not become a second app sharing one profile: every
// stored file under `userData` (the conductor connection, remembered
// projects, logs, result-card markers) is written by exactly one main
// process, and nothing here is built for two. The lock therefore GATES
// bootstrap: the loser quits without a window, an IPC handler, or a write to
// the shared profile; the winner's window comes to the front.
//
// Test launches NEVER take this lock. Every E2E spec sets CAIRN_MOCK (both
// the "1" mock lane and the "0" real-call lane), so the guard keys on the
// marker's presence, not its value: a test app that silently quit because the
// owner happened to have Cairn open would fail in a way no assertion could
// explain.
if (process.env.CAIRN_MOCK === undefined) {
  const gotSingleInstanceLock = app.requestSingleInstanceLock();
  if (!gotSingleInstanceLock) {
    app.quit();
  } else {
    app.on("second-instance", () => {
      if (!bootstrapReady) return;
      if (mainWindow === null) {
        createWindow();
      } else {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
    bootstrap();
  }
} else {
  bootstrap();
}

function bootstrap(): void {
  // The calibration service exists only in the guarded E2E process, but an
  // approved send still owns an asynchronous transport and a durable
  // `sending` record. Keep the instance where the quit handler can drain that
  // work; an unapproved card deliberately remains memory-only across close.
  let criticCalibration: ReturnType<typeof createCriticCalibrationOrchestrator> | null = null;

  app.whenReady().then(() => {
    setContractPath(contractPath());
    // Result-card authorship markers live beside the stored connection, in the
    // per-user app folder — OUTSIDE every project, where a worker running with
    // `--sandbox workspace-write --cd <project>` cannot write. Set before any
    // IPC is registered: until it is, `readTurns` vouches for no card at all.
    setCardMarkerDir(app.getPath("userData"));
    // Owner-turn custody uses its own marker namespace at the same demonstrated
    // out-of-project boundary. Configure it before conductor IPC can send.
    setTurnMarkerDir(app.getPath("userData"));
    // Trusted pictures use the same write boundary as card markers, but each
    // run owns a separate bounded record and its own PNG files.
    setEvidenceMarkerDir(app.getPath("userData"));
    // Pending-run custody is synchronous by design: validate every journal,
    // install every project gate, and reacquire exact Core locks before even
    // one task/evidence/push IPC handler can exist. An unsafe profile stays
    // entirely dark rather than catching the error and continuing.
    const pendingBoot = installPendingSerialCandidateRecovery(app.getPath("userData"));
    if (!pendingBoot.journal.ready) {
      // An unverifiable store is already fail-closed on its own terms: every
      // journal mutation refuses, no authority can be minted, and every
      // project's gate reads recovery-required. Quitting here would add
      // nothing to that and take away everything else — one drifted journal in
      // one project would leave Cairn permanently unable to start, for every
      // project, with no way back from inside the app. Say so plainly and open
      // gated instead, which is what this message already describes.
      dialog.showErrorBox(
        "Cairn could not verify pending work",
        "Cairn kept task, evidence, push, and verdict actions closed because its pending-run journal is missing, changed, or unsafe.",
      );
    }
    bootstrapReady = true;
    registerProjectIpc();
    registerConductorIpc();
    registerBridgeIpc();
    criticCalibration = calibrationE2eRequested
      ? createCriticCalibrationOrchestrator({
          profileRoot: app.getPath("userData"),
          projectRoot: process.env.CAIRN_OPEN as string,
          transport: createCriticCalibrationE2eFake({
            profileRoot: app.getPath("userData"),
            holdUntilCancelled: calibrationE2eMode === "hold",
          }),
        })
      : null;
    registerTaskIpc(() => mainWindow, criticCalibration);
    // The phone bridge (Task 143): one LAN listener serving the owner's
    // paired phone. It starts with the app and stops at quit; if it cannot
    // start (no home-network address, ports in use) the settings surface
    // says so honestly and the rest of the app is unaffected.
    void startPhoneBridge();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("will-quit", () => {
    void stopPhoneBridge();
  });

  app.on("before-quit", (event) => {
    if (readyToQuit) return;
    const runs = activeTaskRuns();
    const pending = activePendingSerialCandidates();
    const calibrationInFlight = criticCalibration?.hasInFlightSend() === true;
    if (runs.dirs.length === 0 && pending.length === 0 && !calibrationInFlight) return;
    event.preventDefault();
    if (quitting) return; // grace already underway; keep blocking, no second dialog
    const parkAndQuit = (): void => {
      const parked = parkPendingSerialCandidatesForRestart();
      if (parked.failed > 0) {
        quitting = false;
        dialog.showErrorBox(
          "Cairn kept the app open",
          "The pending result could not be matched to its authenticated journal. Cairn left the project gated and did not claim a terminal result.",
        );
        return;
      }
      readyToQuit = true;
      app.quit();
    };

    const drainCalibration = (): Promise<void> | null => {
      if (!calibrationInFlight || criticCalibration === null) return null;
      criticCalibration.cancelAll();
      return criticCalibration.settled();
    };
    const settleThenQuit = (settlement: Promise<unknown>): void => {
      const grace = new Promise((resolve) => setTimeout(resolve, 8_000));
      void Promise.race([settlement, grace]).then(parkAndQuit);
    };

    if (runs.dirs.length === 0) {
      quitting = true;
      const calibrationSettlement = drainCalibration();
      if (calibrationSettlement === null) {
        parkAndQuit();
      } else {
        beginQuitDrain();
        settleThenQuit(Promise.allSettled([calibrationSettlement]));
      }
      return;
    }
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
    const calibrationSettlement = drainCalibration();
    // Candidate routing remains production-dark in Q7, so an active task here
    // is still the legacy one-call path. Preserve its established grace
    // behavior byte-for-byte; an already-journaled candidate was handled by
    // parkAndQuit above, and Q10 must replace this grace when it activates a
    // Builder that can race into pending-candidate state.
    const settlement = calibrationSettlement === null
      ? runs.settled()
      : Promise.allSettled([runs.settled(), calibrationSettlement]);
    settleThenQuit(settlement);
  });
}
