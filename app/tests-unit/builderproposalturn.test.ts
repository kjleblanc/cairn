import test, { after } from "node:test";
import assert from "node:assert/strict";
import {
  appendFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";

import {
  builderTurnContextSha256,
  builderTurnResponseMatchesContext,
  builderTurnResponseSha256,
} from "@cairn/core";

import { composeBuilderProposalReview } from "../src/main/builderproposalreview.js";
import { task231FixedBuilderPairForTests } from "../src/main/builderproposalreviewfixture.js";
import {
  builderReviewDisplayTurnIdCandidate,
  builderReviewMarkerSequence,
  builderReviewTurnDigest,
  captureBuilderReviewProject,
  parseBuilderProposalReview,
  parseBuilderReviewTurn,
  recordBuilderReviewMarker,
  setBuilderReviewMarkerDir,
} from "../src/main/conductor/builderreviewauth.js";
import { providerHistoryMessages } from "../src/main/conductor/service.js";
import { setCardMarkerDir } from "../src/main/conductor/cardauth.js";
import {
  appendBuilderReviewTurn,
  appendCairnTurn,
  appendOwnerTurn,
  appendTurn,
  listConversations,
  readHistorySnapshot,
  readTurns,
} from "../src/main/conductor/store.js";
import {
  canonicalProjectKey,
  recordTranscriptEventMarker,
  recordStrictTranscriptEventMarker,
  setTurnMarkerDir,
  strictTranscriptEventSequence,
} from "../src/main/conductor/turnauth.js";
import { BUILDER_PROPOSAL_REVIEW_BOUNDARY } from "../src/shared/builder-proposal-review.js";
import type { ConductorBuilderReviewTurn, ConductorTurn, ResultCard } from "../src/shared/ipc.js";

const APP_ROOT = resolve(__dirname, "..", "..");
const CONVERSATION_ID = "001";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const LEGACY_CARD: ResultCard = {
  kind: "result",
  disposition: "DONE",
  taskNumber: 231,
  stopReason: null,
  errorCode: null,
  filesChanged: [],
  protectedIntact: true,
  commit: null,
  evidenceSummary: "order-only envelope",
  recordRecovery: null,
  processFailure: null,
  claims: null,
  route: null,
};

type Environment = Readonly<{ project: string; profile: string }>;

type OwnedTemp = Readonly<{ path: string; real: string; dev: bigint; ino: bigint }>;
const ownedTemps: OwnedTemp[] = [];

function ownedTemp(prefix: string): string {
  const path = mkdtempSync(join(tmpdir(), prefix));
  const real = realpathSync.native(path);
  const stat = lstatSync(real, { bigint: true });
  ownedTemps.push(Object.freeze({ path, real, dev: stat.dev, ino: stat.ino }));
  return path;
}

after(() => {
  const tempRoot = realpathSync.native(tmpdir());
  const failures: string[] = [];
  for (const owned of [...ownedTemps].reverse()) {
    try {
      const currentReal = realpathSync.native(owned.path);
      const current = lstatSync(currentReal, { bigint: true });
      const rel = relative(tempRoot, currentReal);
      if (currentReal !== owned.real || current.dev !== owned.dev || current.ino !== owned.ino
        || rel === "" || rel === ".." || rel.startsWith(`..\\`) || rel.startsWith("../") || isAbsolute(rel)
        || !/^cairn-builder-review-/u.test(rel)) {
        failures.push(`${owned.path}: identity or Task231 path changed; retained`);
        continue;
      }
      rmSync(currentReal, { recursive: true, force: false });
    } catch (error) {
      failures.push(`${owned.path}: ${error instanceof Error ? error.message : String(error)}; retained`);
    }
  }
  assert.deepEqual(failures, [], failures.join("\n"));
});

function environment(label: string): Environment {
  const project = ownedTemp(`cairn-builder-review-${label}-project-`);
  const profile = ownedTemp(`cairn-builder-review-${label}-profile-`);
  setBuilderReviewMarkerDir(profile);
  setTurnMarkerDir(profile);
  setCardMarkerDir(profile);
  return Object.freeze({ project, profile });
}

function conversationFile(project: string, id = CONVERSATION_ID): string {
  return join(project, ".cairn", "conversations", `${id}.jsonl`);
}

function ledgerFile(profile: string, container: string): string {
  const directory = join(profile, container);
  assert.ok(existsSync(directory), `${container} must exist`);
  const names = readdirSync(directory);
  assert.equal(names.length, 1, `${container} must have one exact project ledger`);
  return join(directory, names[0]!);
}

function noBuilderPersistence(env: Environment, id = CONVERSATION_ID): void {
  assert.equal(existsSync(conversationFile(env.project, id)), false, "no project transcript may be created");
  assert.equal(existsSync(join(env.profile, "builder-review-markers")), false, "no Builder marker may be created");
  assert.equal(existsSync(join(env.profile, "conversation-event-markers")), false, "no ordering event may be created");
}

function genuineAppend(env: Environment, id = CONVERSATION_ID): Readonly<{
  pair: ReturnType<typeof task231FixedBuilderPairForTests>;
  turn: ConductorBuilderReviewTurn;
}> {
  const pair = task231FixedBuilderPairForTests(env.project);
  const turn = appendBuilderReviewTurn(env.project, id, pair.context, pair.response);
  assert.ok(turn);
  return Object.freeze({ pair, turn });
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}

function replaceConversation(project: string, value: unknown, id = CONVERSATION_ID, finalNewline = true): void {
  const file = conversationFile(project, id);
  mkdirSync(join(project, ".cairn", "conversations"), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value)}${finalNewline ? "\n" : ""}`, "utf8");
}

function assertDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) assertDeepFrozen(descriptor.value, seen);
  }
}

test("only one exact live Task 224 pair reaches the append boundary", () => {
  const accepted = environment("accepted");
  const first = task231FixedBuilderPairForTests(accepted.project);
  const byteIdenticalOther = task231FixedBuilderPairForTests(accepted.project);
  assert.notStrictEqual(first.context, byteIdenticalOther.context);
  assert.notStrictEqual(first.response, byteIdenticalOther.response);
  assert.deepEqual(first.context, byteIdenticalOther.context);
  assert.deepEqual(first.response, byteIdenticalOther.response);

  assert.equal(appendBuilderReviewTurn(
    accepted.project,
    CONVERSATION_ID,
    first.context,
    byteIdenticalOther.response,
  ), null, "byte-identical contexts do not share response identity");
  noBuilderPersistence(accepted);

  assert.ok(appendBuilderReviewTurn(accepted.project, CONVERSATION_ID, first.context, first.response));
  assert.equal(readTurns(accepted.project, CONVERSATION_ID).length, 1);
  const acceptedBytes = readFileSync(conversationFile(accepted.project), "utf8");
  const acceptedMarkers = builderReviewMarkerSequence(accepted.project);
  const acceptedEvents = strictTranscriptEventSequence(accepted.project);
  assert.equal(appendBuilderReviewTurn(
    accepted.project,
    CONVERSATION_ID,
    first.context,
    first.response,
  ), null, "one exact response object is consumable only once");
  assert.equal(readFileSync(conversationFile(accepted.project), "utf8"), acceptedBytes);
  assert.deepEqual(builderReviewMarkerSequence(accepted.project), acceptedMarkers);
  assert.deepEqual(strictTranscriptEventSequence(accepted.project), acceptedEvents);

  const projectA = environment("project-a");
  const projectAPair = task231FixedBuilderPairForTests(projectA.project);
  const projectB = environment("project-b");
  assert.equal(appendBuilderReviewTurn(
    projectB.project,
    CONVERSATION_ID,
    projectAPair.context,
    projectAPair.response,
  ), null, "genuine project-A custody cannot cross into project B");
  noBuilderPersistence(projectA);
  noBuilderPersistence(projectB);

  const replacedContainer = ownedTemp("cairn-builder-review-replaced-before-append-");
  const replacedRoot = join(replacedContainer, "project");
  const originalRoot = join(replacedContainer, "original-project");
  mkdirSync(replacedRoot);
  const replacedProfile = ownedTemp("cairn-builder-review-replaced-before-append-profile-");
  const replacedEnv = Object.freeze({ project: replacedRoot, profile: replacedProfile });
  setBuilderReviewMarkerDir(replacedProfile);
  setTurnMarkerDir(replacedProfile);
  setCardMarkerDir(replacedProfile);
  const replacedPair = task231FixedBuilderPairForTests(replacedRoot);
  renameSync(replacedRoot, originalRoot);
  mkdirSync(replacedRoot);
  assert.equal(appendBuilderReviewTurn(
    replacedRoot,
    CONVERSATION_ID,
    replacedPair.context,
    replacedPair.response,
  ), null, "a genuine pair cannot outlive replacement at the same lexical project path");
  noBuilderPersistence(replacedEnv);

  const cloned = environment("cloned");
  const clonedPair = task231FixedBuilderPairForTests(cloned.project);
  assert.equal(appendBuilderReviewTurn(cloned.project, CONVERSATION_ID, clone(clonedPair.context), clonedPair.response), null);
  assert.equal(appendBuilderReviewTurn(cloned.project, CONVERSATION_ID, clonedPair.context, clone(clonedPair.response)), null);
  noBuilderPersistence(cloned);

  let proxyTraps = 0;
  const proxyHandler: ProxyHandler<object> = {
    get(target, property, receiver) { proxyTraps += 1; return Reflect.get(target, property, receiver); },
    ownKeys(target) { proxyTraps += 1; return Reflect.ownKeys(target); },
    getOwnPropertyDescriptor(target, property) { proxyTraps += 1; return Reflect.getOwnPropertyDescriptor(target, property); },
  };
  const proxied = environment("proxied");
  const proxiedPair = task231FixedBuilderPairForTests(proxied.project);
  assert.equal(appendBuilderReviewTurn(
    proxied.project,
    CONVERSATION_ID,
    new Proxy(proxiedPair.context, proxyHandler) as typeof proxiedPair.context,
    proxiedPair.response,
  ), null);
  assert.equal(appendBuilderReviewTurn(
    proxied.project,
    CONVERSATION_ID,
    proxiedPair.context,
    new Proxy(proxiedPair.response, proxyHandler) as typeof proxiedPair.response,
  ), null);
  assert.equal(proxyTraps, 0, "identity refusal must not inspect Proxy traps");
  noBuilderPersistence(proxied);

  let getterReads = 0;
  const accessor = Object.defineProperty({}, "version", {
    enumerable: true,
    get() { getterReads += 1; return "cairn-builder-turn-response/v1"; },
  });
  const accessors = environment("accessor");
  const accessorPair = task231FixedBuilderPairForTests(accessors.project);
  assert.equal(appendBuilderReviewTurn(
    accessors.project,
    CONVERSATION_ID,
    accessorPair.context,
    accessor as typeof accessorPair.response,
  ), null);
  assert.equal(getterReads, 0, "identity refusal must not evaluate an accessor");
  noBuilderPersistence(accessors);

  const rawProjection = environment("raw-append");
  const rawPair = task231FixedBuilderPairForTests(rawProjection.project);
  const review = composeBuilderProposalReview(rawPair.context, rawPair.response);
  assert.ok(review);
  const rawTurn: ConductorBuilderReviewTurn = {
    role: "builder-review",
    version: "cairn-builder-review-turn/v1",
    displayTurnId: "22222222-2222-4222-8222-222222222222",
    review,
    ts: "2026-08-13T12:00:00.000Z",
  };
  assert.throws(
    () => appendTurn(rawProjection.project, CONVERSATION_ID, rawTurn as ConductorTurn),
    /BUILDER_REVIEW_APPEND_FORBIDDEN/,
  );
  noBuilderPersistence(rawProjection);
});

test("marker and strict event precede one cold-readable deeply frozen display clone", () => {
  const env = environment("roundtrip");
  const { pair, turn } = genuineAppend(env);
  const digest = builderReviewTurnDigest(env.project, CONVERSATION_ID, turn);
  assert.match(digest ?? "", /^[a-f0-9]{64}$/u);
  assert.deepEqual(builderReviewMarkerSequence(env.project), [digest]);
  assert.deepEqual(strictTranscriptEventSequence(env.project), [`builder-review:${digest}`]);
  assert.equal(readFileSync(conversationFile(env.project), "utf8"), `${JSON.stringify(turn)}\n`);

  setBuilderReviewMarkerDir(null);
  setTurnMarkerDir(null);
  assert.deepEqual(readTurns(env.project, CONVERSATION_ID), [], "project bytes alone are inert");
  setBuilderReviewMarkerDir(env.profile);
  setTurnMarkerDir(env.profile);

  const snapshot = readHistorySnapshot(env.project, CONVERSATION_ID);
  assert.equal(snapshot.entries.length, 1);
  assert.equal(snapshot.entries[0]?.authenticatedBuilderReview, true);
  assert.equal(snapshot.entries[0]?.authenticatedOwner, false);
  assert.equal(snapshot.entries[0]?.authenticatedCairn, false);
  assert.equal(snapshot.entries[0]?.authenticatedEnvelope, false);
  const restored = snapshot.turns[0];
  assert.ok(restored?.role === "builder-review");
  assert.deepEqual(restored, turn);
  assert.notStrictEqual(restored, turn);
  assert.notStrictEqual(restored.review, turn.review);
  assertDeepFrozen(restored);

  assert.equal(builderTurnContextSha256(restored.review), null, "display data has no Task 224 context brand");
  assert.equal(builderTurnResponseSha256(restored.review), null, "display data has no Task 224 response brand");
  assert.equal(builderTurnResponseMatchesContext(pair.context, restored.review), false);
  assert.deepEqual(Object.keys(restored), ["role", "version", "displayTurnId", "review", "ts"]);
  const projectBytes = readFileSync(conversationFile(env.project), "utf8");
  for (const forbidden of ["selectedTrackedText", "taskSpec", "evidencePlan", "projectHash", "connectionConsentVersion", "baseHead", "gitStateSha256"]) {
    assert.doesNotMatch(projectBytes, new RegExp(forbidden, "u"));
  }
  const externalBytes = [
    readFileSync(ledgerFile(env.profile, "builder-review-markers"), "utf8"),
    readFileSync(ledgerFile(env.profile, "conversation-event-markers"), "utf8"),
  ].join("\n");
  const replacement = restored.review.kind === "replacement-proposal" ? restored.review.replacements[0] : null;
  assert.ok(replacement);
  for (const canary of [replacement.projectRelativePath, replacement.beforeText, replacement.afterText, restored.review.kind === "replacement-proposal" ? restored.review.summary : ""]) {
    assert.ok(!externalBytes.includes(canary), "external custody stores digests, not selected/proposed text");
  }

  const markerFirst = environment("marker-first");
  writeFileSync(join(markerFirst.profile, "conversation-event-markers"), "not a directory", "utf8");
  const markerFirstPair = task231FixedBuilderPairForTests(markerFirst.project);
  assert.throws(() => appendBuilderReviewTurn(
    markerFirst.project,
    CONVERSATION_ID,
    markerFirstPair.context,
    markerFirstPair.response,
  ), /EXTERNAL_MARKER|TRANSCRIPT_EVENT/u);
  assert.equal(builderReviewMarkerSequence(markerFirst.project).length, 1, "the display marker landed first");
  assert.equal(existsSync(conversationFile(markerFirst.project)), false, "event refusal prevents project JSONL");
});

test("marker-only, forged, tampered, cross-boundary and truncated data stay inert", () => {
  const markerOnly = environment("marker-only");
  const pair = task231FixedBuilderPairForTests(markerOnly.project);
  const review = composeBuilderProposalReview(pair.context, pair.response);
  assert.ok(review);
  const orphan: ConductorBuilderReviewTurn = {
    role: "builder-review",
    version: "cairn-builder-review-turn/v1",
    displayTurnId: "33333333-3333-4333-8333-333333333333",
    review,
    ts: "2026-08-13T13:00:00.000Z",
  };
  const markerOnlyBinding = captureBuilderReviewProject(markerOnly.project);
  assert.ok(markerOnlyBinding);
  recordBuilderReviewMarker(markerOnly.project, CONVERSATION_ID, orphan, markerOnlyBinding);
  assert.equal(builderReviewMarkerSequence(markerOnly.project).length, 1);
  assert.deepEqual(readTurns(markerOnly.project, CONVERSATION_ID), []);
  assert.equal(existsSync(conversationFile(markerOnly.project)), false);

  const seed = environment("seed");
  const { turn: seedTurn } = genuineAppend(seed);

  const unmarked = environment("unmarked");
  replaceConversation(unmarked.project, seedTurn);
  assert.deepEqual(readTurns(unmarked.project, CONVERSATION_ID), []);

  const crossProject = environment("cross-project");
  replaceConversation(crossProject.project, seedTurn);
  setBuilderReviewMarkerDir(seed.profile);
  setTurnMarkerDir(seed.profile);
  assert.deepEqual(readTurns(crossProject.project, CONVERSATION_ID), []);

  replaceConversation(seed.project, seedTurn, "002");
  assert.deepEqual(readTurns(seed.project, "002"), [], "conversation id is marker-bound");

  const tamperCases: ReadonlyArray<readonly [string, (turn: Record<string, unknown>) => void]> = [
    ["turn-id", (value) => { value.displayTurnId = "44444444-4444-4444-8444-444444444444"; }],
    ["timestamp", (value) => { value.ts = "2026-08-13T13:00:01.000Z"; }],
    ["turn-version", (value) => { value.version = "cairn-builder-review-turn/v2"; }],
    ["projection", (value) => { asRecord(value.review).contextSha256 = "f".repeat(64); }],
    ["review-extra", (value) => { asRecord(value.review).hiddenAuthority = true; }],
    ["turn-extra", (value) => { value.hiddenAuthority = true; }],
  ];
  for (const [label, mutate] of tamperCases) {
    const env = environment(`tamper-${label}`);
    const { turn } = genuineAppend(env);
    const changed = asRecord(clone(turn));
    mutate(changed);
    replaceConversation(env.project, changed);
    assert.deepEqual(readTurns(env.project, CONVERSATION_ID), [], label);
  }

  const truncatedTranscript = environment("truncated-transcript");
  genuineAppend(truncatedTranscript);
  const transcript = conversationFile(truncatedTranscript.project);
  writeFileSync(transcript, readFileSync(transcript, "utf8").trimEnd(), "utf8");
  assert.deepEqual(readTurns(truncatedTranscript.project, CONVERSATION_ID), []);

  const malformedTranscript = environment("malformed-transcript");
  genuineAppend(malformedTranscript);
  writeFileSync(conversationFile(malformedTranscript.project), "{broken\n", "utf8");
  assert.deepEqual(readTurns(malformedTranscript.project, CONVERSATION_ID), []);

  const tamperedMarker = environment("tampered-marker");
  genuineAppend(tamperedMarker);
  writeFileSync(ledgerFile(tamperedMarker.profile, "builder-review-markers"), `${"f".repeat(64)}\n`, "utf8");
  assert.deepEqual(readTurns(tamperedMarker.project, CONVERSATION_ID), []);

  const truncatedMarker = environment("truncated-marker");
  genuineAppend(truncatedMarker);
  appendFileSync(ledgerFile(truncatedMarker.profile, "builder-review-markers"), "partial", "utf8");
  assert.deepEqual(readTurns(truncatedMarker.project, CONVERSATION_ID), []);

  const truncatedEvent = environment("truncated-event");
  genuineAppend(truncatedEvent);
  appendFileSync(ledgerFile(truncatedEvent.profile, "conversation-event-markers"), "partial", "utf8");
  assert.deepEqual(readTurns(truncatedEvent.project, CONVERSATION_ID), []);
});

test("same-path project replacement cannot reuse genuine external custody on cold read", () => {
  const container = ownedTemp("cairn-builder-review-replaced-cold-read-");
  const project = join(container, "project");
  const original = join(container, "original-project");
  mkdirSync(project);
  const profile = ownedTemp("cairn-builder-review-replaced-cold-read-profile-");
  const env = Object.freeze({ project, profile });
  setBuilderReviewMarkerDir(profile);
  setTurnMarkerDir(profile);
  setCardMarkerDir(profile);
  genuineAppend(env);
  const genuineBytes = readFileSync(conversationFile(project), "utf8");

  renameSync(project, original);
  mkdirSync(join(project, ".cairn", "conversations"), { recursive: true });
  writeFileSync(conversationFile(project), genuineBytes, "utf8");

  assert.deepEqual(readTurns(project, CONVERSATION_ID), [],
    "a replacement project cannot authenticate copied genuine JSONL with the old marker");
  assert.equal(readHistorySnapshot(project, CONVERSATION_ID).entries.length, 0);
});

test("physical, marker, event, and extra-key duplicates fail closed", () => {
  const physical = environment("physical-duplicate");
  const { turn: physicalTurn } = genuineAppend(physical);
  writeFileSync(conversationFile(physical.project), `${JSON.stringify(physicalTurn)}\n${JSON.stringify(physicalTurn)}\n`, "utf8");
  assert.deepEqual(readTurns(physical.project, CONVERSATION_ID), []);

  const unterminated = environment("unterminated-physical-duplicate");
  const { turn: unterminatedTurn } = genuineAppend(unterminated);
  appendFileSync(conversationFile(unterminated.project), JSON.stringify(unterminatedTurn), "utf8");
  assert.deepEqual(readTurns(unterminated.project, CONVERSATION_ID), [],
    "a complete genuine line plus an unterminated duplicate is ambiguous");

  const extraPhysical = environment("extra-physical-duplicate");
  const { turn: extraTurn } = genuineAppend(extraPhysical);
  const withExtra = { ...clone(extraTurn), hiddenAuthority: true };
  appendFileSync(conversationFile(extraPhysical.project), `${JSON.stringify(withExtra)}\n`, "utf8");
  assert.deepEqual(readTurns(extraPhysical.project, CONVERSATION_ID), [], "same opaque id with extra keys is ambiguous");

  const malformedPhysical = environment("malformed-physical-duplicate");
  const { turn: malformedTurn } = genuineAppend(malformedPhysical);
  appendFileSync(conversationFile(malformedPhysical.project),
    `{"displayTurnId":broken,"role":"builder-review","displayTurnId":"${malformedTurn.displayTurnId}",broken\n`, "utf8");
  assert.deepEqual(readTurns(malformedPhysical.project, CONVERSATION_ID), [],
    "a newline-terminated malformed line that claims the same opaque id is ambiguous");

  const marker = environment("marker-duplicate");
  const { turn: markerTurn } = genuineAppend(marker);
  const markerBinding = captureBuilderReviewProject(marker.project);
  assert.ok(markerBinding);
  assert.throws(
    () => recordBuilderReviewMarker(marker.project, CONVERSATION_ID, markerTurn, markerBinding),
    /BUILDER_REVIEW_MARKER_VERIFY_FAILED/,
  );
  assert.equal(builderReviewMarkerSequence(marker.project).length, 2);
  assert.deepEqual(readTurns(marker.project, CONVERSATION_ID), []);

  const event = environment("event-duplicate");
  const { turn: eventTurn } = genuineAppend(event);
  const eventDigest = builderReviewTurnDigest(event.project, CONVERSATION_ID, eventTurn);
  assert.ok(eventDigest);
  assert.throws(
    () => recordStrictTranscriptEventMarker(
      event.project,
      "builder-review",
      eventDigest,
      canonicalProjectKey(event.project),
    ),
    /TRANSCRIPT_EVENT_VERIFY_FAILED/,
  );
  assert.equal(strictTranscriptEventSequence(event.project).length, 2);
  assert.deepEqual(readTurns(event.project, CONVERSATION_ID), []);
});

test("swapping Builder evidence across genuine owner, Cairn, or envelope order drops it", () => {
  const swapLines = (env: Environment): void => {
    const file = conversationFile(env.project);
    const lines = readFileSync(file, "utf8").trimEnd().split(/\r?\n/u);
    assert.equal(lines.length, 2);
    writeFileSync(file, `${lines[1]}\n${lines[0]}\n`, "utf8");
    assert.equal(readTurns(env.project, CONVERSATION_ID).some((turn) => turn.role === "builder-review"), false);
  };

  const owner = environment("order-owner");
  appendOwnerTurn(owner.project, CONVERSATION_ID, {
    role: "owner",
    inputId: OWNER_ID,
    text: "genuine owner before Builder",
    ts: "2026-08-13T13:30:00.000Z",
    replyContext: null,
  });
  genuineAppend(owner);
  swapLines(owner);

  const cairn = environment("order-cairn");
  genuineAppend(cairn);
  appendCairnTurn(cairn.project, CONVERSATION_ID, {
    role: "cairn",
    text: "genuine Cairn after Builder",
    ts: "2026-08-13T13:31:00.000Z",
  });
  swapLines(cairn);

  const envelope = environment("order-envelope");
  genuineAppend(envelope);
  appendTurn(envelope.project, CONVERSATION_ID, {
    role: "envelope",
    card: LEGACY_CARD,
    ts: "2026-08-13T13:32:00.000Z",
  });
  swapLines(envelope);
});

test("an event-success project-append refusal leaves inert one-use residue", () => {
  const env = environment("append-refusal");
  const pair = task231FixedBuilderPairForTests(env.project);
  writeFileSync(join(env.project, ".cairn"), "unsafe synthetic blocker", "utf8");
  assert.throws(
    () => appendBuilderReviewTurn(env.project, CONVERSATION_ID, pair.context, pair.response),
    /CONDUCTOR_HISTORY_UNSAFE/,
  );
  assert.equal(builderReviewMarkerSequence(env.project).length, 1);
  assert.equal(strictTranscriptEventSequence(env.project).length, 1);
  assert.equal(existsSync(conversationFile(env.project)), false);

  // This exact test-owned blocker is removed only after its identity and path
  // remained inside the throwaway project; no unrelated temp residue is read.
  rmSync(join(env.project, ".cairn"), { force: false });
  assert.equal(appendBuilderReviewTurn(env.project, CONVERSATION_ID, pair.context, pair.response), null,
    "the response was consumed before the failed project append and cannot retry");
  const laterPair = task231FixedBuilderPairForTests(env.project);
  const later = appendBuilderReviewTurn(env.project, CONVERSATION_ID, laterPair.context, laterPair.response);
  assert.ok(later);
  assert.deepEqual(readTurns(env.project, CONVERSATION_ID), [later]);
  assert.equal(builderReviewMarkerSequence(env.project).length, 2);
  assert.equal(strictTranscriptEventSequence(env.project).length, 2);
});

test("a globally ambiguous legacy event ledger refuses before Builder JSONL", () => {
  const env = environment("legacy-event-duplicate");
  const legacyDigest = "d".repeat(64);
  recordTranscriptEventMarker(env.project, "envelope", legacyDigest);
  recordTranscriptEventMarker(env.project, "envelope", legacyDigest);
  const pair = task231FixedBuilderPairForTests(env.project);

  assert.throws(
    () => appendBuilderReviewTurn(env.project, CONVERSATION_ID, pair.context, pair.response),
    /TRANSCRIPT_EVENT_VERIFY_FAILED/,
  );
  assert.equal(builderReviewMarkerSequence(env.project).length, 1,
    "pre-JSON refusal may leave only inert Builder marker residue");
  assert.equal(existsSync(conversationFile(env.project)), false,
    "a live append may not succeed when its strict cold-read ledger is ambiguous");
});

test("builder-only preview is fixed and provider history positively omits its canaries", () => {
  const env = environment("preview-provider");
  const { turn } = genuineAppend(env);
  const preview = listConversations(env.project);
  assert.equal(preview.length, 1);
  assert.equal(preview[0]?.preview, BUILDER_PROPOSAL_REVIEW_BOUNDARY.title);
  assert.notEqual(preview[0]?.preview, "Result card");
  assert.equal(preview[0]?.startedTs, turn.ts);
  const serializedReview = JSON.stringify(turn.review);
  assert.ok(!serializedReview.includes(preview[0]!.preview), "preview is fixed boundary copy, not proposal text");

  const builderSnapshot = readHistorySnapshot(env.project, CONVERSATION_ID);
  assert.deepEqual(providerHistoryMessages(builderSnapshot), []);

  appendOwnerTurn(env.project, CONVERSATION_ID, {
    role: "owner",
    inputId: OWNER_ID,
    text: "ordinary authenticated owner text",
    ts: "2026-08-13T14:00:00.000Z",
    replyContext: null,
  });
  appendCairnTurn(env.project, CONVERSATION_ID, {
    role: "cairn",
    text: "ordinary authenticated Cairn text",
    ts: "2026-08-13T14:00:01.000Z",
  });
  const messages = providerHistoryMessages(readHistorySnapshot(env.project, CONVERSATION_ID));
  assert.deepEqual(messages, [
    { role: "user", content: "ordinary authenticated owner text" },
    { role: "assistant", content: "ordinary authenticated Cairn text" },
  ]);
  const messageBytes = JSON.stringify(messages);
  const canaries = turn.review.kind === "replacement-proposal"
    ? [turn.review.summary, ...turn.review.replacements.flatMap((row) => [row.projectRelativePath, row.beforeText, row.afterText])]
    : [turn.review.what, turn.review.why, turn.review.suggestedTarget];
  for (const canary of canaries) assert.ok(!messageBytes.includes(canary));

  const serviceSource = readFileSync(join(APP_ROOT, "src", "main", "conductor", "service.ts"), "utf8");
  assert.match(serviceSource, /if \(turn\.role === "builder-review"\) return \[\];/u);
  assert.match(serviceSource, /if \(turn\.role === "owner"\)[\s\S]*if \(turn\.role === "cairn"\)/u);
});

test("display parsers reject malformed semantics, accessors, Proxies, extras, and proxied arrays without observation", () => {
  const parserEnv = environment("parser");
  const pair = task231FixedBuilderPairForTests(parserEnv.project);
  const review = composeBuilderProposalReview(pair.context, pair.response);
  assert.ok(review);
  const parsed = parseBuilderProposalReview(clone(review));
  assert.ok(parsed);
  assertDeepFrozen(parsed);

  assert.equal(parseBuilderProposalReview({ ...clone(review), hiddenAuthority: true }), null);

  let getterReads = 0;
  const accessorReview = clone(review) as Record<string, unknown>;
  Object.defineProperty(accessorReview, "summary", {
    enumerable: true,
    configurable: true,
    get() { getterReads += 1; return "do not read"; },
  });
  assert.equal(parseBuilderProposalReview(accessorReview), null);
  assert.equal(getterReads, 0);

  let proxyTraps = 0;
  const trap: ProxyHandler<object> = {
    get(target, property, receiver) { proxyTraps += 1; return Reflect.get(target, property, receiver); },
    ownKeys(target) { proxyTraps += 1; return Reflect.ownKeys(target); },
    getOwnPropertyDescriptor(target, property) { proxyTraps += 1; return Reflect.getOwnPropertyDescriptor(target, property); },
  };
  assert.equal(parseBuilderProposalReview(new Proxy(review, trap)), null);
  assert.equal(proxyTraps, 0);

  assert.ok(review.kind === "replacement-proposal");

  const badBeforeHash = asRecord(clone(review));
  const badBeforeRows = badBeforeHash.replacements;
  assert.ok(Array.isArray(badBeforeRows));
  asRecord(badBeforeRows[0]).beforeSha256 = "f".repeat(64);
  assert.equal(parseBuilderProposalReview(badBeforeHash), null);

  const badAfterHash = asRecord(clone(review));
  const badAfterRows = badAfterHash.replacements;
  assert.ok(Array.isArray(badAfterRows));
  asRecord(badAfterRows[0]).afterSha256 = "f".repeat(64);
  assert.equal(parseBuilderProposalReview(badAfterHash), null);

  const noOp = asRecord(clone(review));
  const noOpRows = noOp.replacements;
  assert.ok(Array.isArray(noOpRows));
  const noOpRow = asRecord(noOpRows[0]);
  noOpRow.afterText = noOpRow.beforeText;
  noOpRow.afterSha256 = noOpRow.beforeSha256;
  assert.equal(parseBuilderProposalReview(noOp), null);

  const sourceRow = review.replacements[0]!;
  const outOfOrder = {
    ...clone(review),
    replacements: [
      { ...clone(sourceRow), projectRelativePath: "z/synthetic.ts" },
      { ...clone(sourceRow), projectRelativePath: "a/synthetic.ts" },
    ],
  };
  assert.equal(parseBuilderProposalReview(outOfOrder), null);

  for (const impossiblePath of [
    ".git/config",
    ".cairn/conversations/forged.jsonl",
    "src/CON/file.ts",
    "src/trailing-dot./file.ts",
    "src/trailing-space /file.ts",
    "src/a:b.ts",
    "src/*.ts",
    "node_modules/package/index.ts",
    "src/private-key.pem",
  ]) {
    assert.equal(parseBuilderProposalReview({
      ...clone(review),
      replacements: [{ ...clone(sourceRow), projectRelativePath: impossiblePath }],
    }), null, `impossible Task 224 path must be rejected: ${impossiblePath}`);
  }

  const inheritedCategory = {
    version: review.version,
    taskNumber: review.taskNumber,
    runId: review.runId,
    turnId: review.turnId,
    contextSha256: review.contextSha256,
    responseSha256: review.responseSha256,
    kind: "capability-request",
    category: "toString",
    categoryLabel: Object.prototype.toString,
    suggestedTargetLabel: "Untrusted suggestion",
    suggestedTarget: "synthetic target",
    what: "synthetic request",
    why: "synthetic reason",
    expectedEffect: "synthetic effect",
    dataExposure: "none",
    costBasis: "none",
    recovery: "discard",
  };
  assert.equal(parseBuilderProposalReview(inheritedCategory), null);

  const proxiedRows = new Proxy(review.replacements, trap);
  assert.equal(parseBuilderProposalReview({ ...review, replacements: proxiedRows }), null);
  assert.equal(proxyTraps, 0);

  const turn: ConductorBuilderReviewTurn = {
    role: "builder-review",
    version: "cairn-builder-review-turn/v1",
    displayTurnId: "55555555-5555-4555-8555-555555555555",
    review,
    ts: "2026-08-13T15:00:00.000Z",
  };
  assert.ok(parseBuilderReviewTurn(clone(turn)));
  assert.equal(parseBuilderReviewTurn({ ...clone(turn), ts: "2026-02-30T15:00:00.000Z" }), null);
  assert.equal(parseBuilderReviewTurn({ ...clone(turn), hiddenAuthority: true }), null);
  assert.equal(parseBuilderReviewTurn(new Proxy(turn, trap)), null);
  assert.equal(proxyTraps, 0);

  const accessorTurn = clone(turn) as unknown as Record<string, unknown>;
  Object.defineProperty(accessorTurn, "displayTurnId", {
    enumerable: true,
    configurable: true,
    get() { getterReads += 1; return turn.displayTurnId; },
  });
  assert.equal(parseBuilderReviewTurn(accessorTurn), null);
  assert.equal(builderReviewDisplayTurnIdCandidate(accessorTurn), null);
  assert.equal(getterReads, 0);
});
