import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function source(path: string): string {
  return readFileSync(join(process.cwd(), "src", "main", path), "utf8");
}

test("pending recovery is installed before every IPC, bridge, or window boundary", () => {
  const main = source("main.ts");
  const recovery = main.indexOf("installPendingSerialCandidateRecovery(app.getPath(\"userData\"), {");
  assert.ok(recovery > main.indexOf("setEvidenceMarkerDir(app.getPath(\"userData\"))"));
  for (const boundary of [
    "registerProjectIpc({",
    "registerConductorIpc({ suppressOAuth: builderLiveE2eRequested })",
    "registerBridgeIpc()",
    "registerTaskIpc(() => mainWindow, criticCalibration, q9Runtime)",
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
  assert.match(beforeQuit, /if \(runs\.allParkable && !calibrationInFlight\)/u,
    "an approval-only Q9 wait may restart without becoming a cancellation");
  assert.ok(beforeQuit.includes("runs.suspendAllForRestart()"));
  const parkableBranch = beforeQuit.slice(beforeQuit.indexOf("if (runs.allParkable"), beforeQuit.indexOf("if (runs.dirs.length === 0)"));
  assert.ok(parkableBranch.indexOf("runs.suspendAllForRestart()") < parkableBranch.indexOf("parkAndQuit()"));
  assert.match(beforeQuit, /Promise\.allSettled\(\[runs\.settled\(\), calibrationSettlement\]\)/u);
  assert.match(beforeQuit, /settleThenQuit\(Promise\.allSettled\(\[calibrationSettlement\]\)\)/u);
});

test("an unverifiable pending store gates every project instead of refusing to start", () => {
  const main = source("main.ts");
  const bootstrap = main.slice(main.indexOf("function bootstrap()"));
  const branchStart = bootstrap.indexOf("if (!pendingBoot.journal.ready)");
  assert.ok(branchStart > 0, "boot must still notice an unverifiable journal");
  const projectIpc = "registerProjectIpc({";
  const branch = bootstrap.slice(branchStart, bootstrap.indexOf(projectIpc));
  // A poisoned store already refuses every mutation and gates every project
  // through the globally-unsafe sentinel, so quitting here would turn one
  // drifted journal — in any project — into an app that can never start and
  // offers no seam. The boundary of intent asks for a gated project, not an
  // unstartable Cairn.
  assert.equal(/app\.quit\(\)/u.test(branch), false, "an unsafe journal must not make Cairn unstartable");
  assert.equal(/\breturn\b/u.test(branch), false, "boot must continue to register its gated surfaces");
  assert.ok(bootstrap.indexOf(projectIpc) > branchStart);
});

test("one project's failed recovery cannot stop the others or the app from booting", () => {
  const pending = source("pendingcandidate.ts");
  const install = pending.slice(pending.indexOf("export function installPendingSerialCandidateRecovery"));
  const body = install.slice(0, install.indexOf("export function persistPendingSerialCandidate"));
  // Core's resume, reconcile, and terminal calls all throw on ordinary I/O
  // trouble — a held report file, a permission change. Unguarded, that escapes
  // bootstrap() and the owner gets no window and no message at all.
  for (const call of [
    "resumeSerialCandidateFromAuthenticatedPending",
    "reconcileSerialCandidateTerminalFromAuthenticatedPending",
    "executeSerialCandidateTerminal",
  ]) {
    const position = body.indexOf(call);
    assert.ok(position > 0, `${call} must still run during recovery`);
    assert.ok(body.lastIndexOf("try {", position) > body.lastIndexOf("for (const input", position),
      `${call} must run inside the per-run try`);
  }
  assert.ok(body.includes("input.journalAuthority"),
    "every authority-bearing Core restart must carry Main's authenticated journal proof");
  assert.equal((body.match(/\} catch \{/gu) ?? []).length, 2, "each recovery loop gates its own run on a throw");
});

test("candidate routing remains guarded Q9-only and adds no verdict IPC", () => {
  const tasks = source("tasks.ts");
  const main = source("main.ts");
  const ipc = source("ipc.ts");
  assert.match(main, /const q9E2eRequested = process\.env\.CAIRN_TEST_Q9 === "1"/u);
  assert.match(main, /q9E2eRequested && \(process\.env\.CAIRN_E2E !== "1" \|\| process\.env\.CAIRN_MOCK !== "1"/u);
  assert.match(tasks, /q9RuntimeForProject\(q9Runtime, dir\)/u);
  assert.doesNotMatch(tasks, /QUALITY_PREVIEW_ACTIVE\s*=\s*true/u);
  assert.equal(ipc.includes('ipcMain.handle("verdict:'), false);
  assert.equal(ipc.includes('ipcMain.on("verdict:'), false);
  assert.match(main, /onCutPoint\(point:[\s\S]*const selected = driver\.shouldCut\(point\);[\s\S]*if \(selected\) process\.exit\(86\);[\s\S]*return selected;/u,
    "guarded Q9 reserve/send cuts must hard-exit only through the boot-selected driver");
  assert.match(main, /installPendingSerialCandidateQ9E2eTerminalPreparedHook\([\s\S]*const selected = driver\.shouldCut\("after-terminal-prepare"\);[\s\S]*if \(selected\) process\.exit\(86\);[\s\S]*return selected;/u,
    "the terminal cut must occur only after durable preparation");
  assert.match(main, /if \(!q9E2eRequested && !builderReviewE2eRequested && !builderLiveE2eRequested\) \{\s*void startPhoneBridge\(\);\s*\}/u,
    "guarded Q9, Builder-review, or approved live-Builder boot must not open the LAN bridge or initialize its device store");
  assert.equal((main.match(/startPhoneBridge\(\)/gu) ?? []).length, 1,
    "no second unguarded phone-bridge start may bypass the Q9 boot guard");
  assert.match(main, /registerProjectIpc\(\{\s*suppressExternalUpdateCheck: q9E2eRequested \|\| builderReviewE2eRequested \|\| builderLiveE2eRequested,\s*suppressExternalOpen: builderLiveE2eRequested,\s*\}\);/u,
    "only Main's exact guarded Q9, Builder-review, or approved live-Builder boot may suppress the ambient update lookup");
  assert.match(main, /suppressExternalOpen: builderLiveE2eRequested/u,
    "only the exact approved live-Builder boot must suppress every browser-opening surface");
  assert.match(main, /registerConductorIpc\(\{ suppressOAuth: builderLiveE2eRequested \}\);/u,
    "the exact approved live-Builder boot must close the alternate OAuth route");
  const projectIpc = source("ipc.ts");
  const update = projectIpc.slice(
    projectIpc.indexOf('ipcMain.handle("app:updateCheck"'),
    projectIpc.indexOf('ipcMain.handle("app:openExternal"'),
  );
  const suppression = update.indexOf("if (suppressExternalUpdateCheck)");
  const githubFetch = update.indexOf('fetch("https://api.github.com/repos/kjleblanc/cairn/releases/latest"');
  assert.ok(suppression >= 0 && githubFetch > suppression,
    "guarded Q9 update handling must return before the GitHub fetch boundary");
  assert.match(update, /if \(suppressExternalUpdateCheck\) return \{ current, latest: null, newer: false \};/u);
  const externalOpen = projectIpc.slice(
    projectIpc.indexOf('ipcMain.handle("app:openExternal"'),
    projectIpc.indexOf('ipcMain.handle("push:preview"'),
  );
  assert.match(externalOpen, /if \(suppressExternalOpen\) return;[\s\S]*shell\.openExternal\(url\)/u);
  const conductorIpc = source("ipc.ts").slice(source("ipc.ts").indexOf("export function registerConductorIpc"));
  const oauth = conductorIpc.slice(
    conductorIpc.indexOf('ipcMain.handle("conductor:oauthBegin"'),
    conductorIpc.indexOf('ipcMain.handle("conductor:oauthCancel"'),
  );
  assert.match(oauth, /if \(suppressOAuth\) \{\s*return Promise\.resolve\(\{ ok: false,[\s\S]*\}\);\s*\}[\s\S]*conductorService\.beginOAuth/u);
  assert.match(source("qualityloop.ts"), /checkpointWithEvent\(loop, reserved\.candidate, base\)[\s\S]{0,180}if \(cutPoint\(loop, "after-reserve"\)\) return;/u);
  assert.match(source("qualityloop.ts"), /if \(cutPoint\(loop, "after-send"\)\) return;/u);
  assert.equal((source("pendingcandidate.ts").match(/if \(q9E2eTerminalPrepared\(projectRoot\)\)/gu) ?? []).length, 2,
    "both STOP and DONE hard cuts must return before terminal effects");
  assert.match(source("qualityloop.ts"), /persistNewOwnerEvidence\(loop\)[\s\S]{0,500}cutPoint\(loop, "after-cairn-confirmation"\)/u,
    "the injected confirmation cut occurs only after exact owner authority is durable");
});

test("mixed Q9 policy precedence closes higher gates before Cairn repair confirmation", () => {
  const loop = source("qualityloop.ts");
  const ownerBranch = loop.slice(
    loop.indexOf('if (candidate.phase === "awaiting-owner-resolution")'),
    loop.indexOf('if (evaluated.policy.state === "stopped")', loop.indexOf('if (candidate.phase === "awaiting-owner-resolution")') + 1),
  );
  assert.ok(ownerBranch.indexOf('evaluated.policy.state === "stopped"') >= 0);
  assert.ok(ownerBranch.indexOf('evaluated.policy.state === "stopped"') < ownerBranch.indexOf("unconfirmedCairn"),
    "native STOP takes precedence over every Cairn confirmation surface");
  assert.ok(ownerBranch.indexOf("incompleteNonCairnOwnerRows") < ownerBranch.indexOf("unconfirmedCairn"),
    "owner/critic cant-tell STOPs before Cairn confirmation");
  assert.ok(ownerBranch.indexOf("evaluated.policy.waitingOwner.length > 0") < ownerBranch.indexOf("unconfirmedCairn"),
    "actionable critic rows finish before Cairn confirmation");
  const requiredCritic = loop.indexOf('candidate.phase === "awaiting-critic" && candidate.criticMode === "required"');
  const blocked = loop.indexOf('if (evaluated.policy.state === "blocked")', requiredCritic);
  assert.ok(requiredCritic >= 0 && blocked > requiredCritic,
    "required critic retry or exhaustion takes precedence over repairable blockers");
});

test("recovered Q9 cards defer commentary until exact project selection and claim it before starting", () => {
  const tasks = source("tasks.ts");
  const service = source(join("conductor", "service.ts"));
  const delivery = tasks.slice(
    tasks.indexOf("export function deliverPendingTaskResultCards"),
    tasks.indexOf("function q9LoopDependencies"),
  );
  const posted = delivery.indexOf("postResultCardOnce(");
  const prepared = delivery.indexOf("prepareCommentary(");
  const deferred = delivery.indexOf('preparedCommentary.status === "defer-project-unselected"');
  const claimed = delivery.indexOf("recordPendingSerialCandidateTerminalCardDelivery(");
  const started = delivery.indexOf("preparedCommentary.start()");
  assert.ok(posted >= 0 && prepared > posted && deferred > prepared && claimed > deferred && started > claimed,
    "card adoption, selection decision, durable claim, and call start must remain ordered");
  assert.match(tasks, /onCurrentProjectChanged\(\(\) => \{\s*deliverPendingTaskResultCards\(win\);/u,
    "project selection must wake deferred card commentary");
  assert.match(service, /if \(currentProjectRoot === null \|\| projectExpectation === null\) \{\s*return Object\.freeze\(\{ status: "defer-project-unselected" \}\);/u);
  const preparedBody = service.slice(service.indexOf("export function prepareCommentary("), service.indexOf("export function commentary("));
  assert.equal(preparedBody.includes("streamTurn("), true);
  assert.match(preparedBody, /let started = false;[\s\S]*if \(started\) return;[\s\S]*started = true;/u,
    "one prepared commentary can start at most once");
});
