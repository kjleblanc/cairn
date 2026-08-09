import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, linkSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import * as publicCore from "../src/index.js";
import {
  SERIAL_CANDIDATE_BUNDLE_LIMITS,
  SERIAL_CANDIDATE_SEAL_AUTHORIZATION_VERSION,
  SERIAL_CANDIDATE_TRANSITION_VERSION,
  SERIAL_CANDIDATE_VERSION,
  SERIAL_REPAIR_INSTRUCTION_VERSION,
  advanceSerialCandidate,
  beginSerialCandidateTerminal,
  captureSerialCandidateBundle,
  captureSerialCandidateBundleAfterRepair,
  captureSerialCandidateIgnoredBoundary,
  completeSerialCandidateTerminal,
  composeSerialCandidate,
  composeSerialCandidateRepairEligibility,
  composeSerialCandidateSealAuthorization,
  composeSerialCandidateTaskSpecAuthority,
  composeSerialCandidateTransition,
  composeSerialRepairInstruction,
  isCurrentSerialCandidate,
  isSerialCandidateBundle,
  isSerialRepairInstruction,
  isSerialCandidateTaskSpecAuthority,
  replaceSerialCandidateAfterRepair,
  restoreSerialCandidateAfterRepairForPending,
  serialCandidateBundleSha256,
  serialCandidateGitEnvironmentSafe,
  serialCandidateLineageIdentity,
  serialCandidatePendingRepairLineage,
  serialCandidateRepairAvailability,
  serialCandidateSha256,
  serialCandidateWorkspaceStillExact,
} from "../src/candidate.js";
import { bindTaskIntent } from "../src/intent.js";
import {
  EVIDENCE_PLAN_CANDIDATE_VERSION,
  QUALITY_PLAN_VERSION,
  bindInitialEvidencePlan,
  bindTaskSpec,
  parseQualityPlanCandidate,
} from "../src/quality.js";

const roots: string[] = [];
const RUN_ID = "60000000-0000-4000-8000-000000000001";

test("candidate Git environment accepts only the closed managed safe.directory triplet", () => {
  assert.equal(serialCandidateGitEnvironmentSafe({}), true);
  assert.equal(serialCandidateGitEnvironmentSafe({
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "safe.directory",
    GIT_CONFIG_VALUE_0: "*",
  }), true, "the one managed value is accepted only because every candidate child strips it");
  assert.equal(serialCandidateGitEnvironmentSafe({ GIT_INDEX_FILE: "outside.index" }), false);
  assert.equal(serialCandidateGitEnvironmentSafe({ GIT_OBJECT_DIRECTORY: "outside-objects" }), false);
  assert.equal(serialCandidateGitEnvironmentSafe({ GIT_TRACE: "outside-trace" }), false);
  assert.equal(serialCandidateGitEnvironmentSafe({ GIT_TRACE2_EVENT: "outside-trace2" }), false);
  assert.equal(serialCandidateGitEnvironmentSafe({ GIT_REDIRECT_STDOUT: "outside-output" }), false);
  assert.equal(serialCandidateGitEnvironmentSafe({
    GIT_CONFIG_COUNT: "2",
    GIT_CONFIG_KEY_0: "safe.directory",
    GIT_CONFIG_VALUE_0: "*",
    GIT_CONFIG_KEY_1: "core.hooksPath",
    GIT_CONFIG_VALUE_1: "outside-hooks",
  }), false);
});

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Cairn Candidate Test",
      GIT_AUTHOR_EMAIL: "candidate@example.invalid",
      GIT_COMMITTER_NAME: "Cairn Candidate Test",
      GIT_COMMITTER_EMAIL: "candidate@example.invalid",
      GIT_TERMINAL_PROMPT: "0",
    },
  }).trimEnd();
}

function repository(): string {
  const root = mkdtempSync(join(tmpdir(), "cairn-candidate-"));
  roots.push(root);
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Cairn Candidate Test"]);
  git(root, ["config", "user.email", "candidate@example.invalid"]);
  writeFileSync(join(root, "base.txt"), "base\n");
  git(root, ["add", "--", "base.txt"]);
  git(root, ["commit", "-q", "-m", "base"]);
  return root;
}

test.after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function quality(mode: "required" | "optional" | "off" = "off") {
  const intent = bindTaskIntent({
    version: "cairn-task-intent/v1",
    outcome: { source: "owner-stated", text: "Build the local result.", ownerQuote: "Build the local result." },
    requirements: [{ source: "owner-unsure", text: "Maybe prefer polish.", ownerQuote: "Maybe prefer polish." }],
    context: [],
  }, [{
    kind: "conversation",
    inputId: "60000000-0000-4000-8000-000000000002",
    text: "Build the local result. Maybe prefer polish.",
  }]);
  assert.ok(intent);
  const plan = parseQualityPlanCandidate({
    version: QUALITY_PLAN_VERSION,
    target: { kind: "local-task", basis: [{ kind: "intent-outcome" }] },
    supportedPath: { statement: "Build the local result.", basis: [{ kind: "intent-outcome" }] },
    critic: mode === "required" ? {
      mode,
      reason: "The owner required an independent critic.",
      basis: [{ kind: "intent-outcome" }],
    } : {
      mode,
      reason: mode === "optional" ? "A critic is optional." : "No critic was requested.",
      basis: [{ kind: "cairn-default", reason: mode === "optional" ? "no-useful-inspection" : "not-requested" }],
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
      promise: "Build the local result.",
      kind: "non-regression",
      judge: "cairn",
      basis: [{ kind: "intent-outcome" }],
      failureCondition: {
        id: "failure-c1",
        statement: "The local result is absent.",
        allowedArtifactIds: ["artifact-output", "artifact-log"],
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
      desiredDirection: "Prefer polish without changing required behavior.",
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
  assert.ok(plan);
  const taskSpec = bindTaskSpec(intent, plan);
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
        assertion: { id: "candidate-check", expectedResult: "zero failing tests" },
      },
      artifactIds: ["artifact-output", "artifact-log"],
    }],
  });
  assert.ok(evidencePlan);
  const authority = composeSerialCandidateTaskSpecAuthority(taskSpec, evidencePlan);
  assert.ok(authority);
  return { intent, taskSpec, evidencePlan, authority };
}

function claimsText(taskSpecSha256: string, summary = "The worker reports the local result complete."): string {
  return [
    "Done.",
    "",
    "```cairn-claims",
    JSON.stringify({
      version: "cairn-task-spec-worker-claims/v1",
      taskSpecSha256,
      disposition: "DONE",
      summary,
      changes: ["Added the local result."],
      criteria: [{ id: "c1", result: "The worker says c1 holds." }],
      preferences: [{ id: "p1", result: "The worker considered p1." }],
      howToTry: "Inspect the local result.",
      limitations: "Worker claims are not criterion evidence.",
      milestone: "NO",
    }),
    "```",
  ].join("\n");
}

function captured(mode: "required" | "optional" | "off" = "off", content = "visible\n") {
  const root = repository();
  const fixture = quality(mode);
  const ignoredBoundary = captureSerialCandidateIgnoredBoundary(root);
  assert.ok(ignoredBoundary);
  writeFileSync(join(root, "visible.txt"), content);
  const capture = captureSerialCandidateBundle(root, fixture.authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["visible.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  if (!capture.eligible) throw new Error(`capture failed: ${capture.reason}`);
  const repairEligibility = composeSerialCandidateRepairEligibility(root, ignoredBoundary, capture.bundle);
  assert.ok(repairEligibility);
  const candidate = composeSerialCandidate(fixture.authority, {
    version: SERIAL_CANDIDATE_VERSION,
    runId: RUN_ID,
    taskNumber: 1,
    requestSha256: "a".repeat(64),
    claimsText: claimsText(fixture.authority.taskSpecSha256),
    bundle: capture.bundle,
    repairEligibility,
  });
  assert.ok(candidate);
  return { root, ...fixture, bundle: capture.bundle, candidate };
}

function transitionRaw(candidate: ReturnType<typeof captured>["candidate"], decision: string) {
  return {
    version: SERIAL_CANDIDATE_TRANSITION_VERSION,
    runId: candidate.runId,
    generation: candidate.generation,
    taskNumber: candidate.taskNumber,
    projectRootSha256: candidate.projectRootSha256,
    round: candidate.round,
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    candidateSha256: candidate.candidateSha256,
    bundleSha256: candidate.bundleSha256,
    evidenceStateSha256: candidate.evidenceStateSha256,
    decision,
  };
}

function transition(candidate: ReturnType<typeof captured>["candidate"], decision: Parameters<typeof composeSerialCandidateTransition>[1]) {
  const event = composeSerialCandidateTransition(candidate, transitionRaw(candidate, decision as string));
  assert.ok(event);
  return event;
}

function sealRaw(candidate: ReturnType<typeof captured>["candidate"]) {
  return {
    version: SERIAL_CANDIDATE_SEAL_AUTHORIZATION_VERSION,
    runId: candidate.runId,
    generation: candidate.generation,
    taskNumber: candidate.taskNumber,
    projectRootSha256: candidate.projectRootSha256,
    round: candidate.round,
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    candidateSha256: candidate.candidateSha256,
    bundleSha256: candidate.bundleSha256,
    evidenceStateSha256: candidate.evidenceStateSha256,
    requiredCriteriaComplete: true,
    confirmedBlockerCount: 0,
    nativeStopCount: 0,
  };
}

function awaitingRepair(mode: "required" | "optional" = "required") {
  const fixture = captured(mode);
  const allegation = advanceSerialCandidate(fixture.candidate, transition(fixture.candidate, "critic-allegation"));
  assert.ok(allegation);
  const candidate = advanceSerialCandidate(allegation, transition(allegation, "owner-confirmed"));
  assert.ok(candidate);
  const instruction = composeSerialRepairInstruction(fixture.root, candidate, {
    version: SERIAL_REPAIR_INSTRUCTION_VERSION,
    runId: candidate.runId,
    generation: candidate.generation,
    taskNumber: candidate.taskNumber,
    projectRootSha256: candidate.projectRootSha256,
    round: candidate.round,
    taskSpecSha256: candidate.taskSpecSha256,
    evidencePlanSha256: candidate.evidencePlanSha256,
    candidateSha256: candidate.candidateSha256,
    bundleSha256: candidate.bundleSha256,
    evidenceStateSha256: candidate.evidenceStateSha256,
    blockers: [{ criterionId: "c1", failureConditionId: "failure-c1", artifactIds: ["artifact-output"] }],
  });
  assert.ok(instruction);
  return { ...fixture, candidate, instruction };
}

function captureRoundOne(fixture: ReturnType<typeof awaitingRepair>, content = "repaired visible result\n") {
  writeFileSync(join(fixture.root, "visible.txt"), content);
  const result = captureSerialCandidateBundleAfterRepair(fixture.root, fixture.candidate, fixture.instruction, {
    baseHead: fixture.candidate.lineage.round0Bundle.baseHead,
    taskPaths: ["visible.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  if (!result.eligible) throw new Error(`round-one capture failed: ${result.reason}`);
  return result.bundle;
}

test("candidate authority accepts every critic mode but rejects structural clones", () => {
  for (const mode of ["required", "optional", "off"] as const) {
    const { authority } = quality(mode);
    assert.equal(isSerialCandidateTaskSpecAuthority(authority), true);
    assert.equal(isSerialCandidateTaskSpecAuthority(structuredClone(authority)), false);
    assert.equal(Object.isFrozen(authority), true);
  }
});

test("the package exposes only the prepared serial terminal transaction as a candidate writer", async () => {
  assert.equal(Object.hasOwn(publicCore, "beginSerialCandidateTerminal"), false);
  assert.equal(Object.hasOwn(publicCore, "completeSerialCandidateTerminal"), false);
  assert.equal(Object.hasOwn(publicCore, "composeSerialCandidate"), false);
  assert.equal(Object.hasOwn(publicCore, "captureSerialCandidateBundle"), false);
  assert.equal(Object.hasOwn(publicCore, "captureSerialCandidateBundleAfterRepair"), false);
  assert.equal(Object.hasOwn(publicCore, "composeSerialRepairInstruction"), false);
  assert.equal(typeof publicCore.authorizeSerialCandidateRepair, "function");
  assert.equal(typeof publicCore.captureSerialCandidateAfterRepair, "function");
  assert.equal(Object.hasOwn(publicCore, "finalizeSerialCandidate"), false);
  assert.equal(Object.hasOwn(publicCore, "stopSerialCandidate"), false);
  assert.equal(typeof publicCore.prepareSerialCandidateTerminal, "function");
  assert.equal(typeof publicCore.executeSerialCandidateTerminal, "function");
  assert.equal(typeof publicCore.reconcileSerialCandidateTerminalFromPending, "function");
  const forbiddenCandidateSubpath: string = "@cairn/core/dist/src/candidate.js";
  await assert.rejects(
    import(forbiddenCandidateSubpath),
    (error: unknown) => error instanceof Error && "code" in error
      && (error as NodeJS.ErrnoException).code === "ERR_PACKAGE_PATH_NOT_EXPORTED",
    "the package export map blocks a deep import of raw terminal tokens and capture mints",
  );
});

test("lossless bundles retain exact bytes, deletion metadata, distinct rounds, and no best label", () => {
  const root = repository();
  const { authority } = quality();
  writeFileSync(join(root, ".gitattributes"), "*.txt text eol=lf\n");
  git(root, ["add", "--", ".gitattributes"]);
  git(root, ["commit", "-q", "-m", "text normalization fixture"]);
  const exactRound0 = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("line one\r\nnaïve", "utf8")]);
  writeFileSync(join(root, "visible.txt"), exactRound0);
  writeFileSync(join(root, "delete.txt"), "remove me\n");
  git(root, ["add", "--", "delete.txt"]);
  git(root, ["commit", "-q", "-m", "tracked deletion fixture"]);
  unlinkSync(join(root, "delete.txt"));
  const baseHead = git(root, ["rev-parse", "HEAD"]);
  const round0 = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead,
    taskPaths: ["delete.txt", "visible.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.equal(round0.eligible, true);
  if (!round0.eligible) return;
  assert.deepEqual(Buffer.from(round0.bundle.entries[1].contentBase64!, "base64"), exactRound0);
  const rawOid = execFileSync("git", ["hash-object", "--stdin"], {
    cwd: root,
    input: exactRound0,
    encoding: "utf8",
  }).trim();
  assert.match(round0.bundle.entries[1].gitBlobOid!, /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u);
  assert.notEqual(round0.bundle.entries[1].gitBlobOid, rawOid,
    "the bundle separately binds Git's LF-normalized blob while preserving CRLF worktree bytes");
  assert.equal(round0.bundle.entries[0].state, "deleted");
  assert.match(round0.bundle.entries[0].baseBlobOid!, /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
  writeFileSync(join(root, "visible.txt"), "round one\n");
  const round1 = captureSerialCandidateBundle(root, authority, {
    round: 1,
    baseHead,
    taskPaths: ["delete.txt", "visible.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.equal(round1.eligible, true);
  if (!round1.eligible) return;
  assert.notEqual(round1.bundle.manifestSha256, round0.bundle.manifestSha256);
  assert.notEqual(round1.bundle.bundleSha256, round0.bundle.bundleSha256);
  assert.equal(isSerialCandidateBundle(round0.bundle), true);
  assert.equal(isSerialCandidateBundle(structuredClone(round0.bundle)), false);
  assert.equal(serialCandidateBundleSha256(round0.bundle), round0.bundle.bundleSha256);
  assert.doesNotMatch(JSON.stringify([round0, round1]), /best|winner/iu);
  assert.equal(Object.isFrozen(round0.bundle.entries), true);
});

test("bundle custody includes a staged-only Builder change", () => {
  const root = repository();
  const { authority } = quality();
  writeFileSync(join(root, "staged-only.txt"), "staged candidate bytes\n");
  git(root, ["add", "--", "staged-only.txt"]);
  const captured = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["staged-only.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.equal(captured.eligible, true);
  if (!captured.eligible) return;
  assert.equal(captured.bundle.entries.length, 1);
  assert.equal(captured.bundle.entries[0].projectRelativePath, "staged-only.txt");
  assert.equal(captured.bundle.entries[0].origin, "untracked");
  assert.equal(captured.bundle.entries[0].baseBlobOid, null);
  assert.equal(captured.bundle.entries[0].indexState, "present");
  assert.equal(captured.bundle.entries[0].indexRelation, "product");
  assert.equal(captured.bundle.entries[0].indexBlobOid, captured.bundle.entries[0].gitBlobOid);
  assert.equal(captured.bundle.entries[0].indexMode, captured.bundle.entries[0].gitMode);
  assert.equal(
    Buffer.from(captured.bundle.entries[0].contentBase64!, "base64").toString("utf8"),
    "staged candidate bytes\n",
  );
});

test("bundle hashes bind base-vs-product index custody while preserving identical worktree bytes", () => {
  const root = repository();
  const { authority } = quality();
  const baseHead = git(root, ["rev-parse", "HEAD"]);
  const baseOid = git(root, ["rev-parse", "HEAD:base.txt"]);
  writeFileSync(join(root, "base.txt"), "worktree B\n");
  const unstaged = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead,
    taskPaths: ["base.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.equal(unstaged.eligible, true);
  if (!unstaged.eligible) return;
  const unstagedEntry = unstaged.bundle.entries[0];
  assert.equal(unstagedEntry.indexRelation, "base");
  assert.equal(unstagedEntry.indexState, "present");
  assert.equal(unstagedEntry.indexBlobOid, baseOid);
  assert.equal(unstagedEntry.baseBlobOid, baseOid);
  assert.notEqual(unstagedEntry.gitBlobOid, baseOid);

  const candidate = composeSerialCandidate(authority, {
    version: SERIAL_CANDIDATE_VERSION,
    runId: "60000000-0000-4000-8000-000000000097",
    taskNumber: 1,
    requestSha256: "a".repeat(64),
    claimsText: claimsText(authority.taskSpecSha256),
    bundle: unstaged.bundle,
    repairEligibility: null,
  });
  assert.ok(candidate);

  git(root, ["add", "--", "base.txt"]);
  assert.equal(serialCandidateWorkspaceStillExact(root, candidate), false,
    "index-only drift invalidates freshness even though worktree bytes did not change");
  const staged = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead,
    taskPaths: ["base.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.equal(staged.eligible, true);
  if (!staged.eligible) return;
  const stagedEntry = staged.bundle.entries[0];
  assert.equal(stagedEntry.indexRelation, "product");
  assert.equal(stagedEntry.indexBlobOid, stagedEntry.gitBlobOid);
  assert.equal(stagedEntry.contentBase64, unstagedEntry.contentBase64,
    "the lossless worktree payload is unchanged while only index custody changes");
  assert.notEqual(staged.bundle.manifestSha256, unstaged.bundle.manifestSha256);
  assert.notEqual(staged.bundle.bundleSha256, unstaged.bundle.bundleSha256);
});

test("third-state partial staging is rejected without reading or leaking staged unsafe bytes", () => {
  const root = repository();
  const { authority } = quality();
  const baseHead = git(root, ["rev-parse", "HEAD"]);
  const stagedCanary = "THIRD-STATE-STAGED-SECRET-CANARY-81927";
  writeFileSync(join(root, "base.txt"), `${stagedCanary}\n`);
  git(root, ["add", "--", "base.txt"]);
  writeFileSync(join(root, "base.txt"), "safe worktree B\n");
  const captured = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead,
    taskPaths: ["base.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.deepEqual(captured, { eligible: false, reason: "INDEX_STATE_UNSAFE" });
  assert.doesNotMatch(JSON.stringify(captured), /base\.txt|THIRD-STATE|81927/u);
  assert.equal(Object.hasOwn(captured, "bundle"), false);
});

test("bundle custody preserves a staged deletion against the frozen base tree", () => {
  const root = repository();
  const { authority } = quality();
  unlinkSync(join(root, "base.txt"));
  git(root, ["add", "--", "base.txt"]);
  const captured = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["base.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.equal(captured.eligible, true);
  if (!captured.eligible) return;
  assert.equal(captured.bundle.entries[0].state, "deleted");
  assert.equal(captured.bundle.entries[0].origin, "tracked");
  assert.match(captured.bundle.entries[0].baseBlobOid!, /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u);
  assert.equal(captured.bundle.entries[0].indexState, "absent");
  assert.equal(captured.bundle.entries[0].indexRelation, "product");
});

test("unsafe bundle capture is all-or-nothing and leaks neither rejected path nor content", () => {
  const cases: Array<Readonly<{
    path: string;
    content: string | Buffer;
    prepare?: (root: string, path: string) => void;
  }>> = [
    { path: "keys/private.pem", content: "-----BEGIN PRIVATE KEY-----\nCANARY-PRIVATE\n" },
    { path: "dist/generated.txt", content: "CANARY-GENERATED\n" },
    { path: "image.png", content: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
    { path: "ordinary.txt", content: "api_key = 'CANARY-CREDENTIAL-1234567890'\n" },
  ];
  for (const item of cases) {
    const root = repository();
    const { authority } = quality();
    writeFileSync(join(root, "safe-first.txt"), "safe first\n");
    const parts = item.path.split("/");
    if (parts.length > 1) {
      mkdirSync(join(root, ...parts.slice(0, -1)), { recursive: true });
    }
    writeFileSync(join(root, ...parts), item.content);
    item.prepare?.(root, item.path);
    const result = captureSerialCandidateBundle(root, authority, {
      round: 0,
      baseHead: git(root, ["rev-parse", "HEAD"]),
      taskPaths: [item.path, "safe-first.txt"].sort(),
      protectedPaths: [],
      ownedPaths: [],
    });
    assert.equal(result.eligible, false, item.path);
    const rendered = JSON.stringify(result);
    assert.equal(Object.hasOwn(result, "bundle"), false);
    assert.equal(rendered.includes(item.path), false);
    assert.doesNotMatch(rendered, /CANARY/iu);
    assert.equal(Object.isFrozen(result), true);
  }
});

test("forced-tracked ignored files cannot enter a bundle", () => {
  const root = repository();
  const { authority } = quality();
  writeFileSync(join(root, ".gitignore"), "ignored.txt\n");
  writeFileSync(join(root, "ignored.txt"), "ignored canary\n");
  git(root, ["add", "--", ".gitignore"]);
  git(root, ["add", "-f", "--", "ignored.txt"]);
  git(root, ["commit", "-q", "-m", "ignored tracked fixture"]);
  writeFileSync(join(root, "ignored.txt"), "changed ignored canary\n");
  const ignored = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["ignored.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.deepEqual(ignored, { eligible: false, reason: "PATH_IGNORED" });
});

test("reserved-name clean filters cannot execute during canonical blob binding", () => {
  const root = repository();
  const { authority } = quality();
  writeFileSync(join(root, ".gitattributes"), "filtered.txt filter=unspecified\n");
  git(root, ["add", "--", ".gitattributes"]);
  git(root, ["commit", "-q", "-m", "reserved filter fixture"]);
  git(root, ["config", "filter.unspecified.clean", "printf FILTER-RAN > filter-ran.txt; cat"]);
  git(root, ["config", "filter.unspecified.required", "true"]);
  writeFileSync(join(root, "filtered.txt"), "ordinary safe text\n");
  const result = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["filtered.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.equal(existsSync(join(root, "filter-ran.txt")), false, "the planted clean command never executes");
  if (!result.eligible) assert.equal(Object.hasOwn(result, "bundle"), false);
});

test("candidate artifacts stay capped at 100 while Cairn can protect its bounded task history", () => {
  const root = repository();
  const { authority } = quality();
  writeFileSync(join(root, "visible.txt"), "visible candidate\n");
  const protectedPaths = Array.from(
    { length: SERIAL_CANDIDATE_BUNDLE_LIMITS.paths + 1 },
    (_, index) => `docs/history/${String(index).padStart(4, "0")}.md`,
  );
  const accepted = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["visible.txt"],
    protectedPaths,
    ownedPaths: [],
  });
  assert.equal(accepted.eligible, true, "historical protection rows are not candidate artifacts");

  const overCap = Array.from(
    { length: SERIAL_CANDIDATE_BUNDLE_LIMITS.protectedPaths + 1 },
    (_, index) => `docs/history/${String(index).padStart(5, "0")}.md`,
  );
  assert.deepEqual(captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["visible.txt"],
    protectedPaths: overCap,
    ownedPaths: [],
  }), { eligible: false, reason: "INVALID_CAPTURE_CONTEXT" });
});

test("ignored writes disable repair without hiding the candidate or retaining ignored data", () => {
  const root = repository();
  const fixture = quality("required");
  writeFileSync(join(root, ".gitignore"), "ignored-output.txt\n");
  git(root, ["add", "--", ".gitignore"]);
  git(root, ["commit", "-q", "-m", "ignored boundary fixture"]);
  const boundary = captureSerialCandidateIgnoredBoundary(root);
  assert.ok(boundary, "the ignored tree starts empty");

  writeFileSync(join(root, "visible.txt"), "visible candidate\n");
  writeFileSync(join(root, "ignored-output.txt"), "CANARY-IGNORED-SECRET\n");
  const capture = captureSerialCandidateBundle(root, fixture.authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["visible.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.equal(capture.eligible, true, "Git-visible candidate bytes remain inspectable");
  if (!capture.eligible) return;
  assert.equal(composeSerialCandidateRepairEligibility(root, boundary, capture.bundle), null,
    "the new ignored artifact prevents an ignored-write-set-clear proof");
  const candidate = composeSerialCandidate(fixture.authority, {
    version: SERIAL_CANDIDATE_VERSION,
    runId: "60000000-0000-4000-8000-000000000099",
    taskNumber: 1,
    requestSha256: "a".repeat(64),
    claimsText: claimsText(fixture.authority.taskSpecSha256),
    bundle: capture.bundle,
    repairEligibility: null,
  });
  assert.ok(candidate);
  assert.equal(candidate.repairEligibility, null);
  assert.equal(candidate.repairUnavailableReason, "IGNORED_WRITE_SET_UNAVAILABLE");
  const allegation = advanceSerialCandidate(candidate, transition(candidate, "critic-allegation"));
  assert.ok(allegation);
  assert.equal(advanceSerialCandidate(allegation, transition(allegation, "owner-confirmed")), null,
    "a confirmed allegation cannot enter repair without ignored-write custody");
  assert.doesNotMatch(JSON.stringify(candidate), /ignored-output|CANARY-IGNORED-SECRET/iu);

  const existingRoot = repository();
  writeFileSync(join(existingRoot, ".gitignore"), "already-ignored.txt\n");
  writeFileSync(join(existingRoot, "already-ignored.txt"), "preexisting ignored bytes\n");
  assert.equal(captureSerialCandidateIgnoredBoundary(existingRoot), null,
    "a preexisting ignored tree is honestly unprovable without reading it");
});

test("repair instruction freshness catches an ignored write added while the candidate waits", () => {
  const root = repository();
  const fixture = quality("off");
  writeFileSync(join(root, ".gitignore"), "ignored-late.txt\n");
  git(root, ["add", "--", ".gitignore"]);
  git(root, ["commit", "-q", "-m", "fresh ignored boundary"]);
  const boundary = captureSerialCandidateIgnoredBoundary(root);
  assert.ok(boundary);
  writeFileSync(join(root, "visible.txt"), "visible candidate\n");
  const capture = captureSerialCandidateBundle(root, fixture.authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["visible.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.equal(capture.eligible, true);
  if (!capture.eligible) return;
  const eligibility = composeSerialCandidateRepairEligibility(root, boundary, capture.bundle);
  assert.ok(eligibility);
  const initial = composeSerialCandidate(fixture.authority, {
    version: SERIAL_CANDIDATE_VERSION,
    runId: "60000000-0000-4000-8000-000000000098",
    taskNumber: 1,
    requestSha256: "a".repeat(64),
    claimsText: claimsText(fixture.authority.taskSpecSha256),
    bundle: capture.bundle,
    repairEligibility: eligibility,
  });
  assert.ok(initial);
  const repair = advanceSerialCandidate(initial, transition(initial, "required-check-failure-confirmed"));
  assert.ok(repair);
  assert.equal(serialCandidateRepairAvailability(repair), "available");
  writeFileSync(join(root, "ignored-late.txt"), "CANARY-LATE-IGNORED\n");
  assert.equal(serialCandidateWorkspaceStillExact(root, repair), true,
    "the product bundle remains exact; ignored custody is a separate repair-only predicate");
  const instructionRaw = {
    version: SERIAL_REPAIR_INSTRUCTION_VERSION,
    runId: repair.runId,
    generation: repair.generation,
    taskNumber: repair.taskNumber,
    projectRootSha256: repair.projectRootSha256,
    round: repair.round,
    taskSpecSha256: repair.taskSpecSha256,
    evidencePlanSha256: repair.evidencePlanSha256,
    candidateSha256: repair.candidateSha256,
    bundleSha256: repair.bundleSha256,
    evidenceStateSha256: repair.evidenceStateSha256,
    blockers: [{ criterionId: "c1", failureConditionId: "failure-c1", artifactIds: ["artifact-output"] }],
  };
  assert.equal(composeSerialRepairInstruction(root, repair, instructionRaw), null);
  assert.equal(serialCandidateRepairAvailability(repair), "unavailable");
  rmSync(join(root, "ignored-late.txt"));
  assert.equal(composeSerialRepairInstruction(root, repair, instructionRaw), null,
    "once an ignored write is observed, deleting it cannot restore repair authority");
});

test("linked files cannot enter a bundle", { skip: process.platform === "win32" ? "symlink creation is not reliably available without developer mode" : false }, () => {
  const root = repository();
  const { authority } = quality();
  writeFileSync(join(root, "target.txt"), "target\n");
  symlinkSync("target.txt", join(root, "linked.txt"));
  const linked = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["linked.txt", "target.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.equal(linked.eligible, false);
  assert.doesNotMatch(JSON.stringify(linked), /linked\.txt|target\.txt/iu);
});

test("a tracked file replaced by a dangling link is not misclassified as a deletion", {
  skip: process.platform === "win32" ? "file symlinks require a Windows privilege not guaranteed in CI" : false,
}, () => {
  const root = repository();
  const { authority } = quality();
  writeFileSync(join(root, "tracked.txt"), "tracked base\n");
  git(root, ["add", "--", "tracked.txt"]);
  git(root, ["commit", "-q", "-m", "tracked link fixture"]);
  unlinkSync(join(root, "tracked.txt"));
  symlinkSync("missing-target.txt", join(root, "tracked.txt"));
  const result = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["tracked.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.deepEqual(result, { eligible: false, reason: "PATH_LINKED" });
});

test("a tracked nested file behind a linked parent is not misclassified as a deletion", {
  skip: process.platform === "win32" ? "directory symlinks require a Windows privilege not guaranteed in CI" : false,
}, () => {
  const root = repository();
  const { authority } = quality();
  mkdirSync(join(root, "nested"));
  writeFileSync(join(root, "nested", "tracked.txt"), "tracked base\n");
  git(root, ["add", "--", "nested/tracked.txt"]);
  git(root, ["commit", "-q", "-m", "tracked parent link fixture"]);
  rmSync(join(root, "nested"), { recursive: true });
  symlinkSync("missing-directory", join(root, "nested"));
  const result = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["nested/tracked.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.deepEqual(result, { eligible: false, reason: "PATH_LINKED" });
});

test("hardlinked candidate bytes are rejected instead of aliasing a protected file", () => {
  const root = repository();
  const { authority } = quality();
  writeFileSync(join(root, "protected.txt"), "protected bytes\n");
  git(root, ["add", "--", "protected.txt"]);
  git(root, ["commit", "-q", "-m", "hardlink base"]);
  linkSync(join(root, "protected.txt"), join(root, "candidate.txt"));
  const result = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["candidate.txt"],
    protectedPaths: ["protected.txt"],
    ownedPaths: [],
  });
  assert.deepEqual(result, { eligible: false, reason: "PATH_LINKED" });
});

test("a tracked executable-bit change is retained from the worktree, not the old index mode", {
  skip: process.platform === "win32" ? "Git for Windows does not carry POSIX executable-bit changes" : false,
}, () => {
  const root = repository();
  const { authority } = quality();
  writeFileSync(join(root, "mode.sh"), "#!/bin/sh\nexit 0\n");
  chmodSync(join(root, "mode.sh"), 0o644);
  git(root, ["add", "--", "mode.sh"]);
  git(root, ["commit", "-q", "-m", "mode fixture"]);
  chmodSync(join(root, "mode.sh"), 0o755);
  const result = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["mode.sh"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.equal(result.eligible, true);
  if (result.eligible) {
    assert.equal(result.bundle.entries[0].executable, true);
    assert.equal(result.bundle.entries[0].gitMode, "100755");
  }
});

test("lossless worktree mode and Git's canonical mode stay separate when core.fileMode is false", () => {
  const root = repository();
  const { authority } = quality();
  git(root, ["config", "core.fileMode", "false"]);
  writeFileSync(join(root, "mode.sh"), "#!/bin/sh\nexit 0\n");
  chmodSync(join(root, "mode.sh"), 0o644);
  git(root, ["add", "--", "mode.sh"]);
  git(root, ["update-index", "--chmod=+x", "--", "mode.sh"]);
  git(root, ["commit", "-q", "-m", "canonical executable fixture"]);
  writeFileSync(join(root, "mode.sh"), "#!/bin/sh\necho changed\n");
  const result = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["mode.sh"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.equal(result.eligible, true);
  if (!result.eligible) return;
  assert.equal(result.bundle.entries[0].executable, false, "the bundle preserves the actual worktree mode");
  assert.equal(result.bundle.entries[0].gitMode, "100755", "Git will retain the tracked index mode when fileMode is false");
});

test("bundle byte caps reject without truncating or retaining a partial safe entry", () => {
  const root = repository();
  const { authority } = quality();
  writeFileSync(join(root, "a-safe.txt"), "safe\n");
  writeFileSync(join(root, "z-large.txt"), Buffer.alloc(256 * 1024 + 1, 0x61));
  const result = captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: ["a-safe.txt", "z-large.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.deepEqual(result, { eligible: false, reason: "ARTIFACT_UNBOUNDED" });
  assert.equal(Object.hasOwn(result, "bundle"), false);
  assert.doesNotMatch(JSON.stringify(result), /a-safe|z-large|safe/iu);
});

test("mode mapping, transitions, stale generations, clones, and seal gate fail closed", () => {
  const required = captured("required").candidate;
  const optionalFixture = captured("optional");
  const optional = optionalFixture.candidate;
  const off = captured("off").candidate;
  assert.equal(required.phase, "awaiting-critic");
  assert.equal(optional.phase, "awaiting-critic");
  assert.equal(off.phase, "ready-to-seal");
  assert.equal(serialCandidateSha256(off), off.candidateSha256);
  assert.equal(isCurrentSerialCandidate(structuredClone(off)), false);
  assert.notEqual(serialCandidateLineageIdentity(off), serialCandidateLineageIdentity(optional),
    "separate compose calls have distinct opaque lineage even when public run fields repeat");

  const duplicate = composeSerialCandidate(optionalFixture.authority, {
    version: SERIAL_CANDIDATE_VERSION,
    runId: optional.runId,
    taskNumber: optional.taskNumber,
    requestSha256: optional.requestSha256,
    claimsText: claimsText(optional.taskSpecSha256),
    bundle: optional.bundle,
    repairEligibility: optional.repairEligibility,
  });
  assert.ok(duplicate);
  assert.equal(duplicate.candidateSha256, optional.candidateSha256);
  const duplicateDecline = transition(duplicate, "optional-critic-declined");
  assert.equal(advanceSerialCandidate(optional, duplicateDecline), null,
    "a branded transition belongs to one opaque candidate lineage even when every public digest matches");

  const decline = transition(optional, "optional-critic-declined");
  const optionalReady = advanceSerialCandidate(optional, decline);
  assert.ok(optionalReady);
  assert.equal(optionalReady.phase, "ready-to-seal");
  assert.equal(optionalReady.callsUsed.critic, 0);
  assert.equal(serialCandidateLineageIdentity(optionalReady), serialCandidateLineageIdentity(optional));
  assert.equal(Object.isFrozen(serialCandidateLineageIdentity(optionalReady)!), true);
  assert.equal(serialCandidateLineageIdentity(structuredClone(optionalReady)), null);
  assert.equal(isCurrentSerialCandidate(optional), false);
  assert.equal(advanceSerialCandidate(optional, decline), null);
  assert.equal(advanceSerialCandidate(structuredClone(optionalReady), transition(optionalReady, "critic-clear")), null);
  assert.equal(composeSerialCandidateTransition(optionalReady, { ...transitionRaw(optionalReady, "critic-clear"), generation: -0 }), null);

  assert.equal(advanceSerialCandidate(required, transition(required, "optional-critic-declined")), null,
    "a required critic cannot be declined into seal readiness");
  const allegation = advanceSerialCandidate(required, transition(required, "critic-allegation"));
  assert.ok(allegation);
  assert.equal(allegation.phase, "awaiting-owner-resolution");
  assert.equal(allegation.callsUsed.critic, 1);
  const repair = advanceSerialCandidate(allegation, transition(allegation, "owner-confirmed"));
  assert.ok(repair);
  assert.equal(repair.phase, "awaiting-repair");

  assert.equal(composeSerialCandidateSealAuthorization(required, sealRaw(required)), null);
  const wrong = { ...sealRaw(optionalReady), candidateSha256: "0".repeat(64) };
  assert.equal(composeSerialCandidateSealAuthorization(optionalReady, wrong), null);
  assert.equal(composeSerialCandidateSealAuthorization(optionalReady, { ...sealRaw(optionalReady), requiredCriteriaComplete: false }), null);
  assert.equal(composeSerialCandidateSealAuthorization(optionalReady, { ...sealRaw(optionalReady), confirmedBlockerCount: -0 }), null);
  const seal = composeSerialCandidateSealAuthorization(optionalReady, sealRaw(optionalReady));
  assert.ok(seal);
  assert.equal(beginSerialCandidateTerminal(optionalReady, "DONE", structuredClone(seal)), null);
  const token = beginSerialCandidateTerminal(optionalReady, "DONE", seal);
  assert.ok(token);
  assert.equal(beginSerialCandidateTerminal(optionalReady, "DONE", seal), null);
  const terminal = completeSerialCandidateTerminal(token, "STOPPED");
  assert.equal(terminal?.phase, "stopped", "a failed DONE transaction may only downgrade");
  assert.equal(completeSerialCandidateTerminal(token), null);
  assert.equal(beginSerialCandidateTerminal(terminal, "STOPPED"), null, "a terminal candidate cannot terminalize twice");
});

test("an authenticated required-check failure enters one repair phase in every critic mode", () => {
  for (const mode of ["required", "optional", "off"] as const) {
    const initial = captured(mode).candidate;
    const event = transition(initial, "required-check-failure-confirmed");
    const repair = advanceSerialCandidate(initial, event);
    assert.ok(repair, mode);
    assert.equal(repair.phase, "awaiting-repair", mode);
    assert.equal(repair.callsUsed.critic, 0, mode);
    assert.equal(advanceSerialCandidate(initial, event), null, `${mode} event is one-use and its source generation is stale`);
    assert.equal(advanceSerialCandidate(repair, transition(repair, "required-check-failure-confirmed")), null,
      `${mode} cannot authorize a second repair phase`);
  }
});

test("repair instructions derive only frozen cN authority and typed artifacts", () => {
  const initialFixture = captured("required");
  const initial = initialFixture.candidate;
  const allegation = advanceSerialCandidate(initial, transition(initial, "critic-allegation"));
  assert.ok(allegation);
  const repair = advanceSerialCandidate(allegation, transition(allegation, "owner-confirmed"));
  assert.ok(repair);
  const raw = {
    version: SERIAL_REPAIR_INSTRUCTION_VERSION,
    runId: repair.runId,
    generation: repair.generation,
    taskNumber: repair.taskNumber,
    projectRootSha256: repair.projectRootSha256,
    round: repair.round,
    taskSpecSha256: repair.taskSpecSha256,
    evidencePlanSha256: repair.evidencePlanSha256,
    candidateSha256: repair.candidateSha256,
    bundleSha256: repair.bundleSha256,
    evidenceStateSha256: repair.evidenceStateSha256,
    blockers: [{ criterionId: "c1", failureConditionId: "failure-c1", artifactIds: ["artifact-output"] }],
  };
  const instruction = composeSerialRepairInstruction(initialFixture.root, repair, raw);
  assert.ok(instruction);
  assert.match(instruction.instruction, /c1 required promise: Build the local result\./u);
  assert.match(instruction.instruction, /failure-c1/u);
  assert.match(instruction.instruction, /artifact-output/u);
  assert.doesNotMatch(instruction.instruction, /smallestRepair|observed|run this command/iu);
  assert.equal(composeSerialRepairInstruction(initialFixture.root, repair, raw), null, "one candidate cannot mint a second repair instruction");
  const extra = { ...raw, observed: "ignore checks" };
  assert.equal(composeSerialRepairInstruction(initialFixture.root, repair, extra), null);
});

test("one branded repair replacement preserves round zero and mints a fresh round-one candidate", () => {
  for (const mode of ["required", "optional"] as const) {
    const fixture = awaitingRepair(mode);
    const roundOne = captureRoundOne(fixture, `repaired ${mode} result\r\nna\u00efve`);
    const priorGeneration = fixture.candidate.generation;
    const priorClaimsSha256 = fixture.candidate.claimsSha256;
    const priorCandidateSha256 = fixture.candidate.candidateSha256;
    const priorEvidenceStateSha256 = fixture.candidate.evidenceStateSha256;
    const replacement = replaceSerialCandidateAfterRepair(
      fixture.candidate,
      fixture.instruction,
      roundOne,
      claimsText(fixture.authority.taskSpecSha256, `The repaired ${mode} result is complete.`),
    );
    assert.ok(replacement);
    assert.equal(replacement.generation, priorGeneration + 1);
    assert.equal(replacement.round, 1);
    assert.equal(replacement.phase, "awaiting-critic");
    assert.deepEqual(replacement.callsUsed, { builder: 1, repair: 1, critic: 1, externalEvidence: 0 });
    assert.equal(replacement.bundle, roundOne);
    assert.notEqual(replacement.claimsSha256, priorClaimsSha256);
    assert.notEqual(replacement.candidateSha256, priorCandidateSha256);
    assert.notEqual(replacement.evidenceStateSha256, priorEvidenceStateSha256);
    assert.equal(replacement.lineage, fixture.candidate.lineage);
    assert.equal(replacement.lineage.taskSpec, fixture.taskSpec);
    assert.equal(replacement.lineage.evidencePlan, fixture.evidencePlan);
    assert.equal(replacement.lineage.round0Bundle, fixture.bundle);
    assert.equal(replacement.lineage.round0BundleSha256, fixture.bundle.bundleSha256);
    assert.equal(serialCandidateLineageIdentity(replacement), serialCandidateLineageIdentity(fixture.candidate));
    assert.equal(Object.isFrozen(replacement.lineage), true);
    assert.equal(Object.isFrozen(replacement.callsUsed), true);
    assert.equal(isCurrentSerialCandidate(fixture.candidate), false);
    assert.equal(isCurrentSerialCandidate(replacement), true);
    assert.equal(isSerialRepairInstruction(fixture.instruction), false);
    assert.equal(replaceSerialCandidateAfterRepair(
      fixture.candidate,
      fixture.instruction,
      roundOne,
      claimsText(fixture.authority.taskSpecSha256, "Replay must fail."),
    ), null);
    const postRepairAllegation = advanceSerialCandidate(replacement, transition(replacement, "critic-allegation"));
    assert.ok(postRepairAllegation);
    assert.equal(postRepairAllegation.callsUsed.critic, 2);
    assert.ok(postRepairAllegation.callsUsed.critic <= 3);
    const dismissed = advanceSerialCandidate(postRepairAllegation, transition(postRepairAllegation, "owner-dismissed"));
    assert.ok(dismissed);
    assert.equal(advanceSerialCandidate(dismissed, transition(dismissed, "critic-allegation")), null,
      "a sealed-path candidate cannot consume an undeclared fourth-style critic turn");
  }
});

test("pending repair restoration recomputes the exact instruction and round-one bundle brands", () => {
  const fixture = awaitingRepair("required");
  const roundOne = captureRoundOne(fixture, "restart-visible round one\n");
  const repairedClaims = claimsText(fixture.authority.taskSpecSha256, "Restarted repair is complete.");
  const replacement = replaceSerialCandidateAfterRepair(
    fixture.candidate,
    fixture.instruction,
    roundOne,
    repairedClaims,
  );
  assert.ok(replacement);
  const custody = serialCandidatePendingRepairLineage(replacement);
  assert.ok(custody);
  assert.equal(custody.preRepairCandidate, fixture.candidate);
  assert.equal(custody.postRepairCandidate, replacement);
  assert.deepEqual(custody.preRepairTransitionHistory, ["critic-allegation", "owner-confirmed"]);
  assert.equal(custody.repairInstruction.repairInstructionSha256, fixture.instruction.repairInstructionSha256);
  assert.equal(custody.roundOneBundle, roundOne);
  assert.deepEqual(custody.roundOneCaptureContext.taskPaths, ["visible.txt"]);

  const initial = composeSerialCandidate(fixture.authority, {
    version: SERIAL_CANDIDATE_VERSION,
    runId: fixture.candidate.runId,
    taskNumber: fixture.candidate.taskNumber,
    requestSha256: fixture.candidate.requestSha256,
    claimsText: claimsText(fixture.authority.taskSpecSha256),
    bundle: fixture.bundle,
    repairEligibility: fixture.candidate.lineage.ignoredWriteEligibility,
  });
  assert.ok(initial);
  const alleged = advanceSerialCandidate(initial, transition(initial, "critic-allegation"));
  assert.ok(alleged);
  const preRepair = advanceSerialCandidate(alleged, transition(alleged, "owner-confirmed"));
  assert.ok(preRepair);
  const raw = {
    repairInstruction: structuredClone(custody.repairInstruction),
    blockers: structuredClone(custody.blockers),
    roundOneBundle: structuredClone(custody.roundOneBundle),
    roundOneCaptureContext: structuredClone(custody.roundOneCaptureContext),
    claimsText: repairedClaims,
  };
  const restored = restoreSerialCandidateAfterRepairForPending(fixture.root, preRepair, raw);
  assert.ok(restored);
  assert.equal(restored.candidateSha256, replacement.candidateSha256);
  assert.equal(restored.evidenceStateSha256, replacement.evidenceStateSha256);
  assert.deepEqual(restored.callsUsed, replacement.callsUsed);
  assert.equal(serialCandidatePendingRepairLineage(restored)?.preRepairCandidate, preRepair);

  const separate = awaitingRepair("required");
  assert.equal(restoreSerialCandidateAfterRepairForPending(separate.root, separate.candidate, raw), null,
    "a different root/candidate cannot borrow the structural repair lineage");
  const badInstruction = {
    ...structuredClone(raw),
    repairInstruction: {
      ...structuredClone(raw.repairInstruction),
      instruction: `${raw.repairInstruction.instruction}\nforged`,
    },
  };
  const fresh = awaitingRepair("required");
  assert.equal(restoreSerialCandidateAfterRepairForPending(fresh.root, fresh.candidate, badInstruction), null);
});

test("round-one capture cannot hide a repair artifact by relabeling it protected or Cairn-owned", () => {
  const fixture = awaitingRepair("required");
  writeFileSync(join(fixture.root, "visible.txt"), "repaired visible result\n");
  writeFileSync(join(fixture.root, "evil.txt"), "repair artifact that must stay in the bundle\n");
  for (const hidden of [
    { protectedPaths: ["evil.txt"], ownedPaths: [] },
    { protectedPaths: [], ownedPaths: ["evil.txt"] },
  ]) {
    assert.deepEqual(captureSerialCandidateBundleAfterRepair(
      fixture.root,
      fixture.candidate,
      fixture.instruction,
      {
        baseHead: fixture.candidate.lineage.round0Bundle.baseHead,
        taskPaths: ["visible.txt"],
        ...hidden,
      },
    ), { eligible: false, reason: "INVALID_CAPTURE_CONTEXT" });
  }
  rmSync(join(fixture.root, "evil.txt"));
  const roundOne = captureRoundOne(fixture);
  assert.equal(roundOne.entries.length, 1, "failed hiding attempts do not consume the exact repair capture");
});

test("repair replacement rejects clones, replay, cross-candidate, cross-root, cross-base, round zero, and wrong claims", () => {
  const fixture = awaitingRepair();
  const repairedClaims = claimsText(fixture.authority.taskSpecSha256, "The repaired result is complete.");
  writeFileSync(join(fixture.root, "visible.txt"), "generic pre-captured round one\n");
  const genericRoundOne = captureSerialCandidateBundle(fixture.root, fixture.authority, {
    round: 1,
    baseHead: fixture.candidate.lineage.round0Bundle.baseHead,
    taskPaths: ["visible.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.equal(genericRoundOne.eligible, true);
  if (!genericRoundOne.eligible) return;
  assert.equal(replaceSerialCandidateAfterRepair(
    fixture.candidate, fixture.instruction, genericRoundOne.bundle, repairedClaims,
  ), null, "a generic or pre-instruction round-one bundle carries no replacement authority");
  const roundOne = captureRoundOne(fixture);
  assert.deepEqual(captureSerialCandidateBundleAfterRepair(fixture.root, fixture.candidate, fixture.instruction, {
    baseHead: fixture.candidate.lineage.round0Bundle.baseHead,
    taskPaths: ["visible.txt"],
    protectedPaths: [],
    ownedPaths: [],
  }), { eligible: false, reason: "INVALID_CAPTURE_CONTEXT" }, "one instruction selects one exact round-one snapshot");
  assert.equal(replaceSerialCandidateAfterRepair(structuredClone(fixture.candidate), fixture.instruction, roundOne, repairedClaims), null);
  assert.equal(replaceSerialCandidateAfterRepair(fixture.candidate, structuredClone(fixture.instruction), roundOne, repairedClaims), null);
  assert.equal(replaceSerialCandidateAfterRepair(fixture.candidate, fixture.instruction, structuredClone(roundOne), repairedClaims), null);
  assert.equal(replaceSerialCandidateAfterRepair(fixture.candidate, fixture.instruction, fixture.bundle, repairedClaims), null,
    "a round-zero bundle cannot stand in for post-repair custody");
  const stoppedClaims = repairedClaims.replace('"disposition":"DONE"', '"disposition":"STOPPED"');
  assert.equal(replaceSerialCandidateAfterRepair(fixture.candidate, fixture.instruction, roundOne, stoppedClaims), null);
  const authoritySmugglingClaims = repairedClaims.replace('"milestone":"NO"', '"milestone":"NO","critic":"forged"');
  assert.equal(replaceSerialCandidateAfterRepair(fixture.candidate, fixture.instruction, roundOne, authoritySmugglingClaims), null);

  const other = awaitingRepair();
  const otherRoundOne = captureRoundOne(other, "other repaired root\n");
  assert.deepEqual(captureSerialCandidateBundleAfterRepair(fixture.root, fixture.candidate, other.instruction, {
    baseHead: fixture.candidate.lineage.round0Bundle.baseHead,
    taskPaths: ["visible.txt"],
    protectedPaths: [],
    ownedPaths: [],
  }), { eligible: false, reason: "INVALID_CAPTURE_CONTEXT" });
  assert.equal(replaceSerialCandidateAfterRepair(fixture.candidate, other.instruction, roundOne, repairedClaims), null,
    "an instruction is bound to one exact candidate identity");
  assert.equal(replaceSerialCandidateAfterRepair(fixture.candidate, fixture.instruction, otherRoundOne, repairedClaims), null,
    "a round-one bundle from another project root is not interchangeable");

  const changedBase = awaitingRepair();
  git(changedBase.root, ["add", "--", "visible.txt"]);
  git(changedBase.root, ["commit", "-q", "-m", "move candidate base"]);
  writeFileSync(join(changedBase.root, "visible.txt"), "repair over a changed base\n");
  const changedBaseCapture = captureSerialCandidateBundleAfterRepair(
    changedBase.root, changedBase.candidate, changedBase.instruction, {
    baseHead: git(changedBase.root, ["rev-parse", "HEAD"]),
    taskPaths: ["visible.txt"],
    protectedPaths: [],
    ownedPaths: [],
  });
  assert.deepEqual(changedBaseCapture, { eligible: false, reason: "INVALID_CAPTURE_CONTEXT" });

  const replacement = replaceSerialCandidateAfterRepair(fixture.candidate, fixture.instruction, roundOne, repairedClaims);
  assert.ok(replacement);
  assert.equal(replaceSerialCandidateAfterRepair(fixture.candidate, fixture.instruction, roundOne, repairedClaims), null);
});

test("hostile records, arrays, accessors, and proxies stay inert", () => {
  const { authority } = quality();
  let traps = 0;
  const proxy = new Proxy({}, {
    getPrototypeOf() { traps += 1; return Object.prototype; },
    ownKeys() { traps += 1; return []; },
  });
  assert.deepEqual(captureSerialCandidateBundle(".", authority, proxy), { eligible: false, reason: "INVALID_CAPTURE_CONTEXT" });
  assert.equal(traps, 0, "Proxy rejection happens before reflection");

  const accessor: Record<string, unknown> = {
    version: SERIAL_CANDIDATE_VERSION,
    runId: RUN_ID,
    taskNumber: 1,
    requestSha256: "a".repeat(64),
    claimsText: "x",
    bundle: null,
    repairEligibility: null,
  };
  let reads = 0;
  Object.defineProperty(accessor, "claimsText", { enumerable: true, get() { reads += 1; return "x"; } });
  assert.equal(composeSerialCandidate(authority, accessor), null);
  assert.equal(reads, 0);

  const sparse: unknown[] = [];
  sparse.length = 1;
  const root = repository();
  assert.deepEqual(captureSerialCandidateBundle(root, authority, {
    round: 0,
    baseHead: git(root, ["rev-parse", "HEAD"]),
    taskPaths: sparse,
    protectedPaths: [],
    ownedPaths: [],
  }), { eligible: false, reason: "INVALID_CAPTURE_CONTEXT" });
});
