import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  EVIDENCE_PLAN_CANDIDATE_VERSION,
  NODE_PERMISSION_MODEL_CANDIDATE_TEST_PROGRAM_VERSION,
  QUALITY_PLAN_VERSION,
  bindInitialEvidencePlan,
  bindTaskIntent,
  bindTaskSpec,
  composeNodePermissionModelCandidateAdapterForTest,
  composeSerialCandidateTaskSpecAuthority,
  composeSerialCandidateWriterIsolation,
  executeSerialCandidateTerminal,
  exportSerialCandidatePendingState,
  parkSerialCandidateForRestart,
  parseQualityPlanCandidate,
  prepareSerialCandidateTerminal,
  runSerialTaskToCandidate,
  type NodePermissionModelCandidateOperationV1,
  type TaskAdapter,
} from "@cairn/core";
import { setEvidenceMarkerDir } from "../src/main/evidence.js";
import {
  _resetPendingSerialCandidatesForTests,
  activePendingSerialCandidates,
  installPendingSerialCandidateRecovery,
  parkPendingSerialCandidatesForRestart,
  persistPendingSerialCandidate,
  stopPendingSerialCandidate,
} from "../src/main/pendingcandidate.js";
import {
  _resetPendingRunsForTests,
  pendingRunAuthority,
  pendingRunGate,
  preparePendingRunTerminal,
} from "../src/main/pendingrun.js";

const LOG_HEADER = [
  "| Task | Date | Lane | Draft/Final | Outcome | Decision | One-line summary | Milestone moved? |",
  "|---|---|---|---|---|---|---|---|",
  "",
].join("\n");

function git(root: string, args: readonly string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trimEnd();
}

function governedProject(parent: string): string {
  const root = join(parent, "project");
  mkdirSync(join(root, "docs", "ai-work", "tasks"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), [
    "# Project Contract",
    "",
    "Cairn Contract v0.8.0",
    "STATUS: ACTIVE",
    "PROJECT NAME: Pending candidate fixture",
    "WHAT WE ARE BUILDING: a restart fixture",
    "WHO WILL USE IT: tests",
    "CURRENT MILESTONE: resume one exact result",
    "",
  ].join("\n"));
  writeFileSync(join(root, "docs", "ai-work", "PROJECT.md"), "# Pending candidate fixture\n");
  writeFileSync(join(root, "docs", "ai-work", "LOG.md"), LOG_HEADER);
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Cairn Test"]);
  git(root, ["config", "user.email", "cairn-test@example.invalid"]);
  git(root, ["add", "AGENTS.md", "docs/ai-work/PROJECT.md", "docs/ai-work/LOG.md"]);
  git(root, ["commit", "-q", "-m", "fixture"]);
  return root;
}

function candidateFixture() {
  const intent = bindTaskIntent({
    version: "cairn-task-intent/v1",
    outcome: { source: "owner-stated", text: "Build the local restart result.", ownerQuote: "Build the local restart result." },
    requirements: [{
      source: "owner-unsure",
      text: "Maybe prefer a polished result.",
      ownerQuote: "Maybe prefer a polished result.",
    }],
    context: [],
  }, [{
    kind: "conversation",
    inputId: "31313131-3131-4131-8131-313131313131",
    text: "Build the local restart result. Maybe prefer a polished result.",
  }]);
  assert.ok(intent);
  const quality = parseQualityPlanCandidate({
    version: QUALITY_PLAN_VERSION,
    target: { kind: "local-task", basis: [{ kind: "intent-outcome" }] },
    supportedPath: { statement: "Build the local restart result.", basis: [{ kind: "intent-outcome" }] },
    critic: {
      mode: "off",
      reason: "No critic was requested.",
      basis: [{ kind: "cairn-default", reason: "not-requested" }],
    },
    candidateStates: [{
      id: "candidate-main",
      route: "/main",
      viewport: { width: 1280, height: 720 },
      inputFixtureId: "fixture-input",
      dataFixtureId: "fixture-data",
      versionOrTime: "v1",
      locale: "en-US",
      accessibilityMode: "default",
    }],
    acceptanceChecks: [{
      id: "c1",
      promise: "Build the local restart result.",
      kind: "non-regression",
      judge: "cairn",
      basis: [{ kind: "intent-outcome" }],
      failureCondition: {
        id: "failure-c1",
        statement: "The local restart result is absent.",
        allowedArtifactIds: ["artifact-output"],
      },
      evidenceStandard: {
        mode: "adapter-attestation",
        proves: "The approved local check completed.",
        precondition: null,
      },
      comparison: null,
    }],
    qualityPreferences: [{
      id: "p1",
      dimension: "polish",
      desiredDirection: "Prefer a polished result when it changes no required behavior.",
      basis: [{ kind: "intent-requirement", index: 0 }],
      comparison: null,
    }],
    references: [],
    unknowns: [],
    coverage: {
      outcomeCriterionIds: ["c1"],
      requirementCriteria: [],
      supportedPathCriterionId: "c1",
    },
  });
  assert.ok(quality);
  const taskSpec = bindTaskSpec(intent, quality);
  assert.ok(taskSpec);
  const evidencePlan = bindInitialEvidencePlan(taskSpec, {
    version: EVIDENCE_PLAN_CANDIDATE_VERSION,
    procedures: [{
      criterionId: "c1",
      kind: "adapter-command-attestation",
      command: {
        executablePath: "node",
        executableSha256: "e".repeat(64),
        arguments: [{ kind: "literal", value: "--test" }],
        fixtureBindings: [],
        cwdRelative: "core",
        expectedExitCodes: [0],
        timeoutMs: 60_000,
        resultParserMode: "node-test-tap",
        assertion: { id: "local-check-passes", expectedResult: "zero failing tests" },
      },
      artifactIds: ["artifact-output"],
    }],
  });
  assert.ok(evidencePlan);
  const authority = composeSerialCandidateTaskSpecAuthority(taskSpec, evidencePlan);
  assert.ok(authority);
  return { intent, authority };
}

function claimsText(taskSpecSha256: string): string {
  return [
    "```cairn-claims",
    JSON.stringify({
      version: "cairn-task-spec-worker-claims/v1",
      taskSpecSha256,
      disposition: "DONE",
      summary: "The fake Builder reports the restart result complete.",
      changes: ["candidate-output.txt — created"],
      criteria: [{ id: "c1", result: "The required restart result exists." }],
      preferences: [{ id: "p1", result: "The advisory preference stayed non-blocking." }],
      howToTry: "Open candidate-output.txt.",
      limitations: "The adapter event proves execution and exit only.",
      milestone: "NO",
    }),
    "```",
  ].join("\n");
}

function fakeAdapter(
  root: string,
  profile: string,
  taskSpecSha256: string,
  hostileOperations: readonly NodePermissionModelCandidateOperationV1[] = [],
): TaskAdapter {
  const adapter = composeNodePermissionModelCandidateAdapterForTest({
    descriptor: {
      id: "pending-candidate-fake",
      label: "Pending candidate fake",
      provider: "local-test",
      model: "deterministic",
      connected: true,
      capabilities: ["serial-task", "serial-task-candidate"],
      priority: 100,
    },
    projectRoot: root,
    excludedUserDataRoot: profile,
    program: {
      version: NODE_PERMISSION_MODEL_CANDIDATE_TEST_PROGRAM_VERSION,
      operations: [{
        kind: "write",
        path: join(root, "candidate-output.txt"),
        contents: "frozen restart bytes\n",
        expect: "allowed",
      }, ...hostileOperations],
      result: {
        status: "completed",
        claimsText: claimsText(taskSpecSha256),
        evidence: { outputTokens: 12 },
      },
    },
  });
  assert.ok(adapter);
  return adapter;
}

test("a Permission-Model-contained fake cannot touch journal/marker paths and still journals, restarts, and closes once", async () => {
  const parent = mkdtempSync(join(tmpdir(), "cairn-pending-integration-"));
  const profile = join(parent, "profile");
  mkdirSync(profile);
  const root = governedProject(parent);
  _resetPendingRunsForTests();
  _resetPendingSerialCandidatesForTests();
  setEvidenceMarkerDir(profile);
  try {
    assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
    const fixture = candidateFixture();
    const pendingRoot = join(profile, "pending-runs");
    const inventoryPath = join(pendingRoot, "active-runs.json");
    const anchorPath = join(pendingRoot, "inventory-anchor.json");
    const keyPath = join(profile, ".cairn-pending-run-main-key-v1");
    const profileHighWaterPath = join(profile, ".cairn-pending-run-profile-high-water-v1");
    const markerPath = join(profile, "evidence", "hostile-marker", "record.json");
    mkdirSync(join(profile, "evidence", "hostile-marker"), { recursive: true });
    writeFileSync(markerPath, "marker sentinel\n", "utf8");
    const protectedBytes = new Map([
      [inventoryPath, readFileSync(inventoryPath)],
      [anchorPath, readFileSync(anchorPath)],
      [keyPath, readFileSync(keyPath)],
      [profileHighWaterPath, readFileSync(profileHighWaterPath)],
      [markerPath, readFileSync(markerPath)],
    ]);
    const preplantPath = join(pendingRoot, "preplanted-run.json");
    const journalLinkPath = join(root, "journal-hard-link.json");
    const escapedProjectPath = join(pendingRoot, "escaped-project-output.txt");
    const aliasInventoryPath = join(pendingRoot, "..", "pending-runs", "active-runs.json");
    const adapter = fakeAdapter(root, profile, fixture.authority.taskSpecSha256, [
      { kind: "write", path: preplantPath, contents: "forged journal\n", expect: "denied" },
      { kind: "write", path: inventoryPath, contents: "forged inventory\n", expect: "denied" },
      { kind: "append", path: keyPath, contents: "forged key bytes", expect: "denied" },
      { kind: "write", path: profileHighWaterPath, contents: "forged high water\n", expect: "denied" },
      { kind: "truncate", path: profileHighWaterPath, expect: "denied" },
      { kind: "unlink", path: profileHighWaterPath, expect: "denied" },
      { kind: "truncate", path: markerPath, expect: "denied" },
      { kind: "unlink", path: anchorPath, expect: "denied" },
      { kind: "remove", path: pendingRoot, expect: "denied" },
      { kind: "write", path: aliasInventoryPath, contents: "alias overwrite\n", expect: "denied" },
      { kind: "hard-link", source: inventoryPath, destination: journalLinkPath, expect: "denied" },
      { kind: "hard-link", source: join(root, "candidate-output.txt"), destination: escapedProjectPath, expect: "denied" },
    ]);
    const isolation = composeSerialCandidateWriterIsolation(adapter, root, profile);
    assert.ok(isolation);
    const result = await runSerialTaskToCandidate(root, fixture.intent, {
      adapters: [adapter],
      authority: fixture.authority,
      writerIsolation: isolation,
    });
    assert.equal(result.status, "candidate");
    if (result.status !== "candidate") return;
    for (const [path, bytes] of protectedBytes) assert.deepEqual(readFileSync(path), bytes, path);
    assert.equal(existsSync(preplantPath), false);
    assert.equal(existsSync(journalLinkPath), false);
    assert.equal(existsSync(escapedProjectPath), false);
    assert.equal(readFileSync(join(root, "candidate-output.txt"), "utf8"), "frozen restart bytes\n");
    assert.equal(persistPendingSerialCandidate({ projectRoot: root, result, evidence: null }).ok, true);
    assert.equal(pendingRunGate(root)?.state?.candidateSha256, result.candidate.candidateSha256);
    assert.equal(existsSync(join(root, ".git", "cairn-run.lock")), true);

    assert.deepEqual(parkPendingSerialCandidatesForRestart(), { parked: 1, failed: 0 });
    assert.equal(existsSync(join(root, ".git", "cairn-run.lock")), false);
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();

    const boot = installPendingSerialCandidateRecovery(profile);
    assert.equal(boot.resumed, 1);
    assert.equal(boot.recoveryRequired, 0);
    assert.equal(existsSync(join(root, ".git", "cairn-run.lock")), true);
    assert.deepEqual(activePendingSerialCandidates(), [root]);
    await assert.rejects(
      () => runSerialTaskToCandidate(root, fixture.intent, {
        adapters: [adapter],
        authority: fixture.authority,
        writerIsolation: isolation,
      }),
      /SERIAL_RUN_ACTIVE/,
    );

    const stopped = stopPendingSerialCandidate(root, "CANCELLED_BY_OWNER");
    assert.equal(stopped?.journal.ok, true);
    assert.equal(stopped?.result?.status, "stopped");
    assert.equal(pendingRunGate(root), null);
    assert.equal(existsSync(join(root, ".git", "cairn-run.lock")), false);
    assert.equal(stopPendingSerialCandidate(root), null);
    const rows = readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8")
      .split(/\r?\n/).filter((line) => /^\| 001 \|/.test(line));
    assert.equal(rows.length, 1);
    assert.equal(existsSync(join(root, "docs", "ai-work", "tasks", "001-report.md")), true);

    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    assert.deepEqual(installPendingSerialCandidateRecovery(profile), {
      journal: { ready: true, activeProjects: 0, recoveryRequired: false },
      resumed: 0,
      recoveryRequired: 0,
    });
  } finally {
    setEvidenceMarkerDir(null);
    _resetPendingSerialCandidatesForTests();
    _resetPendingRunsForTests();
    rmSync(parent, { recursive: true, force: true });
  }
});

test("prepared and post-Core terminal crash cuts restart into the same one STOP close", async () => {
  for (const cut of ["prepared", "terminal"] as const) {
    const parent = mkdtempSync(join(tmpdir(), `cairn-pending-${cut}-cut-`));
    const profile = join(parent, "profile");
    mkdirSync(profile);
    const root = governedProject(parent);
    _resetPendingRunsForTests();
    _resetPendingSerialCandidatesForTests();
    setEvidenceMarkerDir(profile);
    try {
      assert.equal(installPendingSerialCandidateRecovery(profile).journal.ready, true);
      const fixture = candidateFixture();
      const adapter = fakeAdapter(root, profile, fixture.authority.taskSpecSha256);
      const isolation = composeSerialCandidateWriterIsolation(adapter, root, profile);
      assert.ok(isolation);
      const result = await runSerialTaskToCandidate(root, fixture.intent, {
        adapters: [adapter],
        authority: fixture.authority,
        writerIsolation: isolation,
      });
      assert.equal(result.status, "candidate");
      if (result.status !== "candidate") continue;
      assert.equal(persistPendingSerialCandidate({ projectRoot: root, result, evidence: null }).ok, true);
      const base = exportSerialCandidatePendingState(result.candidate);
      assert.ok(base);
      const preparation = prepareSerialCandidateTerminal(result.candidate, {
        actionId: cut === "prepared"
          ? "41414141-4141-4141-8141-414141414141"
          : "42424242-4242-4242-8242-424242424242",
        kind: "stop",
        reason: "CANCELLED_BY_OWNER",
      });
      assert.ok(preparation);
      const authority = pendingRunAuthority(root);
      const gate = pendingRunGate(root);
      assert.ok(authority && gate?.revision && preparation);
      assert.equal(preparePendingRunTerminal(
        authority,
        gate.revision,
        preparation.action,
        Buffer.from(preparation.capsule.canonicalBytes, "utf8"),
      ).ok, true);
      if (cut === "prepared") {
        assert.equal(parkSerialCandidateForRestart(result.candidate, base.capsuleSha256), true);
      } else {
        assert.ok(executeSerialCandidateTerminal(
          result.candidate,
          preparation,
          preparation.action.capsuleSha256,
        ));
      }

      _resetPendingSerialCandidatesForTests();
      _resetPendingRunsForTests();
      const boot = installPendingSerialCandidateRecovery(profile);
      assert.deepEqual(boot, {
        journal: { ready: true, activeProjects: 0, recoveryRequired: false },
        resumed: 0,
        recoveryRequired: 0,
      }, cut);
      assert.equal(pendingRunGate(root), null, cut);
      assert.equal(existsSync(join(root, ".git", "cairn-run.lock")), false, cut);
      const rows = readFileSync(join(root, "docs", "ai-work", "LOG.md"), "utf8")
        .split(/\r?\n/).filter((line) => /^\| 001 \|/.test(line));
      assert.equal(rows.length, 1, cut);
      assert.equal(existsSync(join(root, "docs", "ai-work", "tasks", "001-report.md")), true, cut);
    } finally {
      setEvidenceMarkerDir(null);
      _resetPendingSerialCandidatesForTests();
      _resetPendingRunsForTests();
      rmSync(parent, { recursive: true, force: true });
    }
  }
});
