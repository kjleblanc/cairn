import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function source(path: string): string {
  return readFileSync(join(process.cwd(), "src", "main", path), "utf8");
}

test("pending recovery is installed before every IPC, bridge, or window boundary", () => {
  const main = source("main.ts");
  const recovery = main.indexOf("installPendingSerialCandidateRecovery(app.getPath(\"userData\"))");
  assert.ok(recovery > main.indexOf("setEvidenceMarkerDir(app.getPath(\"userData\"))"));
  for (const boundary of [
    "registerProjectIpc()",
    "registerConductorIpc()",
    "registerBridgeIpc()",
    "registerTaskIpc(() => mainWindow, criticCalibration)",
    "void startPhoneBridge()",
    "createWindow();",
  ]) {
    const position = main.indexOf(boundary, recovery);
    assert.ok(position > recovery, `${boundary} must follow pending recovery`);
  }
  assert.ok(main.indexOf("bootstrapReady = true", recovery) > recovery);
  assert.match(main, /second-instance[\s\S]*if \(!bootstrapReady\) return;/);
});

test("quit parks exact pending locks while preserving the dark legacy task grace", () => {
  const main = source("main.ts");
  const beforeQuit = main.slice(main.indexOf('app.on("before-quit"'));
  assert.ok(beforeQuit.includes("activePendingSerialCandidates()"));
  assert.ok(beforeQuit.includes("parkPendingSerialCandidatesForRestart()"));
  assert.ok(beforeQuit.indexOf("parkPendingSerialCandidatesForRestart()") < beforeQuit.lastIndexOf("app.quit()"));
  assert.ok(beforeQuit.includes("hasInFlightSend()"), "an approved calibration send must participate in quit gating");
  assert.ok(beforeQuit.includes("criticCalibration.cancelAll()"), "quit must abort an in-flight calibration send");
  assert.ok(beforeQuit.includes("criticCalibration.settled()"), "quit must await calibration's terminal record");
  assert.match(beforeQuit, /if \(runs\.dirs\.length === 0 && pending\.length === 0 && !calibrationInFlight\) return;/u);
  assert.ok(beforeQuit.includes("Promise.race"));
  assert.ok(beforeQuit.includes("8_000"));
  assert.match(beforeQuit, /Promise\.allSettled\(\[runs\.settled\(\), calibrationSettlement\]\)/u);
  assert.match(beforeQuit, /settleThenQuit\(Promise\.allSettled\(\[calibrationSettlement\]\)\)/u);
});

test("an unverifiable pending store gates every project instead of refusing to start", () => {
  const main = source("main.ts");
  const bootstrap = main.slice(main.indexOf("function bootstrap()"));
  const branchStart = bootstrap.indexOf("if (!pendingBoot.journal.ready)");
  assert.ok(branchStart > 0, "boot must still notice an unverifiable journal");
  const branch = bootstrap.slice(branchStart, bootstrap.indexOf("registerProjectIpc()"));
  // A poisoned store already refuses every mutation and gates every project
  // through the globally-unsafe sentinel, so quitting here would turn one
  // drifted journal — in any project — into an app that can never start and
  // offers no seam. The boundary of intent asks for a gated project, not an
  // unstartable Cairn.
  assert.equal(/app\.quit\(\)/u.test(branch), false, "an unsafe journal must not make Cairn unstartable");
  assert.equal(/\breturn\b/u.test(branch), false, "boot must continue to register its gated surfaces");
  assert.ok(bootstrap.indexOf("registerProjectIpc()") > branchStart);
});

test("one project's failed recovery cannot stop the others or the app from booting", () => {
  const pending = source("pendingcandidate.ts");
  const install = pending.slice(pending.indexOf("export function installPendingSerialCandidateRecovery"));
  const body = install.slice(0, install.indexOf("export function persistPendingSerialCandidate"));
  // Core's resume, reconcile, and terminal calls all throw on ordinary I/O
  // trouble — a held report file, a permission change. Unguarded, that escapes
  // bootstrap() and the owner gets no window and no message at all.
  for (const call of [
    "resumeSerialCandidateFromPending",
    "reconcileSerialCandidateTerminalFromPending",
    "executeSerialCandidateTerminal",
  ]) {
    const position = body.indexOf(call);
    assert.ok(position > 0, `${call} must still run during recovery`);
    assert.ok(body.lastIndexOf("try {", position) > body.lastIndexOf("for (const input", position),
      `${call} must run inside the per-run try`);
  }
  assert.equal((body.match(/\} catch \{/gu) ?? []).length, 2, "each recovery loop gates its own run on a throw");
});

test("Q7 remains dark in the production task path and adds no verdict IPC", () => {
  const tasks = source("tasks.ts");
  const ipc = source("ipc.ts");
  assert.equal(tasks.includes("persistPendingSerialCandidate"), false);
  assert.equal(tasks.includes("runSerialTaskToCandidate"), false);
  assert.equal(tasks.includes("resumeSerialCandidateFromPending"), false);
  assert.equal(ipc.includes('ipcMain.handle("verdict:'), false);
  assert.equal(ipc.includes('ipcMain.on("verdict:'), false);
});
