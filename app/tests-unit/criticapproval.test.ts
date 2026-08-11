import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TASK_CALL_BUDGET_V1, canonicalCriticPacket, consumeCriticCallAuthorization, criticCallRequestBody } from "@cairn/core";
import {
  clearCriticCallApproval,
  clearProviderCriticCallApprovalByKey,
  currentCriticCallApproval,
  decideCriticCall,
  openCriticCallApproval,
  openSyntheticCriticCallApproval,
  pendingCriticCallApprovalCount,
  takeCriticCallAuthorization,
} from "../src/main/criticapproval.js";
import { canonicalProjectKey } from "../src/main/conductor/turnauth.js";
import {
  CRITIC_CALL_FILE_CAP,
  CRITIC_CALL_NOT_SENT,
  CRITIC_CALL_PER_FILE_CHARACTER_CAP,
  CRITIC_CALL_PURPOSE_TEXT,
  CRITIC_CALL_TOTAL_CHARACTER_CAP,
  canonicalCriticCallDisclosure,
  type CriticCallCalibrationViewV1,
  type CriticCallDisclosureV1,
} from "../src/shared/critic-call.js";
import { parseCriticCallDecisionRequest, parseCriticCallDisclosure } from "../src/shared/critic-call-parse.js";
import { approved, bundle, route, sha256 } from "./critic-call-fixture.js";

const DIR = process.cwd();

function clone<T>(value: T): T {
  return structuredClone(value);
}

function open(mode: "required" | "optional" | "off" = "required", overrides: Record<string, unknown> = {}) {
  const { request } = bundle();
  const authorization = approved(request, overrides);
  const disclosure = openCriticCallApproval({ dir: DIR, request, authorization, mode });
  return { request, authorization, disclosure };
}

function decide(disclosure: CriticCallDisclosureV1, action: "approve" | "stop-task" | "continue-without-critic") {
  return decideCriticCall({ dir: DIR, approvalId: disclosure.approvalId, action, disclosure });
}

test("c1: the card states exactly the approved call, and nothing the consent forbids", () => {
  clearCriticCallApproval(DIR);
  const { authorization, disclosure } = open("required");
  assert.ok(disclosure);

  // Every route fact is the approved call's own, not a caller's.
  assert.equal(disclosure.provider, authorization.provider);
  assert.equal(disclosure.baseUrl, authorization.baseUrl);
  assert.equal(disclosure.configuredModel, authorization.model);
  assert.equal(disclosure.resolvedModel, authorization.resolvedModel);
  assert.equal(disclosure.resolvedModelRevision, authorization.resolvedModelRevision);
  assert.equal(disclosure.connectionConsentVersion, authorization.connectionConsentVersion);
  assert.equal(disclosure.routeRequestFingerprintSha256, authorization.routeRequestFingerprintSha256);
  assert.equal(disclosure.timeoutMs, authorization.timeoutMs);
  assert.equal(disclosure.maxOutputCharacters, authorization.maxOutputCharacters);
  assert.equal(disclosure.billingBasis, authorization.billingBasis);
  assert.equal(disclosure.attempt, authorization.callAttempt);
  assert.equal(disclosure.attemptCap, TASK_CALL_BUDGET_V1.maxCriticAttempts);

  // Every selected file is named with its hash and count, and the stated
  // totals are the totals of the rows shown.
  assert.deepEqual(
    disclosure.selection.map((row) => [row.path, row.sha256, row.characters]),
    authorization.selection.map((row) => [row.projectRelativePath, row.sha256, row.characters]),
  );
  assert.equal(disclosure.selectedFiles, disclosure.selection.length);
  assert.equal(
    disclosure.selectedCharacters,
    disclosure.selection.reduce((total, row) => total + row.characters, 0),
  );
  assert.equal(disclosure.fileCap, CRITIC_CALL_FILE_CAP);
  assert.equal(disclosure.perFileCharacterCap, CRITIC_CALL_PER_FILE_CHARACTER_CAP);
  assert.equal(disclosure.totalCharacterCap, CRITIC_CALL_TOTAL_CHARACTER_CAP);
  assert.ok(disclosure.selectedFiles <= CRITIC_CALL_FILE_CAP);
  assert.ok(disclosure.selectedCharacters <= CRITIC_CALL_TOTAL_CHARACTER_CAP);

  // The promises the owner is given cannot vary.
  assert.equal(disclosure.purpose, CRITIC_CALL_PURPOSE_TEXT);
  assert.match(disclosure.purpose, /cannot read or edit the project, or declare DONE/u);
  assert.deepEqual([...disclosure.notSent], [...CRITIC_CALL_NOT_SENT]);

  // Nothing the card carries may be a path, a hash of the project, or content.
  const rendered = JSON.stringify(disclosure);
  // A drive letter is one letter preceded by a non-letter; `https://` is not
  // one, and the approved base URL is allowed to be there.
  assert.doesNotMatch(rendered, /(?:^|[^A-Za-z])[A-Za-z]:[\\/]/u);
  assert.doesNotMatch(rendered, /\/Users\/|\/home\/|\.git\/|\.cairn\/|userData/u);
  assert.doesNotMatch(rendered, /projectHash|apiKey|Bearer |packet|systemPrompt/u);
  for (const row of disclosure.selection) {
    assert.doesNotMatch(row.path, /^\//u);
    assert.doesNotMatch(row.path, /\\/u);
    assert.doesNotMatch(row.path, /\.\./u);
  }
  assert.ok(Object.isFrozen(disclosure));
});

test("c1: the card states the whole payload, not only the files", () => {
  clearCriticCallApproval(DIR);
  const { request, disclosure } = open("required");
  assert.ok(disclosure);

  // A critic packet is not only file contents: it also carries the task's
  // path-free plan and check metadata. A card that counted files and stopped
  // would be true line by line and false as a whole, so these counts and the
  // real total are checked against the packet Core will actually send.
  const packet = (request as { packet: Record<string, any> }).packet;
  assert.deepEqual(disclosure.planMetadata, {
    checks: packet.taskSpec.criteria.length,
    preferences: packet.taskSpec.preferences.length,
    references: packet.taskSpec.references.length,
    evidenceItems: packet.checkEvidence.length,
    priorFindings: packet.priorConfirmedFindings.length,
    comparisonTrials: packet.comparisonTrials.length,
  });
  assert.ok(disclosure.planMetadata.checks > 0, "the fixture must actually carry plan metadata");

  const canonical = canonicalCriticPacket(packet);
  assert.ok(canonical);
  assert.equal(disclosure.totalRequestCharacters, canonical.length, "the stated total is the real request size");
  assert.ok(
    disclosure.totalRequestCharacters > disclosure.selectedCharacters,
    "and it exceeds the file contents alone, which is the whole point",
  );
});

test("c1: only a branded approved call composes a card", () => {
  clearCriticCallApproval(DIR);
  const { request } = bundle();
  const authorization = approved(request);
  for (const [label, value] of [
    ["a spread copy", { ...authorization }],
    ["a structured clone", clone(authorization)],
    ["nothing", null],
    ["a lookalike record", { provider: "openrouter", selection: [], routeRequestFingerprintSha256: "a".repeat(64) }],
    ["a string", "approved"],
  ] as const) {
    assert.equal(openCriticCallApproval({ dir: DIR, request, authorization: value, mode: "required" }), null, label);
  }

  // The request must be the one the approval was minted from, or the card
  // would describe a payload this call will not send.
  const other = bundle();
  assert.equal(
    openCriticCallApproval({ dir: DIR, request: other.request, authorization, mode: "required" }),
    null,
    "another request composes nothing",
  );

  // An already-sent call must never ask to be approved again. Core keeps the
  // brand after a send so custody can still be recorded, so the brand alone
  // is not proof the call is still unspent.
  const spent = approved(request, route({ callAttempt: 3 }));
  assert.equal(consumeCriticCallAuthorization(spent), true);
  assert.equal(
    openCriticCallApproval({ dir: DIR, request, authorization: spent, mode: "required" }),
    null,
    "a spent call composes no card",
  );

  // A refused open must not leave an earlier card standing: a caller that
  // believes it has no card would still have an approvable one.
  const first = openCriticCallApproval({ dir: DIR, request, authorization: approved(request, route({ callAttempt: 2 })), mode: "required" });
  assert.ok(first);
  assert.equal(pendingCriticCallApprovalCount(), 1);
  assert.equal(openCriticCallApproval({ dir: DIR, request, authorization: null, mode: "required" }), null);
  assert.equal(pendingCriticCallApprovalCount(), 0, "a refused open drops the earlier card");
  assert.equal(currentCriticCallApproval(DIR), null);
});

test("c1: a live provider authorization cannot be labelled as synthetic calibration", () => {
  clearCriticCallApproval(DIR);
  const { request } = bundle();
  const authorization = approved(request);
  const rows = (request as {
    packet: { selectedTrackedText: readonly { projectRelativePath: string; sha256: string; content: string }[] };
  }).packet.selectedTrackedText;
  const body = criticCallRequestBody(authorization);
  assert.ok(body);
  const calibration: CriticCallCalibrationViewV1 = Object.freeze({
    manifestSha256: "a".repeat(64),
    fixtureId: "C01",
    fixtureIndex: 1,
    fixtureCount: 12,
    fixtureSha256: "b".repeat(64),
    packetSha256: authorization.packetSha256,
    requestSha256: authorization.requestSha256,
    requestBodySha256: sha256(body),
    text: Object.freeze(rows.map((row) => Object.freeze({
      path: row.projectRelativePath,
      sha256: row.sha256,
      content: row.content,
    }))),
  });

  assert.equal(
    openSyntheticCriticCallApproval({ dir: DIR, request, authorization, calibration }),
    null,
    "exact request-bound disclosure data cannot put fake/no-key wording over a live route",
  );
  assert.equal(currentCriticCallApproval(DIR), null);

  const provider = openCriticCallApproval({ dir: DIR, request, authorization, mode: "required" });
  assert.ok(provider, "the refusal must be about the route label, not a malformed authorization fixture");
  assert.equal(provider.callKind, "provider");
  assert.equal(provider.calibration, null);
  clearCriticCallApproval(DIR);
});

test("c2: one approval decides once, and a decline consumes it too", () => {
  clearCriticCallApproval(DIR);
  const first = open("required");
  assert.ok(first.disclosure);
  assert.equal(currentCriticCallApproval(DIR)?.approvalId, first.disclosure.approvalId);

  const approvedOnce = decide(first.disclosure, "approve");
  assert.ok(approvedOnce.ok);
  assert.equal(approvedOnce.decision.outcome, "approved");
  assert.ok(approvedOnce.grant);
  assert.equal(currentCriticCallApproval(DIR), null, "deciding clears the card");

  const replay = decide(first.disclosure, "approve");
  assert.equal(replay.ok, false);
  assert.equal(replay.ok === false ? replay.code : null, "CRITIC_CALL_DECISION_UNKNOWN_APPROVAL");

  // A decline is a decision too: it consumes the approval and grants nothing.
  const second = open("optional");
  assert.ok(second.disclosure);
  const declined = decide(second.disclosure, "continue-without-critic");
  assert.ok(declined.ok);
  assert.equal(declined.decision.outcome, "continued-without-critic");
  assert.equal(declined.grant, null);
  assert.equal(decide(second.disclosure, "approve").ok, false, "a declined call cannot then be approved");

  const third = open("required");
  assert.ok(third.disclosure);
  const stopped = decide(third.disclosure, "stop-task");
  assert.ok(stopped.ok);
  assert.equal(stopped.decision.outcome, "task-stopped");
  assert.equal(stopped.grant, null);
});

test("c2: an altered echo decides nothing and destroys nothing", () => {
  // Every one of these is a well-formed card that differs from the one main
  // issued. Main must refuse the press AND leave the owner's approval exactly
  // where it was: consuming here would let one altered field from a buggy or
  // hostile renderer permanently deny the owner their own approval.
  const MISMATCH = "CRITIC_CALL_DECISION_ECHO_MISMATCH";
  const MALFORMED = "CRITIC_CALL_DECISION_MALFORMED";
  for (const [label, patch, expected] of [
    ["a narrowed selection", { selection: [], selectedFiles: 0, selectedCharacters: 0 }, MISMATCH],
    ["a different model", { resolvedModel: "attacker/cheap-model" }, MISMATCH],
    ["a different endpoint", { baseUrl: "https://attacker.example/v1" }, MISMATCH],
    ["a shorter timeout", { timeoutMs: 599_999 }, MISMATCH],
    ["a smaller stated output cap", { maxOutputCharacters: 1_024 }, MISMATCH],
    ["a softer billing basis", { billingBasis: "Free." }, MISMATCH],
    ["another attempt", { attempt: 2 }, MISMATCH],
    ["a different fingerprint", { routeRequestFingerprintSha256: "b".repeat(64) }, MISMATCH],
    ["fewer plan checks", { planMetadata: { checks: 0, preferences: 0, references: 0, evidenceItems: 0, priorFindings: 0, comparisonTrials: 0 } }, MISMATCH],
    // A request smaller than the files inside it is impossible, so the parser
    // must refuse it outright rather than merely notice it differs.
    ["a stated request smaller than its own files", { totalRequestCharacters: 1 }, MALFORMED],
  ] as const) {
    clearCriticCallApproval(DIR);
    const { disclosure } = open("required");
    assert.ok(disclosure);
    const tampered = { ...disclosure, ...patch } as CriticCallDisclosureV1;
    const parsed = parseCriticCallDisclosure(tampered);
    const outcome = decideCriticCall({
      dir: DIR,
      approvalId: disclosure.approvalId,
      action: "approve",
      disclosure: tampered,
    });

    assert.equal(outcome.ok, false, label);
    // The expected code is stated per row, not derived from whether the echo
    // happened to parse: deriving it lets the assertion adapt to a guard that
    // was removed, which is exactly the failure this loop exists to catch.
    assert.equal(outcome.ok === false ? outcome.code : null, expected, label);
    if (expected === "CRITIC_CALL_DECISION_MALFORMED") assert.equal(parsed, null, `${label} must not parse`);
    else assert.ok(parsed, `${label} must parse, or it proves the wrong thing`);
    // The owner can still decide their own call.
    assert.equal(currentCriticCallApproval(DIR)?.approvalId, disclosure.approvalId, `${label}: the approval survives`);
    assert.ok(decide(disclosure, "approve").ok, `${label}: and the honest press still works`);
  }
  clearCriticCallApproval(DIR);
});

test("c2: no refusal spends the approval", () => {
  clearCriticCallApproval(DIR);
  const { disclosure } = open("required");
  assert.ok(disclosure);

  // Every closed refusal, in one place, each followed by proof the card lives.
  const refusals: Array<[string, unknown]> = [
    ["malformed", { dir: DIR, approvalId: disclosure.approvalId, action: "approve", disclosure: { ...disclosure, blocks: true } }],
    ["unknown approval", { dir: DIR, approvalId: "11111111-1111-4111-8111-111111111111", action: "approve", disclosure: { ...disclosure, approvalId: "11111111-1111-4111-8111-111111111111" } }],
    ["an action the mode never offered", { dir: DIR, approvalId: disclosure.approvalId, action: "continue-without-critic", disclosure: { ...disclosure, mode: "optional", actions: ["approve", "continue-without-critic"] } }],
    ["an altered echo", { dir: DIR, approvalId: disclosure.approvalId, action: "approve", disclosure: { ...disclosure, billingBasis: "Free." } }],
  ];
  for (const [label, request] of refusals) {
    assert.equal(decideCriticCall(request).ok, false, label);
    assert.equal(currentCriticCallApproval(DIR)?.approvalId, disclosure.approvalId, `${label} must not spend it`);
  }
  assert.ok(decide(disclosure, "approve").ok, "and the owner's own press still decides it");
});


test("c2: one approved call can be carded once, and the gate and lifecycle are wired", () => {
  clearCriticCallApproval(DIR);
  const { request } = bundle();
  const authorization = approved(request);
  const first = openCriticCallApproval({ dir: DIR, request, authorization, mode: "required" });
  assert.ok(first);
  const decided = decideCriticCall({ dir: DIR, approvalId: first.approvalId, action: "approve", disclosure: first });
  assert.ok(decided.ok);

  // Once a call has produced a grant it must never ask again: a second card
  // would mint a second grant and make this module's single-use claim false.
  assert.equal(
    openCriticCallApproval({ dir: DIR, request, authorization, mode: "required" }),
    null,
    "an already-granted call composes no second card",
  );

  // The approval belongs to the run that opened it. These two seams are what
  // stop it outliving a cancelled run or slipping past Task 215's gate.
  const tasks = readFileSync(join(__dirname, "..", "..", "src", "main", "tasks.ts"), "utf8");
  const start = tasks.indexOf(`ipcMain.handle("critic:call-decide"`);
  const handler = tasks.slice(start, tasks.indexOf("ipcMain.handle(", start + 10));
  const gateIndex = handler.indexOf("pendingTaskStartRefusal(");
  assert.ok(gateIndex >= 0, "a gated project may not have a paid call approved against it");
  assert.ok(gateIndex < handler.indexOf("decideCriticCall("), "and the gate is consulted first");
  assert.ok(handler.includes("projectStatus(request.dir)"), "the same project check its neighbours make");

  const generation = tasks.slice(tasks.indexOf("function nextGeneration("), tasks.indexOf("function invalidateProjectPreview("));
  assert.ok(generation.includes("clearProviderCriticCallApprovalByKey(key)"),
    "a replaced or cancelled task generation must not leave its provider card behind");
  assert.ok(!generation.includes("clearCriticCallApprovalByKey(key)"),
    "task preview cleanup must not erase an independently owned synthetic calibration card");
});

test("c2: task-generation cleanup can retire only provider cards", () => {
  clearCriticCallApproval(DIR);
  const key = canonicalProjectKey(DIR);

  const provider = open("required").disclosure;
  assert.ok(provider);
  assert.equal(provider.callKind, "provider");
  clearProviderCriticCallApprovalByKey(key);
  assert.equal(currentCriticCallApproval(DIR), null, "the task-owned provider card is retired");

  const approvalSource = readFileSync(join(__dirname, "..", "..", "src", "main", "criticapproval.ts"), "utf8");
  const helper = approvalSource.slice(
    approvalSource.indexOf("export function clearProviderCriticCallApprovalByKey"),
    approvalSource.indexOf("/** A read-only diagnostic", approvalSource.indexOf("export function clearProviderCriticCallApprovalByKey")),
  );
  assert.match(helper, /pending\.get\(key\)\?\.disclosure\.callKind === "provider"/);
  assert.equal(helper.match(/pending\.delete\(key\)/gu)?.length, 1,
    "the helper has no unconditional delete path that could erase synthetic calibration");
});

test("c1: a card Cairn could not decide is never issued", () => {
  clearCriticCallApproval(DIR);
  // Core's path rules are looser than the App's: a zero-width character is
  // legal in a tracked filename and Core accepts it, but the echo parser
  // rejects it. Without the round-trip check the owner would be shown a paid
  // call they could neither approve nor stop.
  const hostile = bundle({ path: "src/report​.md" });
  const authorization = approved(hostile.request);
  assert.ok(
    authorization.selection.some((row) => row.projectRelativePath.includes("​")),
    "Core must really have accepted the zero-width path, or this proves nothing",
  );
  assert.equal(
    openCriticCallApproval({ dir: DIR, request: hostile.request, authorization, mode: "required" }),
    null,
    "an undecidable card is refused rather than shown",
  );
  assert.equal(pendingCriticCallApprovalCount(), 0);
});

test("c2: an id from another card or another project decides nothing", () => {
  clearCriticCallApproval(DIR);
  const other = join(DIR, "..");
  clearCriticCallApproval(other);
  const here = open("required");
  assert.ok(here.disclosure);

  // Another project's directory holds no such approval.
  assert.equal(
    decideCriticCall({ dir: other, approvalId: here.disclosure.approvalId, action: "approve", disclosure: here.disclosure }).ok,
    false,
  );
  assert.equal(currentCriticCallApproval(DIR)?.approvalId, here.disclosure.approvalId, "and the genuine card survives");

  // Opening a second card for the same project makes the first stale.
  const next = bundle();
  const replacement = openCriticCallApproval({
    dir: DIR,
    request: next.request,
    authorization: approved(next.request, { callAttempt: 2 }),
    mode: "required",
  });
  assert.ok(replacement);
  assert.notEqual(replacement.approvalId, here.disclosure.approvalId);
  assert.equal(decide(here.disclosure, "approve").ok, false, "the replaced card is stale");
  assert.ok(decide(replacement, "approve").ok);
});

test("c3: the frozen mode decides the controls", () => {
  clearCriticCallApproval(DIR);
  const required = open("required");
  assert.ok(required.disclosure);
  assert.deepEqual([...required.disclosure.actions], ["approve", "stop-task"]);
  const notOffered = decideCriticCall({
    dir: DIR,
    approvalId: required.disclosure.approvalId,
    action: "continue-without-critic",
    disclosure: required.disclosure,
  });
  assert.equal(notOffered.ok, false);
  assert.equal(notOffered.ok === false ? notOffered.code : null, "CRITIC_CALL_DECISION_MALFORMED");

  clearCriticCallApproval(DIR);
  const optional = open("optional");
  assert.ok(optional.disclosure);
  assert.deepEqual([...optional.disclosure.actions], ["approve", "continue-without-critic"]);
  assert.equal(
    decideCriticCall({
      dir: DIR,
      approvalId: optional.disclosure.approvalId,
      action: "stop-task",
      disclosure: optional.disclosure,
    }).ok,
    false,
    "a stop is not on offer for an optional critic",
  );

  // A card echoed with a *different* mode is internally consistent — its
  // actions match the mode it claims — so the parser passes it. The mode the
  // approval was actually opened under is what decides which press exists.
  clearCriticCallApproval(DIR);
  const held = open("required");
  assert.ok(held.disclosure);
  const swappedMode = {
    ...held.disclosure,
    mode: "optional" as const,
    actions: ["approve", "continue-without-critic"] as const,
  };
  assert.ok(parseCriticCallDisclosure(swappedMode), "the tampered card is well formed on its own");
  const swapped = decideCriticCall({
    dir: DIR,
    approvalId: held.disclosure.approvalId,
    action: "continue-without-critic",
    disclosure: swappedMode,
  });
  assert.equal(swapped.ok, false);
  assert.equal(
    swapped.ok === false ? swapped.code : null,
    "CRITIC_CALL_DECISION_ACTION_NOT_OFFERED",
    "the frozen mode decides, not the mode the card claims",
  );

  clearCriticCallApproval(DIR);
  const off = open("off");
  assert.equal(off.disclosure, null, "an off critic composes no card at all");
  assert.equal(currentCriticCallApproval(DIR), null);
  assert.equal(pendingCriticCallApprovalCount(), 0);
});

test("c4: approving sends nothing, and the grant is single use", () => {
  clearCriticCallApproval(DIR);
  const { authorization, disclosure } = open("required");
  assert.ok(disclosure);
  const outcome = decide(disclosure, "approve");
  assert.ok(outcome.ok);
  assert.ok(outcome.grant);

  // The grant carries the approved call and yields it exactly once.
  assert.equal(takeCriticCallAuthorization(outcome.grant), authorization);
  assert.equal(takeCriticCallAuthorization(outcome.grant), null, "a grant is not a second send");
  assert.equal(takeCriticCallAuthorization({ ...outcome.grant }), null, "nor is a copy of one");
  assert.equal(takeCriticCallAuthorization(clone(outcome.grant)), null);
  assert.equal(takeCriticCallAuthorization(null), null);

  // The grant itself carries no credential and no way to widen the call.
  assert.deepEqual(Object.keys(outcome.grant).sort(), ["approvalId", "routeRequestFingerprintSha256"]);
});

test("c5: the renderer cannot forge, widen, or replay through the parsers", () => {
  clearCriticCallApproval(DIR);
  const { disclosure } = open("required");
  assert.ok(disclosure);
  assert.ok(parseCriticCallDisclosure(clone(disclosure)), "an honest structural copy still parses");

  for (const [label, value] of [
    ["an extra key", { ...disclosure, blocks: true }],
    ["a missing key", (() => { const { billingBasis: _drop, ...rest } = disclosure; return rest; })()],
    ["a rewritten purpose", { ...disclosure, purpose: "It can edit the project." }],
    ["a shortened not-sent list", { ...disclosure, notSent: ["tools of any kind"] }],
    ["an invented action", { ...disclosure, actions: ["approve", "send-anyway"] }],
    ["actions the mode does not offer", { ...disclosure, actions: ["approve", "continue-without-critic"] }],
    ["a ninth file", {
      ...disclosure,
      selection: Array.from({ length: 9 }, (_row, index) => ({ path: `src/f${index}.ts`, sha256: "c".repeat(64), characters: 1 })),
      selectedFiles: 9,
      selectedCharacters: 9,
    }],
    ["an absolute path", { ...disclosure, selection: [{ path: "C:/Users/owner/.cairn/token", sha256: "c".repeat(64), characters: 1 }], selectedFiles: 1, selectedCharacters: 1 }],
    ["a traversal", { ...disclosure, selection: [{ path: "../outside.ts", sha256: "c".repeat(64), characters: 1 }], selectedFiles: 1, selectedCharacters: 1 }],
    ["a reserved area", { ...disclosure, selection: [{ path: ".git/config", sha256: "c".repeat(64), characters: 1 }], selectedFiles: 1, selectedCharacters: 1 }],
    ["an understated file count", { ...disclosure, selectedFiles: 0 }],
    ["an understated character count", { ...disclosure, selectedCharacters: 0 }],
    ["an over-cap file", { ...disclosure, selection: [{ path: "src/big.ts", sha256: "c".repeat(64), characters: 8_001 }], selectedFiles: 1, selectedCharacters: 8_001 }],
    ["a negative count", { ...disclosure, selectedCharacters: -1 }],
    ["a fractional count", { ...disclosure, selectedFiles: 1.5 }],
    ["a bad fingerprint", { ...disclosure, routeRequestFingerprintSha256: "not-a-hash" }],
    ["a bidi override in the model", { ...disclosure, resolvedModel: "opus\u202e5" }],
    ["a zero attempt", { ...disclosure, attempt: 0 }],
    ["an attempt past the cap", { ...disclosure, attempt: 4 }],
  ] as const) {
    assert.equal(parseCriticCallDisclosure(value), null, label);
  }

  // Prototype and accessor tricks.
  const accessorBacked = Object.defineProperty({ ...disclosure }, "resolvedModel", {
    get: () => "attacker/model",
    enumerable: true,
    configurable: true,
  });
  assert.equal(parseCriticCallDisclosure(accessorBacked), null, "an accessor is not a value");
  assert.equal(parseCriticCallDisclosure(new Proxy({ ...disclosure }, {})), null, "a proxy is not a record");
  assert.equal(parseCriticCallDisclosure(Object.create(disclosure)), null, "an inherited card is not a card");

  // The request parser refuses a press the card never offered and an id that
  // does not name the card echoed with it.
  assert.equal(
    parseCriticCallDecisionRequest({ dir: DIR, approvalId: disclosure.approvalId, action: "continue-without-critic", disclosure }),
    null,
  );
  assert.equal(
    parseCriticCallDecisionRequest({ dir: DIR, approvalId: "11111111-1111-4111-8111-111111111111", action: "approve", disclosure }),
    null,
  );
  assert.ok(parseCriticCallDecisionRequest({ dir: DIR, approvalId: disclosure.approvalId, action: "approve", disclosure }));
});

test("c5: the canonical card is order-independent and covers every field", () => {
  clearCriticCallApproval(DIR);
  const { disclosure } = open("required");
  assert.ok(disclosure);
  const baseline = canonicalCriticCallDisclosure(disclosure);

  // Key order cannot change the bytes a decision compares.
  const reordered = Object.freeze(Object.fromEntries(Object.entries(disclosure).reverse())) as CriticCallDisclosureV1;
  assert.equal(canonicalCriticCallDisclosure(reordered), baseline);

  // Every field the owner reads must move those bytes, or a decision could
  // approve a card that differs in it.
  for (const [label, patch] of [
    ["approvalId", { approvalId: "11111111-1111-4111-8111-111111111111" }],
    ["mode", { mode: "optional" as const }],
    ["attempt", { attempt: 2 }],
    ["attemptCap", { attemptCap: 2 }],
    ["provider", { provider: "anthropic" }],
    ["baseUrl", { baseUrl: "https://api.anthropic.com/v1" }],
    ["configuredModel", { configuredModel: "other/model" }],
    ["resolvedModel", { resolvedModel: "other/model" }],
    ["resolvedModelRevision", { resolvedModelRevision: "2026-06-01" }],
    ["connectionConsentVersion", { connectionConsentVersion: "consent-v2" }],
    ["routeRequestFingerprintSha256", { routeRequestFingerprintSha256: "d".repeat(64) }],
    ["selection", { selection: [] }],
    ["selectedFiles", { selectedFiles: 7 }],
    ["selectedCharacters", { selectedCharacters: 7 }],
    ["fileCap", { fileCap: 7 }],
    ["perFileCharacterCap", { perFileCharacterCap: 7 }],
    ["totalCharacterCap", { totalCharacterCap: 7 }],
    ["timeoutMs", { timeoutMs: 1 }],
    ["maxOutputCharacters", { maxOutputCharacters: 1 }],
    ["billingBasis", { billingBasis: "Free." }],
    ["actions", { actions: ["approve"] as const }],
    ["notSent", { notSent: ["tools of any kind"] }],
  ] as const) {
    const changed = canonicalCriticCallDisclosure({ ...disclosure, ...patch } as CriticCallDisclosureV1);
    assert.notEqual(changed, baseline, `${label} must move the canonical card`);
  }
});

test("c5: the IPC boundary returns a decision and never the grant", () => {
  const tasks = readFileSync(join(__dirname, "..", "..", "src", "main", "tasks.ts"), "utf8");
  const start = tasks.indexOf(`ipcMain.handle("critic:call-decide"`);
  assert.notEqual(start, -1, "the one critic-call channel must exist");
  const handler = tasks.slice(start, tasks.indexOf("ipcMain.handle(", start + 10));

  // Parse before deciding: a malformed request never reaches the authority.
  const parseIndex = handler.indexOf("parseCriticCallDecisionRequest(");
  const decideIndex = handler.indexOf("decideCriticCall(");
  assert.ok(parseIndex >= 0 && parseIndex < decideIndex, "the request is parsed before it is decided");
  assert.match(handler, /decideCriticCall\(request\)/u, "the decision reads the parsed request, not the raw one");

  // The reply carries the decision only. The grant stays in main.
  assert.match(handler, /value: outcome\.decision/u);
  assert.equal(handler.includes("outcome.grant"), false, "a grant must never cross IPC");
  assert.equal(handler.includes("takeCriticCallAuthorization"), false);

  // Exactly one decision channel. Q8 stage 4 adds three guarded synthetic
  // lifecycle channels, but none is a second route for a decision or grant.
  assert.equal(tasks.match(/ipcMain\.handle\("critic:call-decide"/gu)?.length, 1);
  assert.equal(tasks.match(/ipcMain\.handle\("critic:calibration-(?:open|current|cancel)"/gu)?.length, 3);
  const preload = readFileSync(join(__dirname, "..", "..", "src", "preload.ts"), "utf8");
  assert.equal(preload.match(/critic:call-decide/gu)?.length, 1);
  assert.match(preload, /criticCallDecide: \(request\) => ipcRenderer\.invoke\("critic:call-decide", request\)/u);
});

test("c4: the approval modules open no network or process channel, and touch the disk only to resolve a project", () => {
  const root = join(__dirname, "..", "..", "src");
  const main = readFileSync(join(root, "main", "criticapproval.ts"), "utf8");
  const shared = readFileSync(join(root, "shared", "critic-call.ts"), "utf8");

  const mainImports = [...main.matchAll(/from "([^"]+)"/gu)].map((match) => match[1]).sort();
  assert.deepEqual(mainImports, [
    "../shared/critic-call-parse.js",
    "../shared/critic-call.js",
    "./conductor/turnauth.js",
    "@cairn/core",
    "node:crypto",
  ]);
  // The card's types and constants must stay free of any node import: the
  // renderer imports them as values, and a `node:util` in that path breaks the
  // renderer bundle. The parsers, which the renderer never runs, live apart.
  assert.deepEqual([...shared.matchAll(/from "([^"]+)"/gu)].map((match) => match[1]), []);
  const parsers = readFileSync(join(__dirname, "..", "..", "src", "shared", "critic-call-parse.ts"), "utf8");
  assert.deepEqual([...parsers.matchAll(/from "([^"]+)"/gu)].map((match) => match[1]), ["node:util", "./critic-call.js"]);

  for (const source of [main, shared]) {
    assert.doesNotMatch(source, /fetch\(|node:https?|node:net|node:fs|child_process|require\(|eval\(/u);
  }

  // Honest about the one disk touch these modules DO make: canonicalProjectKey
  // resolves a real path, so a project key costs a syscall. Naming it keeps
  // the claim above true rather than merely unfalsified by grepping two files.
  const turnauth = readFileSync(join(__dirname, "..", "..", "src", "main", "conductor", "turnauth.ts"), "utf8");
  assert.match(turnauth, /realpathSync/u);
  assert.doesNotMatch(turnauth, /fetch\(|node:net|child_process/u, "and nothing beyond that");
  // Approving must not reach the transport: that wiring is stage 4's.
  assert.doesNotMatch(main, /sendCriticCall|critictransport/u);
});
