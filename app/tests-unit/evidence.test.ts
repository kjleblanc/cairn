import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  EVIDENCE_PLAN_CANDIDATE_VERSION,
  bindInitialEvidencePlan,
  bindTaskIntent,
  evidencePlanSha256,
  parseTaskIntentCandidate,
  taskSpecSha256,
  type EvidenceCommandCandidateV1,
  type EvidencePlanV1,
  type TaskSpecV1,
} from "@cairn/core";
import {
  composeConversationTaskSpecProposal,
  parseConductorQualityProposal,
} from "../src/main/conductor/qualityproposal.js";
import {
  discardUnfinalizedEvidenceRun,
  evidenceRunRecordPath,
  finalizeEvidenceRun,
  isMainAdapterCommandEvidenceReduction,
  parsePendingEvidenceRunState,
  pendingEvidenceRunState,
  pendingEvidenceRunStillExact,
  readEvidenceAlbum,
  readEvidenceImage,
  recordEvidenceCapture,
  reduceAdapterCommandEvidence,
  setEvidenceMarkerDir,
} from "../src/main/evidence.js";

const EVIDENCE_OWNER_ID = "12121212-1212-4212-8212-121212121212";
const EVIDENCE_OWNER_TEXT = "Show the status badge. Keep the save flow working.";
const CANDIDATE_SHA256 = "c".repeat(64);

function commandEvidenceTaskSpec(): TaskSpecV1 {
  const candidate = parseTaskIntentCandidate({
    version: "cairn-task-intent/v1",
    outcome: {
      source: "owner-stated",
      text: "Show the status badge.",
      ownerQuote: "Show the status badge.",
    },
    requirements: [{
      source: "owner-stated",
      text: "Keep the save flow working.",
      ownerQuote: "Keep the save flow working.",
    }],
    context: [],
  });
  assert.ok(candidate);
  const intent = bindTaskIntent(candidate, [{
    kind: "conversation",
    inputId: EVIDENCE_OWNER_ID,
    text: EVIDENCE_OWNER_TEXT,
  }]);
  assert.ok(intent);
  const failureFor = (promise: string) =>
    `The result does not satisfy this exact request or its supported path: ${promise}`;
  const proofFor = (promise: string) =>
    `The approved check answers this exact request and its supported path: ${promise}`;
  const proposal = parseConductorQualityProposal({
    version: "cairn-quality-proposal/v1",
    supportedPath: {
      statement: "Keep the save flow working.",
      basis: [{ kind: "requirement", position: 1 }],
    },
    critic: {
      mode: "optional",
      reason: "No required critic was requested.",
      basis: [],
    },
    checks: [
      {
        promise: "Show the status badge.",
        basis: [{ kind: "outcome" }],
        supportsPath: false,
        judge: "cairn",
        failure: failureFor("Show the status badge."),
        evidence: {
          mode: "adapter-attestation",
          proves: proofFor("Show the status badge."),
          precondition: null,
        },
      },
      {
        promise: "Keep the save flow working.",
        basis: [{ kind: "requirement", position: 1 }],
        supportsPath: true,
        judge: "cairn",
        failure: failureFor("Keep the save flow working."),
        evidence: {
          mode: "adapter-attestation",
          proves: proofFor("Keep the save flow working."),
          precondition: null,
        },
      },
    ],
    preferences: [],
    referenceRequests: [],
    unknowns: [],
  });
  assert.ok(proposal);
  const bundle = composeConversationTaskSpecProposal(intent, proposal);
  assert.ok(bundle);
  return bundle.taskSpec;
}

function evidenceCommand(
  id: string,
  overrides: Partial<EvidenceCommandCandidateV1> = {},
): EvidenceCommandCandidateV1 {
  return {
    executablePath: "node",
    executableSha256: "e".repeat(64),
    arguments: [
      { kind: "literal", value: "--test" },
      { kind: "literal", value: id },
    ],
    fixtureBindings: [],
    cwdRelative: "app",
    expectedExitCodes: [0],
    timeoutMs: 60_000,
    resultParserMode: "exit-code",
    assertion: { id: `assert-${id}`, expectedResult: "the selected test exits zero" },
    ...overrides,
  };
}

function commandEvidenceFixture(
  commands: readonly EvidenceCommandCandidateV1[] = [evidenceCommand("first"), evidenceCommand("second")],
): Readonly<{ taskSpec: TaskSpecV1; evidencePlan: EvidencePlanV1; hashes: readonly string[] }> {
  const taskSpec = commandEvidenceTaskSpec();
  assert.equal(commands.length, taskSpec.quality.acceptanceChecks.length);
  const evidencePlan = bindInitialEvidencePlan(taskSpec, {
    version: EVIDENCE_PLAN_CANDIDATE_VERSION,
    procedures: taskSpec.quality.acceptanceChecks.map((criterion, index) => ({
      criterionId: criterion.id,
      kind: "adapter-command-attestation",
      command: commands[index],
      artifactIds: [criterion.failureCondition.allowedArtifactIds[0]],
    })),
  });
  assert.ok(evidencePlan);
  return Object.freeze({
    taskSpec,
    evidencePlan,
    hashes: Object.freeze(evidencePlan.procedures.map((procedure) => {
      assert.ok(procedure.command);
      return procedure.command.sha256;
    })),
  });
}

function canonicalEvents(events: readonly Readonly<{
  sequence: number;
  commandSha256: string;
  exitCode: number;
}>[], complete = true, representation: "cairn-evidence-command/v1" | "opaque-provider-command/v1" = "cairn-evidence-command/v1") {
  return { representation, complete, events };
}

test("canonical unique command events become branded Main attestations and criterion results", () => {
  const fx = commandEvidenceFixture();
  const reduction = reduceAdapterCommandEvidence(
    fx.taskSpec,
    fx.evidencePlan,
    canonicalEvents([
      { sequence: 0, commandSha256: fx.hashes[0], exitCode: 0 },
      { sequence: 1, commandSha256: fx.hashes[1], exitCode: 0 },
    ]),
    CANDIDATE_SHA256,
  );
  assert.ok(reduction);
  assert.equal(isMainAdapterCommandEvidenceReduction(reduction), true);
  assert.equal(isMainAdapterCommandEvidenceReduction(structuredClone(reduction)), false);
  assert.deepEqual(reduction.criterionResults.map((result) => ({
    id: result.criterionId,
    status: result.status,
    source: result.source,
    refs: result.evidenceRefs,
    resolution: result.resolutionSha256,
  })), fx.taskSpec.quality.acceptanceChecks.map((criterion) => ({
    id: criterion.id,
    status: "met",
    source: "adapter-execution",
    refs: [criterion.failureCondition.allowedArtifactIds[0]],
    resolution: null,
  })));
  assert.deepEqual(reduction.adapterAttestations.map((attestation) => ({
    id: attestation.criterionId,
    sequence: attestation.sequence,
    hash: attestation.commandSha256,
    exit: attestation.exitCode,
  })), [
    { id: "c1", sequence: 0, hash: fx.hashes[0], exit: 0 },
    { id: "c2", sequence: 1, hash: fx.hashes[1], exit: 0 },
  ]);
  assert.equal(reduction.taskSpecSha256, taskSpecSha256(fx.taskSpec));
  assert.equal(reduction.evidencePlanSha256, evidencePlanSha256(fx.evidencePlan));
  assert.equal(reduction.candidateSha256, CANDIDATE_SHA256);
  assert.ok(Object.isFrozen(reduction));
  assert.ok(Object.isFrozen(reduction.adapterAttestations));
  assert.ok(reduction.adapterAttestations.every(Object.isFrozen));
  assert.ok(Object.isFrozen(reduction.criterionResults));
  assert.ok(reduction.criterionResults.every((result) => Object.isFrozen(result) && Object.isFrozen(result.evidenceRefs)));
});

test("unexpected exit and a successful but ill-chosen command affect only their planned cN", () => {
  const fx = commandEvidenceFixture();
  const mixed = reduceAdapterCommandEvidence(
    fx.taskSpec,
    fx.evidencePlan,
    canonicalEvents([
      { sequence: 0, commandSha256: fx.hashes[0], exitCode: 7 },
      { sequence: 1, commandSha256: fx.hashes[1], exitCode: 0 },
    ]),
    CANDIDATE_SHA256,
  );
  assert.ok(mixed);
  assert.deepEqual(mixed.criterionResults.map((result) => result.status), ["not-met", "met"]);
  assert.deepEqual(mixed.adapterAttestations.map((attestation) => attestation.exitCode), [7, 0]);

  const onlySecond = reduceAdapterCommandEvidence(
    fx.taskSpec,
    fx.evidencePlan,
    canonicalEvents([{ sequence: 0, commandSha256: fx.hashes[1], exitCode: 0 }]),
    CANDIDATE_SHA256,
  );
  assert.ok(onlySecond);
  assert.deepEqual(onlySecond.criterionResults.map((result) => result.status), ["cant-tell", "met"]);
  assert.deepEqual(onlySecond.criterionResults[0].evidenceRefs, []);
  assert.deepEqual(onlySecond.adapterAttestations.map((attestation) => attestation.criterionId), ["c2"]);
});

test("missing, duplicate, incomplete, opaque, and unrelated process facts stay cant-tell", () => {
  const fx = commandEvidenceFixture();
  const cases = [
    canonicalEvents([]),
    canonicalEvents([
      { sequence: 0, commandSha256: fx.hashes[0], exitCode: 0 },
      { sequence: 1, commandSha256: fx.hashes[0], exitCode: 0 },
    ]),
    canonicalEvents([
      { sequence: 0, commandSha256: fx.hashes[0], exitCode: 0 },
      { sequence: 1, commandSha256: fx.hashes[1], exitCode: 0 },
    ], false),
    canonicalEvents([
      { sequence: 0, commandSha256: fx.hashes[0], exitCode: 0 },
      { sequence: 1, commandSha256: fx.hashes[1], exitCode: 0 },
    ], true, "opaque-provider-command/v1"),
    canonicalEvents([{ sequence: 0, commandSha256: "9".repeat(64), exitCode: 0 }]),
  ];
  for (const events of cases) {
    const reduction = reduceAdapterCommandEvidence(
      fx.taskSpec,
      fx.evidencePlan,
      events,
      CANDIDATE_SHA256,
    );
    assert.ok(reduction);
    assert.ok(reduction.criterionResults.every((result) =>
      result.status === "cant-tell" && result.evidenceRefs.length === 0));
  }
  assert.equal(reduceAdapterCommandEvidence(
    fx.taskSpec,
    fx.evidencePlan,
    cases[2],
    CANDIDATE_SHA256,
  )?.adapterAttestations.length, 0, "an incomplete stream mints no attestations");
});

test("an ambiguous predeclared command hash cannot let one event choose either cN", () => {
  const shared = evidenceCommand("shared");
  const fx = commandEvidenceFixture([shared, shared]);
  assert.equal(fx.hashes[0], fx.hashes[1]);
  const reduction = reduceAdapterCommandEvidence(
    fx.taskSpec,
    fx.evidencePlan,
    canonicalEvents([{ sequence: 0, commandSha256: fx.hashes[0], exitCode: 0 }]),
    CANDIDATE_SHA256,
  );
  assert.ok(reduction);
  assert.deepEqual(reduction.criterionResults.map((result) => result.status), ["cant-tell", "cant-tell"]);
  assert.deepEqual(reduction.adapterAttestations, []);
});

test("authority injection, clones, and executable-looking command text fail closed or remain inert", () => {
  const base = mkdtempSync(join(tmpdir(), "cairn-command-inert-"));
  const sentinel = join(base, "must-not-exist.txt");
  try {
    const dangerous = evidenceCommand("inert", {
      arguments: [{ kind: "literal", value: `--write-file=${sentinel}` }],
      assertion: { id: "inert-command", expectedResult: "the executable-looking prose stays inert" },
    });
    const fx = commandEvidenceFixture([dangerous, evidenceCommand("second")]);
    const event = { sequence: 0, commandSha256: fx.hashes[0], exitCode: 0 };
    const reduction = reduceAdapterCommandEvidence(
      fx.taskSpec,
      fx.evidencePlan,
      canonicalEvents([event]),
      CANDIDATE_SHA256,
    );
    assert.ok(reduction);
    assert.equal(existsSync(sentinel), false);
    const retained = JSON.stringify(reduction);
    assert.equal(retained.includes(sentinel), false);
    assert.equal(retained.includes("--write-file"), false);
    assert.equal(retained.includes("executablePath"), false);
    assert.equal(retained.includes("expectedExitCodes"), false);

    let accessorRead = false;
    const accessorBundle = canonicalEvents([event]) as Record<string, unknown>;
    Object.defineProperty(accessorBundle, "events", {
      enumerable: true,
      get() {
        accessorRead = true;
        return [event];
      },
    });
    assert.equal(reduceAdapterCommandEvidence(
      fx.taskSpec,
      fx.evidencePlan,
      accessorBundle,
      CANDIDATE_SHA256,
    ), null);
    assert.equal(accessorRead, false);

    for (const authorityField of ["criterionId", "artifactIds", "source", "status", "rawCommand"]) {
      assert.equal(reduceAdapterCommandEvidence(
        fx.taskSpec,
        fx.evidencePlan,
        canonicalEvents([{ ...event, [authorityField]: authorityField === "criterionId" ? "c2" : "forged" }]),
        CANDIDATE_SHA256,
      ), null, authorityField);
    }
    assert.equal(reduceAdapterCommandEvidence(
      structuredClone(fx.taskSpec),
      fx.evidencePlan,
      canonicalEvents([event]),
      CANDIDATE_SHA256,
    ), null);
    assert.equal(reduceAdapterCommandEvidence(
      fx.taskSpec,
      structuredClone(fx.evidencePlan),
      canonicalEvents([event]),
      CANDIDATE_SHA256,
    ), null);
    assert.equal(reduceAdapterCommandEvidence(
      fx.taskSpec,
      fx.evidencePlan,
      canonicalEvents([event]),
      "C".repeat(64),
    ), null);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

function png(width = 1320, height = 820, fill = 0): Buffer {
  const value = Buffer.alloc(32, fill);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(value, 0);
  value.writeUInt32BE(13, 8);
  value.write("IHDR", 12, "ascii");
  value.writeUInt32BE(width, 16);
  value.writeUInt32BE(height, 20);
  return value;
}

function fixture(): { root: string; profile: string; cleanup(): void } {
  const base = mkdtempSync(join(tmpdir(), "cairn-evidence-unit-"));
  const root = join(base, "project");
  const profile = join(base, "profile");
  mkdirSync(root, { recursive: true });
  mkdirSync(profile, { recursive: true });
  setEvidenceMarkerDir(profile);
  return {
    root,
    profile,
    cleanup() {
      setEvidenceMarkerDir(null);
      rmSync(base, { recursive: true, force: true });
    },
  };
}

test("pending evidence custody stores only an exact unfinalized digest projection", () => {
  const fx = fixture();
  try {
    const runId = "10101010-1010-4010-8010-101010101010";
    const empty = pendingEvidenceRunState(fx.root, runId);
    assert.ok(empty);
    assert.equal(empty.recordSha256, null);
    assert.deepEqual(empty.captures, []);
    assert.equal(pendingEvidenceRunStillExact(fx.root, structuredClone(empty)), true);

    recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "worker-not-started",
      png: png(640, 480, 19),
      width: 640,
      height: 480,
      createdAt: "2026-08-08T10:00:00.000Z",
    });
    const captured = pendingEvidenceRunState(fx.root, runId);
    assert.ok(captured);
    assert.match(captured.recordSha256 ?? "", /^[a-f0-9]{64}$/);
    assert.deepEqual(captured.captures.map((row) => row.boundary), ["worker-not-started"]);
    assert.equal(pendingEvidenceRunStillExact(fx.root, structuredClone(captured)), true);
    assert.equal(JSON.stringify(captured).includes(fx.root), false);
    assert.equal(JSON.stringify(captured).includes(fx.profile), false);
    assert.equal(JSON.stringify(captured).includes(png(640, 480, 19).toString("base64")), false);

    const recordPath = evidenceRunRecordPath(fx.root, runId);
    writeFileSync(recordPath, `${readFileSync(recordPath, "utf8")} `, "utf8");
    assert.equal(pendingEvidenceRunStillExact(fx.root, captured), false, "record byte drift invalidates the checkpoint");
  } finally {
    fx.cleanup();
  }
});

test("pending evidence parsing rejects forgery, hostile objects, or finalized evidence", () => {
  const fx = fixture();
  try {
    const runId = "20202020-2020-4020-8020-202020202020";
    recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    });
    const state = pendingEvidenceRunState(fx.root, runId);
    assert.ok(state);
    assert.equal(parsePendingEvidenceRunState({ ...state, stateSha256: "0".repeat(64) }), null);
    assert.equal(parsePendingEvidenceRunState({ ...state, authority: "renderer" }), null);
    assert.equal(parsePendingEvidenceRunState(new Proxy(structuredClone(state), {})), null);
    let invoked = false;
    const accessor = { ...structuredClone(state) } as Record<string, unknown>;
    Object.defineProperty(accessor, "runId", { enumerable: true, get() { invoked = true; return runId; } });
    assert.equal(parsePendingEvidenceRunState(accessor), null);
    assert.equal(invoked, false);

    writeFileSync(join(dirname(evidenceRunRecordPath(fx.root, runId)), "orphan.png"), png());
    assert.equal(pendingEvidenceRunState(fx.root, runId), null, "unknown evidence files fail the exact-tree checkpoint");
    rmSync(join(dirname(evidenceRunRecordPath(fx.root, runId)), "orphan.png"));
    finalizeEvidenceRun(fx.root, runId, {
      taskNumber: 215,
      title: "Pending evidence became terminal",
      disposition: "DONE",
    });
    assert.equal(pendingEvidenceRunState(fx.root, runId), null, "a terminal evidence record is not pending authority");
  } finally {
    fx.cleanup();
  }
});

test("a main-owned before and terminal capture become one trusted run-bound pair outside the project", () => {
  const fx = fixture();
  try {
    const runId = "11111111-1111-4111-8111-111111111111";
    const before = recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
      createdAt: "2026-08-03T20:00:00.000Z",
    });
    const after = recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "done",
      png: png(1320, 820, 1),
      width: 1320,
      height: 820,
      createdAt: "2026-08-03T20:01:00.000Z",
    });
    finalizeEvidenceRun(fx.root, runId, {
      taskNumber: 173,
      title: "Show the evidence",
      disposition: "DONE",
      completedAt: "2026-08-03T20:01:01.000Z",
    });

    const album = readEvidenceAlbum(fx.root, runId);
    assert.equal(album.entries.length, 1);
    assert.equal(album.entries[0]?.trusted, true);
    assert.equal(album.entries[0]?.taskNumber, 173);
    assert.deepEqual(album.entries[0]?.images.map((item) => item.role), ["before", "after"]);
    assert.equal(album.entries[0]?.pair?.beforeId, before.id);
    assert.equal(album.entries[0]?.pair?.afterId, after.id);
    assert.ok(!JSON.stringify(album).includes(fx.root), "renderer metadata carries no project or profile path");
    assert.equal(existsSync(join(fx.root, ".cairn", "evidence")), false);
    assert.ok(evidenceRunRecordPath(fx.root, runId).startsWith(fx.profile));

    const image = readEvidenceImage(fx.root, before.id);
    assert.equal(image?.id, before.id);
    assert.match(image?.dataUrl ?? "", /^data:image\/png;base64,/);
  } finally {
    fx.cleanup();
  }
});

test("the same run boundary is captured once and cannot be replaced by a retry", () => {
  const fx = fixture();
  try {
    const runId = "22222222-2222-4222-8222-222222222222";
    const input = {
      root: fx.root,
      runId,
      boundary: "worker-not-started" as const,
      png: png(),
      width: 1320,
      height: 820,
      createdAt: "2026-08-03T20:00:00.000Z",
    };
    const first = recordEvidenceCapture(input);
    const second = recordEvidenceCapture({ ...input, png: png(760, 620, 7), width: 760, height: 620 });
    assert.deepEqual(second, first);
    const files = readdirSync(dirname(evidenceRunRecordPath(fx.root, runId)));
    assert.equal(files.filter((name) => name.endsWith(".png")).length, 1);
  } finally {
    fx.cleanup();
  }
});

test("a worker-written legacy manifest is browseable history but never a trusted card pair", () => {
  const fx = fixture();
  try {
    const shots = join(fx.root, "app", "shots");
    mkdirSync(shots, { recursive: true });
    writeFileSync(join(shots, "worker-before.png"), png());
    writeFileSync(join(shots, "worker-after.png"), png(1320, 820, 2));
    writeFileSync(join(shots, "manifest.json"), JSON.stringify({
      entries: [{
        task: 173,
        runId: "33333333-3333-4333-8333-333333333333",
        title: "Worker says this is evidence",
        caption: "Untrusted local history",
        shots: [
          { file: "worker-before.png", label: "Before" },
          { file: "worker-after.png", label: "After" },
        ],
      }],
    }));

    const album = readEvidenceAlbum(fx.root, "33333333-3333-4333-8333-333333333333");
    assert.equal(album.entries.length, 1);
    assert.equal(album.entries[0]?.trusted, false);
    assert.equal(album.entries[0]?.runId, null);
    assert.equal(album.entries[0]?.pair, null);
    assert.match(album.entries[0]?.images[0]?.label ?? "", /^Past review shot/);
  } finally {
    fx.cleanup();
  }
});

test("replacement after attestation disappears fail-closed without affecting another run", () => {
  const fx = fixture();
  try {
    const firstRun = "44444444-4444-4444-8444-444444444444";
    const capture = recordEvidenceCapture({
      root: fx.root,
      runId: firstRun,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
      createdAt: "2026-08-03T20:00:00.000Z",
    });
    finalizeEvidenceRun(fx.root, firstRun, {
      taskNumber: 173,
      title: "First run",
      disposition: "STOPPED",
      completedAt: "2026-08-03T20:00:30.000Z",
    });
    const record = JSON.parse(readFileSync(evidenceRunRecordPath(fx.root, firstRun), "utf8")) as {
      captures: Array<{ id: string; file: string }>;
    };
    const file = record.captures[0]?.file;
    assert.ok(file);
    writeFileSync(join(dirname(evidenceRunRecordPath(fx.root, firstRun)), file), png(1320, 820, 9));
    assert.equal(readEvidenceImage(fx.root, capture.id), null);

    const secondRun = "55555555-5555-4555-8555-555555555555";
    recordEvidenceCapture({
      root: fx.root,
      runId: secondRun,
      boundary: "done",
      png: png(760, 620, 4),
      width: 760,
      height: 620,
    });
    finalizeEvidenceRun(fx.root, secondRun, {
      taskNumber: 174,
      title: "Second run",
      disposition: "DONE",
    });
    const album = readEvidenceAlbum(fx.root, secondRun);
    assert.deepEqual(album.entries.map((entry) => entry.taskNumber), [174]);
    assert.equal(album.entries[0]?.images.length, 1, "one surviving image remains honest evidence");
    assert.equal(album.entries[0]?.images[0]?.role, "after");
    assert.equal(album.entries[0]?.pair, null);
    assert.match(album.entries[0]?.caption ?? "", /no pre-work picture survived/i);
    assert.doesNotMatch(album.entries[0]?.caption ?? "", /before the worker started and after/);
  } finally {
    fx.cleanup();
  }
});

test("a corrupt run record is preserved, refuses mutation, and does not poison other runs", () => {
  const fx = fixture();
  try {
    const corruptRun = "66666666-6666-4666-8666-666666666666";
    const record = evidenceRunRecordPath(fx.root, corruptRun);
    mkdirSync(dirname(record), { recursive: true });
    writeFileSync(record, "{not-json", "utf8");
    assert.throws(() => recordEvidenceCapture({
      root: fx.root,
      runId: corruptRun,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    }), /EVIDENCE_RECORD_INVALID/);
    assert.equal(readFileSync(record, "utf8"), "{not-json");

    const healthyRun = "77777777-7777-4777-8777-777777777777";
    recordEvidenceCapture({
      root: fx.root,
      runId: healthyRun,
      boundary: "error",
      png: png(),
      width: 1320,
      height: 820,
    });
    finalizeEvidenceRun(fx.root, healthyRun, {
      taskNumber: null,
      title: "Run ended before a task number was assigned",
      disposition: "ERROR",
    });
    const album = readEvidenceAlbum(fx.root, healthyRun);
    assert.equal(album.entries.length, 1);
    assert.equal(album.entries[0]?.disposition, "ERROR");
    assert.equal(album.entries[0]?.taskNumber, null);
  } finally {
    fx.cleanup();
  }
});

test("a trusted image id cannot be replayed into another project", () => {
  const fx = fixture();
  try {
    const runId = "88888888-8888-4888-8888-888888888888";
    const capture = recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "done",
      png: png(),
      width: 1320,
      height: 820,
    });
    const other = join(dirname(fx.root), "other-project");
    mkdirSync(other, { recursive: true });
    assert.equal(readEvidenceImage(other, capture.id), null);
    assert.deepEqual(readEvidenceAlbum(other, runId).entries, []);
  } finally {
    fx.cleanup();
  }
});

test("custody refuses a profile inside the selected project before creating evidence", () => {
  const base = mkdtempSync(join(tmpdir(), "cairn-evidence-overlap-"));
  const root = join(base, "project");
  const nestedProfile = join(root, "profile");
  mkdirSync(nestedProfile, { recursive: true });
  setEvidenceMarkerDir(nestedProfile);
  try {
    assert.throws(() => recordEvidenceCapture({
      root,
      runId: "99999999-9999-4999-8999-999999999999",
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    }), /EVIDENCE_STORE_OVERLAPS_PROJECT/);
    assert.equal(existsSync(join(nestedProfile, "evidence")), false);
  } finally {
    setEvidenceMarkerDir(null);
    rmSync(base, { recursive: true, force: true });
  }
});

test("custody also refuses a selected project inside the app profile", () => {
  const base = mkdtempSync(join(tmpdir(), "cairn-evidence-reverse-overlap-"));
  const profile = join(base, "profile");
  const nestedProject = join(profile, "project");
  mkdirSync(nestedProject, { recursive: true });
  setEvidenceMarkerDir(profile);
  try {
    assert.throws(() => recordEvidenceCapture({
      root: nestedProject,
      runId: "99999999-9999-4999-8999-999999999998",
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    }), /EVIDENCE_STORE_OVERLAPS_PROJECT/);
    assert.equal(existsSync(join(profile, "evidence")), false);
  } finally {
    setEvidenceMarkerDir(null);
    rmSync(base, { recursive: true, force: true });
  }
});

test("terminal truth is exclusive, matches disposition, and an unfinalized readiness picture can be discarded", () => {
  const fx = fixture();
  try {
    const runId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    });
    recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "done",
      png: png(1320, 820, 2),
      width: 1320,
      height: 820,
    });
    assert.throws(() => recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "stopped",
      png: png(1320, 820, 3),
      width: 1320,
      height: 820,
    }), /EVIDENCE_TERMINAL_CONFLICT/);
    assert.throws(() => finalizeEvidenceRun(fx.root, runId, {
      taskNumber: 173,
      title: "Contradictory close",
      disposition: "STOPPED",
    }), /EVIDENCE_DISPOSITION_MISMATCH/);

    const disposable = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    recordEvidenceCapture({
      root: fx.root,
      runId: disposable,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    });
    const disposablePath = dirname(evidenceRunRecordPath(fx.root, disposable));
    discardUnfinalizedEvidenceRun(fx.root, disposable);
    assert.equal(existsSync(disposablePath), false);
  } finally {
    fx.cleanup();
  }
});

test("the selected run cannot be crowded out and sparse trusted history pages without duplication", () => {
  const fx = fixture();
  try {
    const runIds: string[] = [];
    for (let index = 0; index < 42; index += 1) {
      const runId = `cccccccc-cccc-4ccc-8ccc-${String(index + 1).padStart(12, "0")}`;
      runIds.push(runId);
      recordEvidenceCapture({
        root: fx.root,
        runId,
        boundary: "done",
        png: png(32, 24, index),
        width: 32,
        height: 24,
      });
      finalizeEvidenceRun(fx.root, runId, {
        taskNumber: index + 1,
        title: `Run ${index + 1}`,
        disposition: "DONE",
        completedAt: new Date(Date.UTC(2023, index, 1, 12)).toISOString(),
      });
    }

    const selectedRunId = runIds.at(-1) ?? null;
    const first = readEvidenceAlbum(fx.root, selectedRunId);
    assert.equal(first.entries[0]?.runId, selectedRunId);
    assert.ok(first.nextCursor);
    const pages = [first];
    let cursor: string | null = first.nextCursor;
    while (cursor !== null) {
      const page = readEvidenceAlbum(fx.root, selectedRunId, cursor);
      assert.ok(page.entries.length <= 40);
      pages.push(page);
      cursor = page.nextCursor;
      assert.ok(pages.length < 10, "a cursor must make progress through sparse dates");
    }
    const all = pages.flatMap((page) => page.entries).map((entry) => entry.runId);
    assert.equal(new Set(all).size, 42);
    assert.equal(all.length, 42);
  } finally {
    fx.cleanup();
  }
});

test("a corrupt selected run cannot suppress unrelated checked history", () => {
  const fx = fixture();
  try {
    const healthyRun = "34343434-3434-4343-8343-343434343434";
    recordEvidenceCapture({
      root: fx.root,
      runId: healthyRun,
      boundary: "done",
      png: png(32, 24, 3),
      width: 32,
      height: 24,
    });
    finalizeEvidenceRun(fx.root, healthyRun, {
      taskNumber: 172,
      title: "Healthy earlier run",
      disposition: "DONE",
      completedAt: "2026-07-01T12:00:00.000Z",
    });

    const corruptRun = "56565656-5656-4565-8565-565656565656";
    recordEvidenceCapture({
      root: fx.root,
      runId: corruptRun,
      boundary: "done",
      png: png(32, 24, 5),
      width: 32,
      height: 24,
    });
    finalizeEvidenceRun(fx.root, corruptRun, {
      taskNumber: 173,
      title: "Corrupt selected run",
      disposition: "DONE",
      completedAt: "2026-08-01T12:00:00.000Z",
    });
    const path = evidenceRunRecordPath(fx.root, corruptRun);
    const record = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    record.disposition = "STOPPED";
    writeFileSync(path, `${JSON.stringify(record)}\n`, "utf8");

    const album = readEvidenceAlbum(fx.root, corruptRun);
    assert.deepEqual(album.entries.map((entry) => entry.runId), [healthyRun]);
    assert.equal(album.entries[0]?.trusted, true);
  } finally {
    fx.cleanup();
  }
});

test("a trusted-history byte stop retries the current run instead of skipping its valid sibling", () => {
  const fx = fixture();
  try {
    const olderRun = "71717171-7171-4717-8717-717171717171";
    recordEvidenceCapture({
      root: fx.root,
      runId: olderRun,
      boundary: "done",
      png: png(32, 24, 1),
      width: 32,
      height: 24,
    });
    finalizeEvidenceRun(fx.root, olderRun, {
      taskNumber: 171,
      title: "Older intact run",
      disposition: "DONE",
      completedAt: "2026-01-01T12:00:00.000Z",
    });

    const targetRun = "72727272-7272-4727-8727-727272727272";
    const changed = recordEvidenceCapture({
      root: fx.root,
      runId: targetRun,
      boundary: "worker-not-started",
      png: png(32, 24, 2),
      width: 32,
      height: 24,
    });
    recordEvidenceCapture({
      root: fx.root,
      runId: targetRun,
      boundary: "done",
      png: png(32, 24, 3),
      width: 32,
      height: 24,
    });
    finalizeEvidenceRun(fx.root, targetRun, {
      taskNumber: 172,
      title: "One changed picture, one intact picture",
      disposition: "DONE",
      completedAt: "2026-01-02T12:00:00.000Z",
    });
    const changedId = changed.id.split(".").at(-1);
    assert.ok(changedId);
    truncateSync(join(dirname(evidenceRunRecordPath(fx.root, targetRun)), `${changedId}.png`), 16 * 1024 * 1024);

    for (let index = 0; index < 8; index += 1) {
      const runId = `73737373-7373-4737-8737-${String(index + 1).padStart(12, "0")}`;
      const capture = recordEvidenceCapture({
        root: fx.root,
        runId,
        boundary: "done",
        png: png(32, 24, index + 4),
        width: 32,
        height: 24,
      });
      finalizeEvidenceRun(fx.root, runId, {
        taskNumber: 180 + index,
        title: `Changed newer run ${index + 1}`,
        disposition: "DONE",
        completedAt: new Date(Date.UTC(2026, 1, index + 1, 12)).toISOString(),
      });
      const captureId = capture.id.split(".").at(-1);
      assert.ok(captureId);
      truncateSync(join(dirname(evidenceRunRecordPath(fx.root, runId)), `${captureId}.png`), 15 * 1024 * 1024);
    }

    const first = readEvidenceAlbum(fx.root, null);
    assert.deepEqual(first.entries, []);
    assert.ok(first.nextCursor, "the bounded page must resume at the unattempted target run");
    const second = readEvidenceAlbum(fx.root, null, first.nextCursor);
    assert.deepEqual(second.entries.map((entry) => entry.runId), [targetRun, olderRun]);
    assert.deepEqual(second.entries[0]?.images.map((image) => image.role), ["after"]);
  } finally {
    fx.cleanup();
  }
});

test("the selected run is direct-loaded even when its history marker is unavailable", () => {
  const fx = fixture();
  try {
    const runId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    recordEvidenceCapture({
      root: fx.root,
      runId,
      boundary: "done",
      png: png(),
      width: 1320,
      height: 820,
    });
    finalizeEvidenceRun(fx.root, runId, {
      taskNumber: 173,
      title: "Direct card lookup",
      disposition: "DONE",
    });
    const projectEvidence = dirname(dirname(evidenceRunRecordPath(fx.root, runId)));
    rmSync(join(projectEvidence, "_timeline"), { recursive: true, force: true });
    const album = readEvidenceAlbum(fx.root, runId);
    assert.equal(album.entries[0]?.runId, runId);
    assert.equal(album.entries[0]?.trusted, true);
  } finally {
    fx.cleanup();
  }
});

test("persisted terminal contradictions, forged labels, and case-variant capture ids fail closed", () => {
  const fx = fixture();
  try {
    const contradictoryRun = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const contradictoryImage = recordEvidenceCapture({
      root: fx.root,
      runId: contradictoryRun,
      boundary: "done",
      png: png(),
      width: 1320,
      height: 820,
    });
    finalizeEvidenceRun(fx.root, contradictoryRun, {
      taskNumber: 173,
      title: "Persisted contradiction",
      disposition: "DONE",
    });
    const contradictoryPath = evidenceRunRecordPath(fx.root, contradictoryRun);
    const contradictory = JSON.parse(readFileSync(contradictoryPath, "utf8")) as Record<string, unknown>;
    contradictory.disposition = "STOPPED";
    writeFileSync(contradictoryPath, `${JSON.stringify(contradictory)}\n`, "utf8");
    assert.equal(readEvidenceImage(fx.root, contradictoryImage.id), null);
    assert.deepEqual(readEvidenceAlbum(fx.root, contradictoryRun).entries, []);

    const labelRun = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    const labelImage = recordEvidenceCapture({
      root: fx.root,
      runId: labelRun,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    });
    const labelPath = evidenceRunRecordPath(fx.root, labelRun);
    const forgedLabel = JSON.parse(readFileSync(labelPath, "utf8")) as { captures: Array<Record<string, unknown>> };
    forgedLabel.captures[0]!.label = "Worker says this is checked.";
    writeFileSync(labelPath, `${JSON.stringify(forgedLabel)}\n`, "utf8");
    assert.equal(readEvidenceImage(fx.root, labelImage.id), null);

    const duplicateRun = "12121212-1212-4212-8212-121212121212";
    recordEvidenceCapture({
      root: fx.root,
      runId: duplicateRun,
      boundary: "worker-not-started",
      png: png(),
      width: 1320,
      height: 820,
    });
    const duplicatePath = evidenceRunRecordPath(fx.root, duplicateRun);
    const duplicate = JSON.parse(readFileSync(duplicatePath, "utf8")) as { captures: Array<Record<string, unknown>> };
    const first = duplicate.captures[0]!;
    duplicate.captures.push({
      ...first,
      id: String(first.id).toUpperCase(),
      boundary: "done",
      label: "After \u2014 Cairn verified the run as DONE.",
    });
    writeFileSync(duplicatePath, `${JSON.stringify(duplicate)}\n`, "utf8");
    assert.throws(() => finalizeEvidenceRun(fx.root, duplicateRun, {
      taskNumber: 173,
      title: "Duplicate identity",
      disposition: "DONE",
    }), /EVIDENCE_RECORD_INVALID/);
  } finally {
    fx.cleanup();
  }
});

test("malformed legacy images spend the aggregate declared-byte budget before header reads", () => {
  const fx = fixture();
  try {
    const shots = join(fx.root, "app", "shots");
    mkdirSync(shots, { recursive: true });
    const rows: Array<{ file: string; label: string }> = [];
    for (let index = 0; index < 5; index += 1) {
      const file = `large-invalid-${index}.png`;
      const absolute = join(shots, file);
      writeFileSync(absolute, Buffer.alloc(0));
      truncateSync(absolute, 16 * 1024 * 1024);
      rows.push({ file, label: `Invalid ${index}` });
    }
    writeFileSync(join(shots, "would-leak-through.png"), png(1, 1));
    rows.push({ file: "would-leak-through.png", label: "Must stay beyond the budget" });
    writeFileSync(join(shots, "manifest.json"), JSON.stringify({
      entries: [{ task: 173, title: "Budget", caption: "Bounded", shots: rows }],
    }));
    assert.deepEqual(readEvidenceAlbum(fx.root, null).entries, [],
      "an invalid large prefix cannot make the reader reach a later valid image past 64 MiB");
  } finally {
    fx.cleanup();
  }
});

test("descriptor reads stay capped to the size checked before allocation", () => {
  const source = readFileSync(join(__dirname, "..", "..", "src", "main", "evidence.ts"), "utf8");
  assert.match(source, /readDescriptorBytes\(descriptor: number, size: number\)/);
  assert.match(source, /readSync\(descriptor, bytes, offset, size - offset, offset\)/);
  assert.doesNotMatch(source, /readFileSync\(descriptor\)/);
});
