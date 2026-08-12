import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  PENDING_RUN_LIMITS,
  PENDING_RUN_STATE_VERSION,
  _interruptPendingRunAfterCloseIntentForTests,
  _interruptPendingRunAfterInventoryIntentForTests,
  _resetPendingRunsForTests,
  appendPendingRunRevision,
  closePendingRun,
  createPendingRun,
  installPendingRunStore,
  parsePendingRunState,
  pendingRunAuthority,
  pendingRunGate,
  pendingRunPreparedTerminalInputs,
  pendingRunRecoveryInputs,
  preparePendingRunTerminal,
  projectPendingRunHash,
  type PendingRunStateV1,
} from "../src/main/pendingrun.js";
import { pendingTaskStartRefusal, pendingVerdictCopyRefusal } from "../src/main/rungate.js";
import { pendingPushRefusal, pushExecute, pushPreview } from "../src/main/push.js";
import type { PushPreview } from "../src/shared/ipc.js";

const RUN_ID = "17171717-1717-4717-8717-171717171717";
const ACTION_ID = "27272727-2727-4727-8727-272727272727";
const RECEIPT = "9".repeat(64);

function runIdFor(index: number): string {
  const value = (index + 1).toString(16);
  return `${value.padStart(8, "0")}-1111-4111-8111-${value.padStart(12, "0")}`;
}

function fileBytesUnder(directory: string): number {
  let total = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    total += entry.isDirectory() ? fileBytesUnder(path) : statSync(path).size;
  }
  return total;
}

function sha(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function roots(): { root: string; profile: string; project: string; other: string } {
  const root = mkdtempSync(join(tmpdir(), "cairn-pending-run-"));
  const profile = join(root, "profile");
  const project = join(root, "project");
  const other = join(root, "other-project");
  mkdirSync(profile);
  mkdirSync(project);
  mkdirSync(other);
  return { root, profile, project, other };
}

function capsule(label = "one"): Buffer {
  return Buffer.from(JSON.stringify({ version: "test-capsule/v1", label }), "utf8");
}

function terminalAction(kind: "finalize" | "stop", bytes: Uint8Array, candidateSha256 = "e".repeat(64)) {
  return Object.freeze({ actionId: ACTION_ID, kind, candidateSha256, capsuleSha256: sha(bytes) });
}

function stateFor(
  bytes: Uint8Array,
  overrides: Partial<PendingRunStateV1> = {},
): PendingRunStateV1 {
  return {
    version: PENDING_RUN_STATE_VERSION,
    displayOutcome: "Show the verified status badge.",
    taskNumber: 215,
    phase: "ready-to-seal",
    criticMode: "off",
    generation: 0,
    round: 0,
    baseHead: "a".repeat(40),
    gitStateSha256: "b".repeat(64),
    taskSpecSha256: "c".repeat(64),
    evidencePlanSha256: "d".repeat(64),
    candidateSha256: "e".repeat(64),
    capsuleSha256: sha(bytes),
    bundleSha256s: ["f".repeat(64)],
    evidenceRunId: null,
    evidenceStateSha256: null,
    evidenceRevision: 0,
    route: {
      adapterLabel: "Hermetic fake Builder",
      provider: "local fake",
      model: "fixture-v1",
      receiptSha256: "1".repeat(64),
    },
    counters: {
      builder: { spent: 1, remaining: 0 },
      repair: { spent: 0, remaining: 1 },
      critic: { spent: 0, remaining: 3 },
      externalEvidence: { spent: 0, remaining: 0 },
    },
    terminalAction: null,
    ...overrides,
  };
}

function createOne(project: string, bytes = capsule(), state = stateFor(bytes)) {
  const created = createPendingRun({ projectRoot: project, runId: RUN_ID, state, capsuleBytes: bytes });
  assert.equal(created.ok, true, created.ok ? "" : created.code);
  return created;
}

function journalPaths(profile: string, project: string) {
  const projectHash = projectPendingRunHash(project);
  assert.ok(projectHash);
  const directory = join(profile, "pending-runs", projectHash, RUN_ID);
  return {
    directory,
    projectDirectory: dirname(directory),
    store: join(profile, "pending-runs"),
    inventory: join(profile, "pending-runs", "active-runs.json"),
    anchor: join(profile, "pending-runs", "inventory-anchor.json"),
    profileHighWater: join(profile, ".cairn-pending-run-profile-high-water-v1"),
    highWater: join(directory, "high-water.json"),
    revision1: join(directory, "revisions", "00000001.json"),
    revision2: join(directory, "revisions", "00000002.json"),
  };
}

test("a project root that cannot be canonicalized is refused while any run is pending", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    const vanished = join(fixture.root, "vanished-project");
    assert.equal(pendingRunGate(vanished), null, "with nothing pending there is nothing to protect");

    createOne(fixture.project);
    // Identity is how the gate knows which project it is looking at. A root
    // that will not canonicalize — an ejected volume, a dropped share, a
    // sharing violation — cannot be matched against the live journal, so
    // answering "not pending" would be a guess in the one direction that
    // opens a mutation boundary.
    assert.equal(pendingRunGate(vanished)?.status, "recovery-required");
    assert.match(pendingTaskStartRefusal(vanished) ?? "", /^PENDING_RUN_ACTIVE:/);
    const pushRefused = pendingPushRefusal(vanished);
    assert.equal(pushRefused?.ok, false);
    assert.match((pushRefused as { message: string } | null)?.message ?? "", /^PENDING_RUN_ACTIVE:/);
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("a valid store with one pending project gates exactly that project's four authorities", () => {
  // The other gate tests reach their refusal through the globally-unsafe
  // sentinel, which refuses every path including nonexistent ones. This drives
  // the state Cairn actually reaches in service — an authenticated store, one
  // genuinely pending project, others open — so a regression that gated the
  // wrong project, or stopped gating entirely, cannot pass unnoticed.
  const fixture = roots();
  const preview: PushPreview = {
    remote: "origin",
    url: "file:///origin",
    branch: "main",
    ahead: 1,
    subjects: ["a commit"],
    head: "abc1234",
  };
  let gitCalls = 0;
  const exec = (_args: string[]) => {
    gitCalls += 1;
    return { status: 0, stdout: "origin\n", stderr: "" };
  };
  _resetPendingRunsForTests();
  try {
    const boot = installPendingRunStore(fixture.profile);
    assert.equal(boot.ready, true);
    // Control arm: with this stub exec every git call succeeds, so an ungated
    // project really does build a preview. Anything null later is the gate.
    for (const open of [fixture.project, fixture.other]) {
      assert.equal(pendingTaskStartRefusal(open), null, "an authenticated empty store gates nothing");
      assert.notEqual(pushPreview(open, exec), null, "an open project reaches its git preview");
    }

    createOne(fixture.project);
    assert.equal(pendingRunGate(fixture.project)?.status, "pending");

    const refusal = pendingTaskStartRefusal(fixture.project);
    assert.match(refusal ?? "", /^PENDING_RUN_ACTIVE:/);
    assert.equal(pendingVerdictCopyRefusal(fixture.project, "write"), refusal);
    assert.equal(pendingVerdictCopyRefusal(fixture.project, "commit"), refusal);
    gitCalls = 0;
    assert.equal(pushPreview(fixture.project, exec), null);
    const executed = pushExecute(fixture.project, preview, exec);
    assert.equal(executed.ok, false);
    assert.equal((executed as { kind: string }).kind, "refused");
    assert.match((executed as { message: string }).message, /^PENDING_RUN_ACTIVE:/);
    assert.equal(gitCalls, 0, "a gated project reaches no git boundary at all");

    // The unrelated project keeps legacy behavior while its neighbour waits.
    gitCalls = 0;
    assert.equal(pendingRunGate(fixture.other), null);
    assert.equal(pendingTaskStartRefusal(fixture.other), null);
    assert.equal(pendingVerdictCopyRefusal(fixture.other, "write"), null);
    assert.equal(pendingPushRefusal(fixture.other), null);
    assert.notEqual(pushPreview(fixture.other, exec), null, "the neighbour still reaches its git preview");
    assert.ok(gitCalls > 0, "the neighbour's push path is not silently short-circuited");
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("an empty authenticated boot is open and a pending candidate survives restart exactly", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    assert.deepEqual(installPendingRunStore(fixture.profile), {
      ready: true,
      activeProjects: 0,
      recoveryRequired: false,
    });
    assert.equal(pendingRunGate(fixture.project), null);
    assert.notEqual(projectPendingRunHash(fixture.project), projectPendingRunHash(fixture.other));

    const bytes = capsule();
    createOne(fixture.project, bytes);
    const before = pendingRunGate(fixture.project);
    assert.equal(before?.status, "pending");
    assert.equal(before?.revision, 1);
    const inputs = pendingRunRecoveryInputs();
    assert.equal(inputs.length, 1);
    assert.equal(inputs[0]?.projectRoot, fixture.project);
    assert.deepEqual(Buffer.from(inputs[0]?.capsule.canonicalBytes ?? []), bytes);
    const oldAuthority = inputs[0]?.authority;

    _resetPendingRunsForTests();
    assert.deepEqual(installPendingRunStore(fixture.profile), {
      ready: true,
      activeProjects: 1,
      recoveryRequired: true,
    });
    const recovered = pendingRunRecoveryInputs();
    assert.equal(recovered.length, 1);
    assert.deepEqual(Buffer.from(recovered[0]?.capsule.canonicalBytes ?? []), bytes);
    assert.notEqual(recovered[0]?.authority, oldAuthority);
    assert.deepEqual(
      appendPendingRunRevision(oldAuthority, 1, stateFor(bytes), bytes),
      { ok: false, code: "PENDING_RUN_AUTHORITY_STALE" },
    );
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("the profile high-water seal rejects a coherent authenticated inventory-anchor and run rollback", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    installPendingRunStore(fixture.profile);
    const paths = journalPaths(fixture.profile, fixture.project);
    const emptyInventory = readFileSync(paths.inventory);
    const emptyAnchor = readFileSync(paths.anchor);
    createOne(fixture.project);
    assert.notDeepEqual(readFileSync(paths.anchor), emptyAnchor);

    rmSync(paths.projectDirectory, { recursive: true, force: true });
    writeFileSync(paths.inventory, emptyInventory);
    writeFileSync(paths.anchor, emptyAnchor);
    _resetPendingRunsForTests();
    assert.deepEqual(installPendingRunStore(fixture.profile), {
      ready: false,
      activeProjects: 0,
      recoveryRequired: true,
    });
    assert.equal(pendingRunGate(fixture.project)?.status, "recovery-required");
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("a copied or moved profile cannot reuse its pending-run authority", () => {
  for (const kind of ["copy", "move"] as const) {
    const fixture = roots();
    _resetPendingRunsForTests();
    try {
      assert.equal(installPendingRunStore(fixture.profile).ready, true);
      createOne(fixture.project);
      _resetPendingRunsForTests();

      const relocated = join(fixture.root, `${kind}-profile`);
      if (kind === "copy") cpSync(fixture.profile, relocated, { recursive: true, force: false });
      else renameSync(fixture.profile, relocated);

      assert.deepEqual(installPendingRunStore(relocated), {
        ready: false,
        activeProjects: 0,
        recoveryRequired: true,
      }, kind);
      assert.equal(pendingRunGate(fixture.project)?.status, "recovery-required", kind);
      assert.equal(pendingRunRecoveryInputs().length, 0, kind);
    } finally {
      _resetPendingRunsForTests();
      rmSync(fixture.root, { recursive: true, force: true });
    }
  }
});

test("a missing anchor or deleted store cannot be mistaken for a first install", () => {
  for (const cut of ["anchor", "store"] as const) {
    const fixture = roots();
    _resetPendingRunsForTests();
    try {
      installPendingRunStore(fixture.profile);
      const paths = journalPaths(fixture.profile, fixture.project);
      const emptyInventory = readFileSync(paths.inventory);
      createOne(fixture.project);
      if (cut === "anchor") {
        rmSync(paths.projectDirectory, { recursive: true, force: true });
        rmSync(paths.anchor, { force: true });
        writeFileSync(paths.inventory, emptyInventory);
      } else {
        rmSync(paths.store, { recursive: true, force: true });
      }
      _resetPendingRunsForTests();
      const boot = installPendingRunStore(fixture.profile);
      assert.equal(boot.ready, false, cut);
      assert.equal(boot.recoveryRequired, true, cut);
      assert.equal(pendingRunGate(fixture.project)?.status, "recovery-required", cut);
    } finally {
      _resetPendingRunsForTests();
      rmSync(fixture.root, { recursive: true, force: true });
    }
  }
});

test("a durable pending inventory intent never rolls backward after revision topology is lost", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    installPendingRunStore(fixture.profile);
    const first = capsule("before-cut");
    createOne(fixture.project, first, stateFor(first, { phase: "awaiting-critic", criticMode: "optional" }));
    const authority = pendingRunAuthority(fixture.project);
    assert.ok(authority);
    const second = capsule("after-cut");
    const next = stateFor(second, {
      generation: 1,
      phase: "ready-to-seal",
      criticMode: "optional",
      gitStateSha256: "4".repeat(64),
    });
    assert.equal(_interruptPendingRunAfterInventoryIntentForTests(), true);
    assert.deepEqual(appendPendingRunRevision(authority, 1, next, second), {
      ok: false,
      code: "PENDING_RUN_PERSIST_FAILED",
    });

    _resetPendingRunsForTests();
    const boot = installPendingRunStore(fixture.profile);
    assert.equal(boot.ready, false);
    assert.equal(boot.recoveryRequired, true);
    assert.equal(pendingRunGate(fixture.project)?.status, "recovery-required");
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("revision, prepared terminal action, close, and exact replay form one durable chain", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    installPendingRunStore(fixture.profile);
    const first = capsule("first");
    createOne(fixture.project, first, stateFor(first, { phase: "awaiting-critic", criticMode: "optional" }));
    const authority = pendingRunAuthority(fixture.project);
    assert.ok(authority);
    const second = capsule("second");
    const secondState = stateFor(second, {
      generation: 1,
      criticMode: "optional",
      gitStateSha256: "3".repeat(64),
      counters: {
        builder: { spent: 1, remaining: 0 },
        repair: { spent: 0, remaining: 1 },
        critic: { spent: 1, remaining: 2 },
        externalEvidence: { spent: 0, remaining: 0 },
      },
    });
    const appended = appendPendingRunRevision(authority, 1, secondState, second);
    assert.equal(appended.ok, true, appended.ok ? "" : appended.code);
    assert.equal(appended.ok && appended.value.revision, 2);

    const terminal = capsule("prepared-finalize");
    const prepared = preparePendingRunTerminal(authority, 2, terminalAction("finalize", terminal), terminal);
    assert.equal(prepared.ok, true, prepared.ok ? "" : prepared.code);
    assert.equal(prepared.ok && prepared.value.status, "recovery-required");
    assert.equal(pendingRunRecoveryInputs().length, 0);
    const actionId = prepared.ok ? prepared.value.state?.terminalAction?.actionId : null;
    assert.ok(actionId);

    const closed = closePendingRun(authority, 3, actionId, RECEIPT);
    assert.equal(closed.ok, true, closed.ok ? "" : closed.code);
    assert.equal(pendingRunGate(fixture.project), null);
    assert.equal(closePendingRun(authority, 3, actionId, RECEIPT).ok, true);
    assert.deepEqual(closePendingRun(authority, 3, actionId, "8".repeat(64)), {
      ok: false,
      code: "PENDING_RUN_CLOSE_MISMATCH",
    });

    _resetPendingRunsForTests();
    assert.deepEqual(installPendingRunStore(fixture.profile), {
      ready: true,
      activeProjects: 0,
      recoveryRequired: false,
    });
    assert.equal(pendingRunGate(fixture.project), null);
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("a schema-sized terminal card above the old 16 KiB cap still closes exactly once", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    const bytes = capsule("large-terminal-card");
    createOne(fixture.project, bytes);
    const authority = pendingRunAuthority(fixture.project);
    assert.ok(authority);
    const terminal = capsule("large-terminal-card-prepared");
    const canonicalCard = JSON.stringify({
      acceptedRequest: null,
      disposition: "STOPPED",
      kind: "result",
      taskSpecProjection: "x".repeat(96 * 1024),
    });
    assert.ok(Buffer.byteLength(canonicalCard, "utf8") > 16 * 1024,
      "the regression must exercise the former undersized cap");
    assert.ok(Buffer.byteLength(canonicalCard, "utf8") < PENDING_RUN_LIMITS.terminalCardBytes);
    const prepared = preparePendingRunTerminal(
      authority,
      1,
      terminalAction("stop", terminal),
      terminal,
      {
        conversationId: "007",
        turnTimestamp: "2026-08-11T15:00:00.000Z",
        canonicalCard,
      },
    );
    assert.equal(prepared.ok, true, prepared.ok ? "" : prepared.code);
    const closed = closePendingRun(authority, 2, ACTION_ID, RECEIPT);
    assert.equal(closed.ok, true, closed.ok ? "" : closed.code);
    assert.equal(pendingRunGate(fixture.project), null);
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("restart converges an authenticated close marker left before active-inventory removal", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    installPendingRunStore(fixture.profile);
    const bytes = capsule("close-cut");
    createOne(fixture.project, bytes);
    const authority = pendingRunAuthority(fixture.project);
    assert.ok(authority);
    const terminal = capsule("prepared-close-cut");
    const prepared = preparePendingRunTerminal(authority, 1, terminalAction("finalize", terminal), terminal);
    assert.equal(prepared.ok, true);
    const actionId = prepared.ok ? prepared.value.state?.terminalAction?.actionId : null;
    assert.ok(actionId);
    const paths = journalPaths(fixture.profile, fixture.project);
    const inventoryBeforeClose = readFileSync(paths.inventory);
    const anchorBeforeClose = readFileSync(paths.anchor);
    const profileHighWaterBeforeClose = readFileSync(paths.profileHighWater);
    assert.equal(closePendingRun(authority, 2, actionId, RECEIPT).ok, true);

    // This is the exact durable state of a process lost after closed.json was
    // fsynced but before the active inventory transaction began.
    writeFileSync(paths.inventory, inventoryBeforeClose);
    writeFileSync(paths.anchor, anchorBeforeClose);
    writeFileSync(paths.profileHighWater, profileHighWaterBeforeClose);
    _resetPendingRunsForTests();
    assert.deepEqual(installPendingRunStore(fixture.profile), {
      ready: true,
      activeProjects: 0,
      recoveryRequired: false,
    });
    assert.equal(pendingRunGate(fixture.project), null);
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("restart finishes the exact close forward from a pre-marker close intent", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    installPendingRunStore(fixture.profile);
    const bytes = capsule("close-intent-cut");
    createOne(fixture.project, bytes);
    const authority = pendingRunAuthority(fixture.project);
    assert.ok(authority);
    const terminal = capsule("prepared-close-intent-cut");
    const prepared = preparePendingRunTerminal(authority, 1, terminalAction("finalize", terminal), terminal);
    const actionId = prepared.ok ? prepared.value.state?.terminalAction?.actionId : null;
    assert.ok(actionId);
    assert.equal(_interruptPendingRunAfterCloseIntentForTests(), true);
    assert.deepEqual(closePendingRun(authority, 2, actionId, RECEIPT), {
      ok: false,
      code: "PENDING_RUN_CLOSE_FAILED",
    });

    _resetPendingRunsForTests();
    assert.deepEqual(installPendingRunStore(fixture.profile), {
      ready: true,
      activeProjects: 0,
      recoveryRequired: false,
    });
    assert.equal(pendingRunGate(fixture.project), null);
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("same-process replay finishes the exact pre-marker close intent once", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    installPendingRunStore(fixture.profile);
    const bytes = capsule("same-process-close-intent");
    createOne(fixture.project, bytes);
    const authority = pendingRunAuthority(fixture.project);
    assert.ok(authority);
    const terminal = capsule("same-process-prepared");
    const prepared = preparePendingRunTerminal(authority, 1, terminalAction("finalize", terminal), terminal);
    const actionId = prepared.ok ? prepared.value.state?.terminalAction?.actionId : null;
    assert.ok(actionId);
    assert.equal(_interruptPendingRunAfterCloseIntentForTests(), true);
    assert.equal(closePendingRun(authority, 2, actionId, RECEIPT).ok, false);
    assert.equal(closePendingRun(authority, 2, actionId, RECEIPT).ok, true);
    assert.equal(pendingRunGate(fixture.project), null);
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("a prepared terminal action is never replayed automatically after restart", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    installPendingRunStore(fixture.profile);
    const bytes = capsule();
    createOne(fixture.project, bytes);
    const authority = pendingRunAuthority(fixture.project);
    assert.ok(authority);
    const terminal = capsule("prepared-stop");
    assert.equal(preparePendingRunTerminal(authority, 1, terminalAction("stop", terminal), terminal).ok, true);

    _resetPendingRunsForTests();
    const boot = installPendingRunStore(fixture.profile);
    assert.deepEqual(boot, { ready: true, activeProjects: 1, recoveryRequired: true });
    assert.equal(pendingRunGate(fixture.project)?.status, "recovery-required");
    assert.equal(pendingRunRecoveryInputs().length, 0);
    assert.equal(pendingRunPreparedTerminalInputs().length, 1);
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("journal rollback, append, truncation, and capsule drift fail closed", () => {
  const cases = ["rollback", "extra", "truncated", "capsule"] as const;
  for (const kind of cases) {
    const fixture = roots();
    _resetPendingRunsForTests();
    try {
      installPendingRunStore(fixture.profile);
      const first = capsule("first");
      createOne(fixture.project, first, stateFor(first, { phase: "awaiting-critic", criticMode: "optional" }));
      const paths = journalPaths(fixture.profile, fixture.project);
      const originalHighWater = readFileSync(paths.highWater);
      const authority = pendingRunAuthority(fixture.project);
      assert.ok(authority);
      const second = capsule("second");
      const next = stateFor(second, {
        generation: 1,
        phase: "ready-to-seal",
        criticMode: "optional",
        gitStateSha256: "4".repeat(64),
      });
      assert.equal(appendPendingRunRevision(authority, 1, next, second).ok, true);
      if (kind === "rollback") writeFileSync(paths.highWater, originalHighWater);
      if (kind === "extra") writeFileSync(join(paths.directory, "unexpected.json"), "{}\n", "utf8");
      if (kind === "truncated") writeFileSync(paths.revision2, readFileSync(paths.revision2).subarray(0, 20));
      if (kind === "capsule") {
        const capsuleFile = join(paths.directory, "capsules", `${sha(second)}.bin`);
        writeFileSync(capsuleFile, Buffer.alloc(second.byteLength, 0x78));
      }
      _resetPendingRunsForTests();
      const boot = installPendingRunStore(fixture.profile);
      assert.equal(boot.ready, false, kind);
      assert.equal(boot.recoveryRequired, true, kind);
      assert.equal(pendingRunGate(fixture.other)?.status, "recovery-required", kind);
    } finally {
      _resetPendingRunsForTests();
      rmSync(fixture.root, { recursive: true, force: true });
    }
  }
});

test("a replaced project identity and hardlinked journal remain gated without recovery input", () => {
  for (const kind of ["project", "hardlink"] as const) {
    const fixture = roots();
    _resetPendingRunsForTests();
    try {
      installPendingRunStore(fixture.profile);
      createOne(fixture.project);
      const paths = journalPaths(fixture.profile, fixture.project);
      if (kind === "project") {
        renameSync(fixture.project, `${fixture.project}-moved`);
        mkdirSync(fixture.project);
      } else {
        linkSync(paths.revision1, join(fixture.root, "revision-hardlink.json"));
      }
      _resetPendingRunsForTests();
      const boot = installPendingRunStore(fixture.profile);
      if (kind === "hardlink") assert.equal(boot.ready, false);
      else assert.equal(boot.ready, true);
      assert.equal(pendingRunGate(fixture.project)?.status, "recovery-required");
      assert.equal(pendingRunRecoveryInputs().length, 0);
    } finally {
      _resetPendingRunsForTests();
      rmSync(fixture.root, { recursive: true, force: true });
    }
  }
});

test("hostile structural values do not consume a genuine revision authority", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    installPendingRunStore(fixture.profile);
    const first = capsule("first");
    createOne(fixture.project, first, stateFor(first, { phase: "awaiting-critic", criticMode: "optional" }));
    const authority = pendingRunAuthority(fixture.project);
    assert.ok(authority);
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, "version", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return PENDING_RUN_STATE_VERSION;
      },
    });
    const second = capsule("second");
    assert.deepEqual(appendPendingRunRevision(authority, 1, hostile, second), {
      ok: false,
      code: "PENDING_RUN_STATE_INVALID",
    });
    assert.equal(getterCalls, 0);
    const next = stateFor(second, {
      generation: 1,
      phase: "ready-to-seal",
      criticMode: "optional",
      gitStateSha256: "6".repeat(64),
    });
    const proxy = new Proxy(next, {});
    assert.deepEqual(appendPendingRunRevision(authority, 1, proxy, second), {
      ok: false,
      code: "PENDING_RUN_STATE_INVALID",
    });
    assert.equal(appendPendingRunRevision(authority, 1, next, second).ok, true);
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("state parsing binds capsule, evidence pair, exact keys, and dense bundle order", () => {
  const bytes = capsule();
  const state = stateFor(bytes);
  assert.ok(parsePendingRunState(state, sha(bytes)));
  assert.equal(parsePendingRunState({ ...state, capsuleSha256: "0".repeat(64) }, sha(bytes)), null);
  assert.equal(parsePendingRunState({ ...state, evidenceRunId: RUN_ID }, sha(bytes)), null);
  assert.equal(parsePendingRunState({ ...state, extra: true }, sha(bytes)), null);
  const sparse = new Array<string>(1);
  assert.equal(parsePendingRunState({ ...state, bundleSha256s: sparse }, sha(bytes)), null);
  assert.equal(parsePendingRunState({
    ...state,
    phase: "terminal-prepared",
    terminalAction: {
      actionId: ACTION_ID,
      kind: "stop",
      candidateSha256: state.candidateSha256,
      capsuleSha256: "2".repeat(64),
    },
  }), null);
});

test("profile overlap and a preplanted run path fail closed before authority can be cleared", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    assert.equal(pendingRunGate(fixture.profile), null);
    const projectHash = projectPendingRunHash(fixture.project);
    assert.ok(projectHash);
    const planted = join(fixture.profile, "pending-runs", projectHash, RUN_ID);
    mkdirSync(planted, { recursive: true });
    const bytes = capsule();
    const result = createPendingRun({ projectRoot: fixture.project, runId: RUN_ID, state: stateFor(bytes), capsuleBytes: bytes });
    assert.equal(result.ok, false);
    assert.equal(pendingRunGate(fixture.project)?.status, "recovery-required");
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("store installation is one-shot and a second valid profile cannot erase a live gate", () => {
  const fixture = roots();
  const secondProfile = join(fixture.root, "second-profile");
  mkdirSync(secondProfile);
  _resetPendingRunsForTests();
  try {
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    createOne(fixture.project);
    const authority = pendingRunAuthority(fixture.project);
    assert.ok(authority);
    assert.deepEqual(installPendingRunStore(secondProfile), {
      ready: false,
      activeProjects: 1,
      recoveryRequired: true,
    });
    assert.equal(pendingRunGate(fixture.project)?.status, "recovery-required");
    const terminal = capsule("unavailable-stop");
    assert.deepEqual(preparePendingRunTerminal(authority, 1, terminalAction("stop", terminal), terminal), {
      ok: false,
      code: "PENDING_RUN_STORE_UNAVAILABLE",
    });
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("the authenticated active inventory detects deletion of a whole project journal", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    installPendingRunStore(fixture.profile);
    createOne(fixture.project);
    const paths = journalPaths(fixture.profile, fixture.project);
    rmSync(dirname(paths.directory), { recursive: true, force: true });
    _resetPendingRunsForTests();
    const boot = installPendingRunStore(fixture.profile);
    assert.equal(boot.ready, false);
    assert.equal(boot.recoveryRequired, true);
    assert.equal(pendingRunGate(fixture.other)?.status, "recovery-required");
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("moved or replaced project identity is gated and cannot prepare or close through a held authority", () => {
  for (const kind of ["moved", "replaced"] as const) {
    const fixture = roots();
    _resetPendingRunsForTests();
    try {
      installPendingRunStore(fixture.profile);
      createOne(fixture.project);
      const authority = pendingRunAuthority(fixture.project);
      assert.ok(authority);
      const moved = `${fixture.project}-moved`;
      renameSync(fixture.project, moved);
      if (kind === "replaced") mkdirSync(fixture.project);
      const queried = pendingRunGate(kind === "moved" ? moved : fixture.project);
      assert.equal(queried?.status, "recovery-required");
      const terminal = capsule(`moved-${kind}`);
      assert.deepEqual(preparePendingRunTerminal(authority, 1, terminalAction("finalize", terminal), terminal), {
        ok: false,
        code: "PENDING_RUN_AUTHORITY_STALE",
      });
      assert.deepEqual(closePendingRun(authority, 1, RUN_ID, RECEIPT), {
        ok: false,
        code: "PENDING_RUN_AUTHORITY_STALE",
      });
    } finally {
      _resetPendingRunsForTests();
      rmSync(fixture.root, { recursive: true, force: true });
    }
  }
});

test("a failed multi-project boot publishes no partial recovery or mutation authority", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    installPendingRunStore(fixture.profile);
    createOne(fixture.project);
    const secondRun = "19191919-1919-4919-8919-191919191919";
    const bytes = capsule("other");
    assert.equal(createPendingRun({ projectRoot: fixture.other, runId: secondRun, state: stateFor(bytes), capsuleBytes: bytes }).ok, true);
    const oldAuthority = pendingRunAuthority(fixture.project);
    assert.ok(oldAuthority);
    const secondHash = projectPendingRunHash(fixture.other);
    assert.ok(secondHash);
    const corrupt = join(fixture.profile, "pending-runs", secondHash, secondRun, "high-water.json");
    writeFileSync(corrupt, "{}\n", "utf8");
    _resetPendingRunsForTests();
    const boot = installPendingRunStore(fixture.profile);
    assert.equal(boot.ready, false);
    assert.equal(pendingRunRecoveryInputs().length, 0);
    assert.equal(pendingRunAuthority(fixture.project), null);
    assert.deepEqual(appendPendingRunRevision(oldAuthority, 1, stateFor(bytes), bytes), {
      ok: false,
      code: "PENDING_RUN_STORE_UNAVAILABLE",
    });
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("the next active project beyond aggregate lifecycle reservation is refused before topology", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    installPendingRunStore(fixture.profile);
    const bytes = capsule("capacity");
    const activeCapacity = Math.floor(PENDING_RUN_LIMITS.scannedJournalBytes / PENDING_RUN_LIMITS.journalBytes);
    assert.equal(activeCapacity, 2);
    for (let index = 0; index < activeCapacity; index += 1) {
      const project = join(fixture.root, `capacity-${String(index).padStart(3, "0")}`);
      mkdirSync(project);
      const runId = runIdFor(index);
      const created = createPendingRun({ projectRoot: project, runId, state: stateFor(bytes), capsuleBytes: bytes });
      assert.equal(created.ok, true, `project ${index + 1}`);
    }
    const overflowProject = join(fixture.root, "capacity-overflow");
    mkdirSync(overflowProject);
    const overflowHash = projectPendingRunHash(overflowProject);
    assert.ok(overflowHash);
    assert.deepEqual(createPendingRun({
      projectRoot: overflowProject,
      runId: runIdFor(activeCapacity),
      state: stateFor(bytes),
      capsuleBytes: bytes,
    }), { ok: false, code: "PENDING_RUN_CAPACITY_REACHED" });
    assert.equal(existsSync(join(fixture.profile, "pending-runs", overflowHash)), false);

    _resetPendingRunsForTests();
    assert.deepEqual(installPendingRunStore(fixture.profile), {
      ready: true,
      activeProjects: activeCapacity,
      recoveryRequired: true,
    });
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("hostile store, project, and run directory fan-out fails boot at cap plus one", () => {
  for (const kind of ["store", "project", "run"] as const) {
    const fixture = roots();
    _resetPendingRunsForTests();
    try {
      assert.equal(installPendingRunStore(fixture.profile).ready, true);
      if (kind === "store") {
        const store = join(fixture.profile, "pending-runs");
        for (let index = 0; index <= PENDING_RUN_LIMITS.projectDirectories; index += 1) {
          mkdirSync(join(store, sha(`hostile-project-${index}`)));
        }
      } else {
        createOne(fixture.project);
        const paths = journalPaths(fixture.profile, fixture.project);
        if (kind === "project") {
          for (let index = 0; index < PENDING_RUN_LIMITS.runDirectories; index += 1) {
            mkdirSync(join(paths.projectDirectory, runIdFor(index + PENDING_RUN_LIMITS.runDirectories)));
          }
        } else {
          writeFileSync(join(paths.directory, "extra-one"), "x");
          writeFileSync(join(paths.directory, "extra-two"), "x");
        }
      }

      _resetPendingRunsForTests();
      const boot = installPendingRunStore(fixture.profile);
      assert.equal(boot.ready, false, kind);
      assert.equal(boot.recoveryRequired, true, kind);
      assert.equal(pendingRunGate(fixture.other)?.status, "recovery-required", kind);
    } finally {
      _resetPendingRunsForTests();
      rmSync(fixture.root, { recursive: true, force: true });
    }
  }
});

test("the aggregate run-directory cap includes ordinary closed runs", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    const bytes = capsule("closed-capacity");
    const projectHash = projectPendingRunHash(fixture.project);
    assert.ok(projectHash);
    for (let index = 0; index < PENDING_RUN_LIMITS.runDirectories; index += 1) {
      const runId = runIdFor(index);
      const created = createPendingRun({ projectRoot: fixture.project, runId, state: stateFor(bytes), capsuleBytes: bytes });
      assert.equal(created.ok, true, `create ${index + 1}`);
      const authority = pendingRunAuthority(fixture.project);
      assert.ok(authority);
      assert.equal(preparePendingRunTerminal(authority, 1, terminalAction("stop", bytes), bytes).ok, true, `prepare ${index + 1}`);
      assert.equal(closePendingRun(authority, 2, ACTION_ID, RECEIPT).ok, true, `close ${index + 1}`);
    }
    const overflowRunId = runIdFor(PENDING_RUN_LIMITS.runDirectories);
    assert.deepEqual(createPendingRun({
      projectRoot: fixture.project,
      runId: overflowRunId,
      state: stateFor(bytes),
      capsuleBytes: bytes,
    }), { ok: false, code: "PENDING_RUN_CAPACITY_REACHED" });
    assert.equal(existsSync(join(fixture.profile, "pending-runs", projectHash, overflowRunId)), false);

    _resetPendingRunsForTests();
    assert.deepEqual(installPendingRunStore(fixture.profile), {
      ready: true,
      activeProjects: 0,
      recoveryRequired: false,
    });
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("aggregate scanned-journal capacity refuses the plus-one create before its path exists", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    const bytes = Buffer.alloc(PENDING_RUN_LIMITS.capsuleBytes, 0x61);
    const terminalBytes = Buffer.alloc(PENDING_RUN_LIMITS.capsuleBytes, 0x62);
    const projectHash = projectPendingRunHash(fixture.project);
    assert.ok(projectHash);
    const projectDirectory = join(fixture.profile, "pending-runs", projectHash);
    let accepted = 0;
    let refusedRunId: string | null = null;
    let refusedPhysicalBytes = 0;
    for (let index = 0; index < PENDING_RUN_LIMITS.runDirectories; index += 1) {
      const runId = runIdFor(index);
      const physicalBytes = existsSync(projectDirectory) ? fileBytesUnder(projectDirectory) : 0;
      const created = createPendingRun({ projectRoot: fixture.project, runId, state: stateFor(bytes), capsuleBytes: bytes });
      if (!created.ok) {
        assert.equal(created.code, "PENDING_RUN_CAPACITY_REACHED");
        refusedRunId = runId;
        refusedPhysicalBytes = physicalBytes;
        break;
      }
      assert.ok(physicalBytes + PENDING_RUN_LIMITS.journalBytes <= PENDING_RUN_LIMITS.scannedJournalBytes);
      accepted += 1;
      const authority = pendingRunAuthority(fixture.project);
      assert.ok(authority);
      assert.equal(preparePendingRunTerminal(
        authority,
        1,
        terminalAction("stop", terminalBytes),
        terminalBytes,
      ).ok, true);
      assert.equal(closePendingRun(authority, 2, ACTION_ID, RECEIPT).ok, true);
    }
    assert.ok(accepted > 0 && accepted < PENDING_RUN_LIMITS.runDirectories);
    assert.ok(refusedRunId);
    assert.ok(refusedPhysicalBytes + PENDING_RUN_LIMITS.journalBytes > PENDING_RUN_LIMITS.scannedJournalBytes);
    assert.equal(existsSync(join(fixture.profile, "pending-runs", projectHash, refusedRunId)), false);
    assert.equal(pendingRunGate(fixture.project), null);

    _resetPendingRunsForTests();
    assert.deepEqual(installPendingRunStore(fixture.profile), {
      ready: true,
      activeProjects: 0,
      recoveryRequired: false,
    });
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("phase, generation, evidence, round, and counters advance only by the closed transition rules", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    installPendingRunStore(fixture.profile);
    const first = capsule("required-start");
    const initial = stateFor(first, {
      phase: "awaiting-critic",
      criticMode: "required",
      evidenceRunId: RUN_ID,
      evidenceStateSha256: "7".repeat(64),
    });
    createOne(fixture.project, first, initial);
    const authority = pendingRunAuthority(fixture.project);
    assert.ok(authority);

    const nextBytes = capsule("required-clear");
    const baseNext = stateFor(nextBytes, {
      phase: "ready-to-seal",
      criticMode: "required",
      generation: 1,
      gitStateSha256: "6".repeat(64),
      evidenceRunId: RUN_ID,
      evidenceStateSha256: "7".repeat(64),
    });
    const invalidStates: PendingRunStateV1[] = [
      { ...baseNext, candidateSha256: "9".repeat(64) },
      { ...baseNext, generation: 0 },
      {
        ...initial,
        evidenceStateSha256: "8".repeat(64),
      },
      {
        ...baseNext,
        counters: {
          ...baseNext.counters,
          critic: { spent: 2, remaining: 1 },
        },
      },
      {
        ...baseNext,
        round: 1,
        bundleSha256s: ["f".repeat(64), "5".repeat(64)],
      },
    ];
    for (const invalid of invalidStates) {
      const bytes = invalid.capsuleSha256 === sha(first) ? first : nextBytes;
      assert.deepEqual(appendPendingRunRevision(authority, 1, invalid, bytes), {
        ok: false,
        code: "PENDING_RUN_STATE_INVALID",
      });
    }
    const valid = {
      ...baseNext,
      counters: {
        ...baseNext.counters,
        critic: { spent: 1, remaining: 2 },
      },
    };
    assert.equal(appendPendingRunRevision(authority, 1, valid, nextBytes).ok, true);
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("an exact round-one repair revision remains journalable and terminally closable", () => {
  const fixture = roots();
  _resetPendingRunsForTests();
  try {
    assert.equal(installPendingRunStore(fixture.profile).ready, true);
    const roundZeroBytes = capsule("round-zero-awaiting-repair");
    const roundZero = stateFor(roundZeroBytes, {
      phase: "awaiting-repair",
      criticMode: "required",
      generation: 2,
      counters: {
        builder: { spent: 1, remaining: 0 },
        repair: { spent: 0, remaining: 1 },
        critic: { spent: 1, remaining: 2 },
        externalEvidence: { spent: 0, remaining: 0 },
      },
    });
    createOne(fixture.project, roundZeroBytes, roundZero);
    const authority = pendingRunAuthority(fixture.project);
    assert.ok(authority);

    const roundOneBytes = capsule("round-one-awaiting-critic");
    const roundOne = stateFor(roundOneBytes, {
      phase: "awaiting-critic",
      criticMode: "required",
      generation: 3,
      round: 1,
      gitStateSha256: "8".repeat(64),
      candidateSha256: "9".repeat(64),
      bundleSha256s: ["f".repeat(64), "5".repeat(64)],
      counters: {
        builder: { spent: 1, remaining: 0 },
        repair: { spent: 1, remaining: 0 },
        critic: { spent: 1, remaining: 2 },
        externalEvidence: { spent: 0, remaining: 0 },
      },
    });
    assert.equal(appendPendingRunRevision(authority, 1, roundOne, roundOneBytes).ok, true);
    assert.equal(pendingRunGate(fixture.project)?.state?.round, 1);

    const preparedBytes = capsule("round-one-prepared-stop");
    assert.equal(preparePendingRunTerminal(
      authority,
      2,
      terminalAction("stop", preparedBytes, roundOne.candidateSha256),
      preparedBytes,
    ).ok, true);
    assert.equal(closePendingRun(authority, 3, ACTION_ID, RECEIPT).ok, true);
    assert.equal(pendingRunGate(fixture.project), null);

    _resetPendingRunsForTests();
    assert.deepEqual(installPendingRunStore(fixture.profile), {
      ready: true,
      activeProjects: 0,
      recoveryRequired: false,
    });
  } finally {
    _resetPendingRunsForTests();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
