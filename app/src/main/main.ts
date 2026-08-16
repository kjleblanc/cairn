import { app, BrowserWindow, dialog, Menu, screen } from "electron";
import { lstatSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import started from "electron-squirrel-startup";
import { setContractPath } from "@cairn/core";
import { startPhoneBridge, stopPhoneBridge } from "./bridge/runtime.js";
import { setCardMarkerDir } from "./conductor/cardauth.js";
import { setBuilderReviewMarkerDir } from "./conductor/builderreviewauth.js";
import { setTurnMarkerDir } from "./conductor/turnauth.js";
import { createTask232FakeBuilderTransport, sendTask232FakeBuilderTurn } from "./builderfaketransport.js";
import { appendTask232SyntheticBuilderReview, prepareTask232SyntheticBuilderReview } from "./builderreviewroutefixture.js";
import {
  appendTask233LiveBuilderReview,
  prepareTask233LiveBuilderReview,
} from "./builderlivereviewroutefixture.js";
import { sendTask233ApprovedLiveBuilderTurn } from "./conductor/service.js";
import { setEvidenceMarkerDir } from "./evidence.js";
import { registerBridgeIpc, registerConductorIpc, registerProjectIpc } from "./ipc.js";
import {
  activePendingSerialCandidates,
  installPendingSerialCandidateRecovery,
  installPendingSerialCandidateQ9E2eTerminalPreparedHook,
  parkPendingSerialCandidatesForRestart,
} from "./pendingcandidate.js";
import { beginQuitDrain } from "./rungate.js";
import {
  activeTaskRuns,
  deliverPendingTaskResultCards,
  registerTaskIpc,
  restoreQ9TaskRuns,
  type Q9TaskRuntimeV1,
} from "./tasks.js";
import { createCriticCalibrationOrchestrator } from "./criticcalibration.js";
import { createCriticCalibrationE2eFake } from "./criticcalibrationfake.js";
import {
  createQ9FakeCriticTransport,
  createQ9FakeScenarioDriver,
  createQ9FakeTaskHarness,
  q9ScenarioFromEnvironment,
} from "./q9fake.js";
import { q9TerminalCardInputFromPendingState } from "./qualityloop.js";

if (started) app.quit();

type Task232OwnedDisposableDirectory = Readonly<{ path: string; dev: bigint; ino: bigint }>;
type Task233OwnedDisposableDirectory = Readonly<{ path: string; dev: bigint; ino: bigint }>;

function task232OwnedDisposableDirectory(
  value: unknown,
  kind: "project" | "profile",
): Task232OwnedDisposableDirectory | null {
  try {
    if (typeof value !== "string" || value.length === 0 || value.includes("\0")) return null;
    const lexical = path.resolve(value);
    const real = realpathSync.native(lexical);
    const tempRoot = realpathSync.native(tmpdir());
    const stat = lstatSync(real, { bigint: true });
    const temp = lstatSync(tempRoot, { bigint: true });
    const name = path.basename(real);
    return lexical === real && path.dirname(real) === tempRoot
      && new RegExp(`^cairn-task232-${kind}-[A-Za-z0-9]{6}$`, "u").test(name)
      && stat.isDirectory() && !stat.isSymbolicLink() && stat.dev === temp.dev && stat.ino > 0n
      ? Object.freeze({ path: real, dev: stat.dev, ino: stat.ino })
      : null;
  } catch {
    return null;
  }
}

function task232OwnedDisposableDirectoryStillExact(value: Task232OwnedDisposableDirectory | null): boolean {
  try {
    if (value === null || realpathSync.native(value.path) !== value.path) return false;
    const stat = lstatSync(value.path, { bigint: true });
    return stat.isDirectory() && !stat.isSymbolicLink() && stat.dev === value.dev && stat.ino === value.ino;
  } catch {
    return false;
  }
}

function task233OwnedDisposableDirectory(
  value: unknown,
  kind: "project" | "profile",
): Task233OwnedDisposableDirectory | null {
  try {
    if (typeof value !== "string" || value.length === 0 || value.includes("\0")) return null;
    const lexical = path.resolve(value);
    const real = realpathSync.native(lexical);
    const tempRoot = realpathSync.native(tmpdir());
    const stat = lstatSync(real, { bigint: true });
    const temp = lstatSync(tempRoot, { bigint: true });
    const name = path.basename(real);
    return lexical === real && path.dirname(real) === tempRoot
      && new RegExp("^cairn-task233-" + kind + "-[A-Za-z0-9]{6}$", "u").test(name)
      && stat.isDirectory() && !stat.isSymbolicLink() && stat.dev === temp.dev && stat.ino > 0n
      ? Object.freeze({ path: real, dev: stat.dev, ino: stat.ino })
      : null;
  } catch {
    return null;
  }
}

function task233OwnedDisposableDirectoryStillExact(value: Task233OwnedDisposableDirectory | null): boolean {
  try {
    if (value === null || realpathSync.native(value.path) !== value.path) return false;
    const stat = lstatSync(value.path, { bigint: true });
    return stat.isDirectory() && !stat.isSymbolicLink() && stat.dev === value.dev && stat.ino === value.ino;
  } catch {
    return false;
  }
}

// Retire Task 231's direct producer and admit only Task 232's exact marker.
// Its project and profile must be fresh direct children of the OS temporary
// directory with the exact mkdtemp-owned names used by the guarded proof.
if (process.env.CAIRN_TEST_BUILDER_REVIEW !== undefined) {
  throw new Error("CAIRN_TEST_BUILDER_REVIEW is retired; the Task 232 evidence route requires its exact marker.");
}
const builderReviewE2eRequested = process.env.CAIRN_TEST_BUILDER_TRACKED_TEXT === "task232-fixed-v1";
if (process.env.CAIRN_TEST_BUILDER_TRACKED_TEXT !== undefined && !builderReviewE2eRequested) {
  throw new Error("CAIRN_TEST_BUILDER_TRACKED_TEXT must be exactly task232-fixed-v1 when present.");
}
const task232E2eProjectRoot = builderReviewE2eRequested
  ? task232OwnedDisposableDirectory(process.env.CAIRN_OPEN, "project")
  : null;
const task232E2eProfileRoot = builderReviewE2eRequested
  ? task232OwnedDisposableDirectory(process.env.CAIRN_TEST_USER_DATA, "profile")
  : null;
if (builderReviewE2eRequested && (process.env.CAIRN_E2E !== "1" || process.env.CAIRN_MOCK !== "1"
  || task232E2eProjectRoot === null || task232E2eProfileRoot === null)) {
  throw new Error("Builder review E2E requires its complete isolated fake guard and exact owned disposable project/profile.");
}

const builderLiveE2eRequested =
  process.env.CAIRN_TEST_BUILDER_LIVE === "task233-openrouter-kimi-k2-novita-v1";
if (process.env.CAIRN_TEST_BUILDER_LIVE !== undefined && !builderLiveE2eRequested) {
  throw new Error("CAIRN_TEST_BUILDER_LIVE must be exactly task233-openrouter-kimi-k2-novita-v1 when present.");
}
const task233LivePhase = process.env.CAIRN_TEST_BUILDER_LIVE_PHASE;
if (builderLiveE2eRequested && task233LivePhase !== "call" && task233LivePhase !== "restore") {
  throw new Error("Task 233 live Builder phase must be exactly call or restore.");
}
if (!builderLiveE2eRequested && task233LivePhase !== undefined) {
  throw new Error("CAIRN_TEST_BUILDER_LIVE_PHASE requires the exact Task 233 live marker.");
}
const task233E2eProjectRoot = builderLiveE2eRequested
  ? task233OwnedDisposableDirectory(process.env.CAIRN_OPEN, "project")
  : null;
const task233E2eProfileRoot = builderLiveE2eRequested
  ? task233OwnedDisposableDirectory(process.env.CAIRN_TEST_USER_DATA, "profile")
  : null;
if (builderLiveE2eRequested && (process.env.CAIRN_E2E !== "1" || process.env.CAIRN_MOCK !== "0"
  || task233E2eProjectRoot === null || task233E2eProfileRoot === null)) {
  throw new Error("Task 233 live Builder E2E requires its exact real-call guard and owned disposable project/profile.");
}

// Test-only userData isolation. Electron's default profile may contain the
// owner's encrypted conductor connection and remembered projects, so an E2E
// suite must never borrow it. The positive marker prevents an ordinary app
// launch from being redirected by one stray environment variable.
const testUserData = builderReviewE2eRequested
  ? task232E2eProfileRoot?.path
  : builderLiveE2eRequested
    ? task233E2eProfileRoot?.path
    : process.env.CAIRN_TEST_USER_DATA;
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

const q9E2eRequested = process.env.CAIRN_TEST_Q9 === "1";
if (process.env.CAIRN_TEST_Q9 !== undefined && !q9E2eRequested) {
  throw new Error("CAIRN_TEST_Q9 must be exactly 1 when present.");
}
if (q9E2eRequested && calibrationE2eRequested) {
  throw new Error("Q8 calibration and Q9 task fakes are mutually exclusive boot modes.");
}
if (q9E2eRequested && (process.env.CAIRN_E2E !== "1" || process.env.CAIRN_MOCK !== "1"
  || !testUserData || !process.env.CAIRN_OPEN || q9ScenarioFromEnvironment() === null)) {
  throw new Error("Q9 E2E requires the complete isolated fake guard and one closed preregistered scenario.");
}

// Task 232's only producer is one exact, one-shot Main hook for the validated
// disposable-Git Electron proof. Ordinary launches have no selector IPC,
// renderer control, or direct Task 231 producer.
if ((builderReviewE2eRequested || builderLiveE2eRequested)
  && (q9E2eRequested || calibrationE2eRequested)) {
  throw new Error("Builder review, live Builder, Q8 calibration, and Q9 task modes are mutually exclusive.");
}
if (builderReviewE2eRequested && builderLiveE2eRequested) {
  throw new Error("Task 232 fake and Task 233 live Builder modes are mutually exclusive.");
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
  // Task 233's call phase is the one guarded E2E run the owner must see and
  // control personally to enter the credential through Cairn's official UI.
  // Its cold-restore phase parks offscreen like every other automated run.
  const e2e = process.env.CAIRN_E2E === "1"
    && !(builderLiveE2eRequested && task233LivePhase === "call");
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({
    width: 1320,
    height: 820,
    minWidth: 760,
    minHeight: 620,
    titleBarStyle: "hidden",
    titleBarOverlay: true,
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
  let q9Runtime: Q9TaskRuntimeV1 | null = null;

  app.whenReady().then(() => {
    setContractPath(contractPath());
    // Result-card authorship markers live beside the stored connection, in the
    // per-user app folder — OUTSIDE every project, where a worker running with
    // `--sandbox workspace-write --cd <project>` cannot write. Set before any
    // IPC is registered: until it is, `readTurns` vouches for no card at all.
    setCardMarkerDir(app.getPath("userData"));
    // Builder reviews use their own versioned marker domain and container.
    // Configure it before the guarded fixture or any conversation read.
    setBuilderReviewMarkerDir(app.getPath("userData"));
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
    const pendingBoot = installPendingSerialCandidateRecovery(app.getPath("userData"), {
      terminalCardForResult: ({ result, state }) => q9TerminalCardInputFromPendingState(result, state),
    });
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
    registerProjectIpc({
      suppressExternalUpdateCheck: q9E2eRequested || builderReviewE2eRequested || builderLiveE2eRequested,
      suppressExternalOpen: builderLiveE2eRequested,
    });
    registerConductorIpc({ suppressOAuth: builderLiveE2eRequested });
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
    if (q9E2eRequested) {
      const driver = createQ9FakeScenarioDriver({ profileRoot: app.getPath("userData") });
      const harness = driver ? createQ9FakeTaskHarness({
        projectRoot: process.env.CAIRN_OPEN as string,
        profileRoot: app.getPath("userData"),
        scenarioDriver: driver,
      }) : null;
      if (!driver || !harness) throw new Error("Q9_E2E_RUNTIME_REFUSED");
      q9Runtime = Object.freeze({
        harness,
        criticTransport: createQ9FakeCriticTransport({ driver }),
        onCutPoint(point: Parameters<NonNullable<Q9TaskRuntimeV1["onCutPoint"]>>[0]) {
          const selected = driver.shouldCut(point);
          if (selected) process.exit(86);
          return selected;
        },
      });
      installPendingSerialCandidateQ9E2eTerminalPreparedHook(() => {
        const selected = driver.shouldCut("after-terminal-prepare");
        if (selected) process.exit(86);
        return selected;
      });
    }
    registerTaskIpc(() => mainWindow, criticCalibration, q9Runtime);
    restoreQ9TaskRuns(q9Runtime, () => mainWindow);
    if (builderReviewE2eRequested) {
      let used = false;
      const projectRoot = (task232E2eProjectRoot as Task232OwnedDisposableDirectory).path;
      (globalThis as typeof globalThis & {
        __CAIRN_TASK232_APPEND_BUILDER_REVIEW__?: () => Promise<Readonly<{ conversationId: string; displayTurnId: string }>>;
      }).__CAIRN_TASK232_APPEND_BUILDER_REVIEW__ = async () => {
        if (used) throw new Error("TASK232_FIXTURE_ALREADY_USED");
        if (mainWindow === null || mainWindow.isDestroyed()) throw new Error("TASK232_FIXTURE_WINDOW_UNAVAILABLE");
        used = true;
        if (!task232OwnedDisposableDirectoryStillExact(task232E2eProjectRoot)
          || !task232OwnedDisposableDirectoryStillExact(task232E2eProfileRoot)) {
          throw new Error("TASK232_FIXTURE_OWNERSHIP_CHANGED");
        }
        const selection = prepareTask232SyntheticBuilderReview(projectRoot);
        const transport = createTask232FakeBuilderTransport(selection.context);
        if (transport === null) throw new Error("TASK232_FAKE_TRANSPORT_REFUSED");
        const answer = await sendTask232FakeBuilderTurn(transport, selection.context);
        if (answer === null) throw new Error("TASK232_FAKE_TRANSPORT_REFUSED");
        if (!task232OwnedDisposableDirectoryStillExact(task232E2eProjectRoot)
          || !task232OwnedDisposableDirectoryStillExact(task232E2eProfileRoot)) {
          throw new Error("TASK232_FIXTURE_OWNERSHIP_CHANGED");
        }
        const appended = appendTask232SyntheticBuilderReview(projectRoot, selection, transport, answer);
        mainWindow.webContents.send("conductor:delta", {
          dir: projectRoot,
          conversationId: appended.conversationId,
          kind: "turn",
          turn: appended.turn,
        });
        return Object.freeze({
          conversationId: appended.conversationId,
          displayTurnId: appended.turn.displayTurnId,
        });
      };
    }
    if (builderLiveE2eRequested && task233LivePhase === "call") {
      let used = false;
      const projectRoot = (task233E2eProjectRoot as Task233OwnedDisposableDirectory).path;
      (globalThis as typeof globalThis & {
        __CAIRN_TASK233_RUN_APPROVED_LIVE_BUILDER__?: () => Promise<
          | Readonly<{
              ok: true;
              conversationId: string;
              displayTurnId: string;
              receipt: import("./builderlivetransport.js").Task233LiveBuilderReceiptV1;
            }>
          | Readonly<{
              ok: false;
              failure: import("./builderlivetransport.js").Task233LiveBuilderFailureV1;
            }>
        >;
      }).__CAIRN_TASK233_RUN_APPROVED_LIVE_BUILDER__ = async () => {
        if (used) throw new Error("TASK233_LIVE_FIXTURE_ALREADY_USED");
        if (mainWindow === null || mainWindow.isDestroyed()) {
          throw new Error("TASK233_LIVE_FIXTURE_WINDOW_UNAVAILABLE");
        }
        used = true;
        if (!task233OwnedDisposableDirectoryStillExact(task233E2eProjectRoot)
          || !task233OwnedDisposableDirectoryStillExact(task233E2eProfileRoot)) {
          throw new Error("TASK233_LIVE_FIXTURE_OWNERSHIP_CHANGED");
        }
        const prepared = prepareTask233LiveBuilderReview(projectRoot);
        const call = await sendTask233ApprovedLiveBuilderTurn(
          projectRoot,
          prepared.transport,
          prepared.selection.context,
        );
        if (!call.ok) return Object.freeze({ ok: false as const, failure: call.failure });
        if (!task233OwnedDisposableDirectoryStillExact(task233E2eProjectRoot)
          || !task233OwnedDisposableDirectoryStillExact(task233E2eProfileRoot)) {
          throw new Error("TASK233_LIVE_FIXTURE_OWNERSHIP_CHANGED");
        }
        const appended = appendTask233LiveBuilderReview(projectRoot, prepared, call.answer);
        mainWindow.webContents.send("conductor:delta", {
          dir: projectRoot,
          conversationId: appended.conversationId,
          kind: "turn",
          turn: appended.turn,
        });
        return Object.freeze({
          ok: true as const,
          conversationId: appended.conversationId,
          displayTurnId: appended.turn.displayTurnId,
          receipt: call.answer.receipt,
        });
      };
    }
    // The phone bridge (Task 143): one LAN listener serving the owner's
    // paired phone. It starts with the normal app and stops at quit; if it
    // cannot start (no home-network address, ports in use) the settings
    // surface says so honestly and the rest of the app is unaffected.
    // Guarded Q9 is a strictly local evidence fixture: it must neither open a
    // LAN listener nor create/update the bridge device store in its isolated
    // profile. Registration remains inert; only the stateful runtime is dark.
    if (!q9E2eRequested && !builderReviewE2eRequested && !builderLiveE2eRequested) {
      void startPhoneBridge();
    }
    createWindow();
    deliverPendingTaskResultCards(() => mainWindow);
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

    // Approval and owner-review waits have no process or transport in flight.
    // Drop only their process-local cards, then park the authenticated Core
    // candidate so relaunch can reconstruct fresh one-use actions. Do not turn
    // a harmless window close into an owner cancellation or consume a cap.
    if (runs.allParkable && !calibrationInFlight) {
      quitting = true;
      if (!runs.suspendAllForRestart()) {
        quitting = false;
        dialog.showErrorBox(
          "Cairn kept the app open",
          "The waiting task changed while Cairn was preparing to restart. Nothing was cancelled or sent.",
        );
        return;
      }
      parkAndQuit();
      return;
    }

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
