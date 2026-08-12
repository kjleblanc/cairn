import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  CRITIC_CALIBRATION_MANIFEST,
  CRITIC_CALIBRATION_MANIFEST_SHA256,
  CRITIC_CALIBRATION_MANIFEST_VERSION,
  CRITIC_CALIBRATION_EVALUATOR_POLICIES,
  createCriticCalibrationFakeTransport,
  createCriticCalibrationOrchestrator,
  criticCalibrationFixtureRequest,
  projectCriticCalibrationExpectedOutput,
  selectCriticCalibrationFixture,
} from "../src/main/criticcalibration.js";
import { activeCriticActivationCount } from "../src/main/criticactivation.js";
import { currentCriticCallApproval, decideCriticCall, openCriticCallApproval } from "../src/main/criticapproval.js";
import { canonicalCriticPacket, parseCriticOutput } from "@cairn/core";
import { approved, bundle } from "./critic-call-fixture.js";

const SHA256 = /^[0-9a-f]{64}$/u;

function fakeTransport(fetchImpl: typeof fetch) {
  const value = createCriticCalibrationFakeTransport(fetchImpl);
  assert.ok(value);
  return value;
}

const OUTPUT_FIXTURES = Object.freeze([
  ["C01", "clean-ten-notes.json", "c38441b812bf57c4b08a3da1d0fdffe7ca30cec01bc616801b15ac6307a75a5b"],
  ["C02", "critic-failure.json", "69d37f281a6c355120bfac0efffbdf431fcec53ac97e646e7e7e7c9831a89a1b"],
  ["C03", "grouped-root-cause.json", "889428432fcc6caddc3147a76ef7a39ace3edf58929c3e40d814e0d6311ad698"],
  ["C04", "cant-tell.json", "48a809e31f0db5c339c78576f02811b1811697ad3e885105852d5537f58e7f10"],
  ["C05", "comparison-aa-tie.json", "575396b049420bdd6384604d928a8703c3f197d4c69e355f196d71867aa33ae4"],
  ["C06", "comparison-ab-candidate.json", "ce5ca1511b25357dd30d40f698c9dbee6da1dad91e8a5b3f9fa2665fad7c3184"],
  ["C07", "comparison-ba-candidate.json", "566638f790897b81cfde9487dd0a341e5cd8ac17bc4485c39cf7536e8845f88c"],
  ["C08", "prompt-injection-data.json", "829f4073da5139eb35221ced17a9502ee66ba0d2bef9c3f3b8cad3023da40fe5"],
  ["C09", "post-repair-minor.json", "a1dd5583ab88ceed8fbc15a2fa76f75558ed3d019d30460929c8a7f66a55dc48"],
  ["C10", "native-boundary-alert.json", "270e9df20765b11eea8361e9733e02ab18f94e7bd757ef1ecacefb0af808b627"],
  ["C11", "native-boundary-all-categories.json", "ac062de13b83525ebc872fa3089a52cd40139dc8dcff0bf4179c51bebc434ba9"],
  ["C12", "malformed-forged-authority.json", "3be54a3ba60a82268b8a72690cae022a28219edb1ec538f37720ed93da8f25cb"],
] as const);

// Independent pins, copied from the preregistered manifest review. Do not
// derive these expectations from the request builder: changing one synthetic
// byte must make this test fail until the manifest is deliberately renewed.
const INPUT_HASHES = Object.freeze([
  ["C01", "ec91e14fcb8ba56631075d7926c5451c48eb63359cb9b3133a45aca0ef945dcc", "4a8c362957899ef4d9bc7a300055eb87d5c09463bf88931a79ea6c8dfd958c43", "57eceed9b96c0d146711a78dcf73583a4ea61f59c46ae22b0f451c6298143aee", "74d334215f019c590912ab91c65c414548fcb1af64e6890b146c68cdc4939990"],
  ["C02", "b5615be97bdbbe98d1777bd1d26120a096abc2f0cb974d76abca0f4408ff1471", "c123ff4ce7b5c20c2c15b92823df7ba3af00fb8626edfcf51a10038644f741cd", "8bbf8a6e4ec911f14d80efd5a7d8182791c90b77a869a4f1f5e4821f6c3a0e44", "4bb9e55a7670814187b2f18b87a2d472e92e86493b0ec0817778399f02057154"],
  ["C03", "710fab01cc243f4ad13c494fac5edf0f0a5be5aaf9972edae8f8aeb1dab710ea", "aa2d8b0b6b3d7bd361fb17a56c721e3278fddc3c8d66dd5964b90f944d288d3d", "7e6a229c90eac7f63598abc763d240c100bdecc2bb46ec3cef6803efba971765", "c4f7ca0ba1c762080f02804dc92f98ea1035dfefdec53338cad83c12466c9315"],
  ["C04", "dc6517336301e78e5fc980873803e3cce3256e04b17568a2612483184eb85cea", "e09494494dd21766fe427fe36c82832f0cb071facbffe90f211a0972e7deee64", "7425e5219298d115e7e803d7beea0623ec5c6cecc2b7d610c52642d8034671d9", "f7e6594420b6e6a9ae848f1c34dcdea671580acc0c09863881a64562c39a7bd4"],
  ["C05", "3b9cae049cc158f65d20b1daf2c1b9adeafdc3f480c0d1711f93da7c788d7463", "ae8f0a4cd1e8bbc93eb0ef34dd21f2e9b52e30c30635c9d7ba858595c68b25be", "65413160fa2f8114ec3b5b830ca58d91977cb4181a40bf31bbad6844233c19a7", "4f2ac553ab8ccbcafcc15b271265fe190ab180a8e1617f9157e253d20af01021"],
  ["C06", "ece7fbce709f059d55d7cc9f5578e7eaae24455f699548ddf0ef90e125cf925c", "4def1851b9714bc34d6aa9e51100da7c8378b44de48bfd866eb5288932a1e164", "2685e18ce1624f4476a73a745648ac6681849cf0364819e40d2265bb5cc54efc", "60c825417e5f746f5f8f1fbfbc857c3eadf4e044672cb994a23c145d9fd27c18"],
  ["C07", "98067c6bc9119507fe322b03a15d8d16626ebb25e441c6166b36bdae45931d93", "37e9810fb05b305faa01ecfffed67b1e572c0500a4549483595e16675d65ebc6", "7a4f5db69f5467337e8e6f20b42e06dc52f031129ad723d443234668b9dad18c", "56eab0e2627d0738b152da038f68825864c499fd3b3e606fc52823a1f8e8ef0a"],
  ["C08", "6b2bc13137fed0e083bd2d2d2b305eb030fc0a3141b8220a54de2bd930cb8068", "360917773445ba419758845dcea8d7f687f8cb1fd8b532937b1f33614bc6ccd2", "6016b8e1040c261b48de1bf179dff8496608282523b278b11c5d325a9956d084", "62a3f05e3618a4d9773927f5ff28fcd176861d6512f57aeaa1a8897ef0607e1f"],
  ["C09", "c9d2ad66cf5f1132b32805a613d0eb3a4070fbae8e1f624f9b85a9ad9d6c9e49", "a221bb999df10111838a1197ab08f8c7a240964d4d502fab56e31e0f3844a1e2", "7c3fd8b427ae19386c7f897363c3b7cf047c3ff38c036673499eced113b55d5a", "14ae8176b410c8543f4cca33b7599de2d1179d45892e83c0d4f4ab51d4c47813"],
  ["C10", "a0b3a2e1494bbf4a26e1e97712d27752b420af451c5f193a986498f86d96970a", "1d9d2d5a66c6050086f80dbedf861f9e18d17d51ba692396ebbf8e999e3e0437", "8020fc76bef1f3cbe7c2aa00d4e50921ac3c3d7e50485bbe652d47f3407a8269", "73c6f56fe7f67010eb945c00e12be4d6439e90217caa8843591b5e46037f76f6"],
  ["C11", "c8032e6dbdc1853e2613ac9fe24a0c91e095676d0fa5b083320b7680c71f5828", "ce3b2dbf97a225388a8b49815aae966f2c56cbc28a1aa3979a4f6e1a078190d9", "ade35736ee2a78d03ba826068c5ec4979858523c6de34c05685bed4c376647d8", "ba5a46637904ee74e12093a8b319b8db941d32207bb8325a57d0d83a2d9f9449"],
  ["C12", "0dbf5dedfb8979e46c8973c561ea96c4ee123cbde6271a21182ed4e65a30ccac", "f79980c5372e7474fde2b44ef7d1f325081d6a9541ef196619ab2f349cedc347", "7af58bfa366a7f1e6455cac395cc79af26af1055689ab03e8b588db00c36e51d", "cadd7d3ffb28f7a5a87edef10057ad166529107a2a35a0cfcf00a326f7e7c4a6"],
] as const);

test("critic calibration: the closed manifest pins twelve synthetic input/output pairs", () => {
  assert.equal(CRITIC_CALIBRATION_MANIFEST.version, CRITIC_CALIBRATION_MANIFEST_VERSION);
  assert.equal(CRITIC_CALIBRATION_MANIFEST_SHA256, "e5d321c74506bf70ded87baf9492c6bcae68de1781fbc35a1d0da7aad4bffda8");
  assert.equal(CRITIC_CALIBRATION_MANIFEST.fixtures.length, 12);
  assert.equal(CRITIC_CALIBRATION_EVALUATOR_POLICIES.length, 12);
  assert.equal(new Set(CRITIC_CALIBRATION_EVALUATOR_POLICIES).size, 12);
  assert.ok(CRITIC_CALIBRATION_MANIFEST.fixtures.length <= 16);
  assert.deepEqual(
    CRITIC_CALIBRATION_MANIFEST.fixtures.map((row) => [row.id, row.outputFixture, row.outputFixtureSha256]),
    OUTPUT_FIXTURES,
  );
  assert.deepEqual(
    CRITIC_CALIBRATION_MANIFEST.fixtures.map((row) => [
      row.id, row.fixtureSha256, row.packetSha256, row.requestSha256, row.requestBodySha256,
    ]),
    INPUT_HASHES,
  );
  for (const fixture of CRITIC_CALIBRATION_MANIFEST.fixtures) {
    assert.match(fixture.fixtureSha256, SHA256, fixture.id);
    assert.match(fixture.packetSha256, SHA256, fixture.id);
    assert.match(fixture.requestSha256, SHA256, fixture.id);
    assert.match(fixture.requestBodySha256, SHA256, fixture.id);
    assert.equal(fixture.timeoutMs, 600_000, fixture.id);
    assert.equal(fixture.maxOutputCharacters, 262_144, fixture.id);
  }
  assert.equal(new Set(CRITIC_CALIBRATION_MANIFEST.fixtures.map((row) => row.fixtureSha256)).size, 12);
  assert.equal(new Set(CRITIC_CALIBRATION_MANIFEST.fixtures.map((row) => row.requestSha256)).size, 12);
});

test("critic calibration: only an exact fixture id/hash pair releases its branded request", () => {
  const fixture = CRITIC_CALIBRATION_MANIFEST.fixtures[0];
  assert.ok(fixture);
  const exact = { fixtureId: fixture.id, fixtureSha256: fixture.fixtureSha256 };
  const selection = selectCriticCalibrationFixture(exact);
  assert.ok(selection);
  const call = criticCalibrationFixtureRequest(selection);
  assert.ok(call);
  assert.equal(call.fixture, fixture);
  assert.equal(call.requestSha256, fixture.requestSha256);

  const refused: readonly unknown[] = [
    null,
    undefined,
    {},
    { ...exact, extra: true },
    { fixtureId: "C99", fixtureSha256: fixture.fixtureSha256 },
    { fixtureId: fixture.id, fixtureSha256: "0".repeat(64) },
    new Proxy(exact, {}),
    Object.create(exact),
    Object.defineProperty({ fixtureId: fixture.id }, "fixtureSha256", { enumerable: true, get: () => fixture.fixtureSha256 }),
  ];
  for (const value of refused) assert.equal(selectCriticCalibrationFixture(value), null);
  for (const value of [exact, structuredClone(selection), { ...selection }, new Proxy(selection, {})]) {
    assert.equal(criticCalibrationFixtureRequest(value), null);
  }
});

test("critic calibration: every frozen expected outcome is explicitly projected onto and parsed against its exact request", () => {
  for (const fixture of CRITIC_CALIBRATION_MANIFEST.fixtures) {
    const selection = selectCriticCalibrationFixture({ fixtureId: fixture.id, fixtureSha256: fixture.fixtureSha256 });
    const call = selection === null ? null : criticCalibrationFixtureRequest(selection);
    assert.ok(call, fixture.id);
    const fixtureBytes = readFileSync(join(
      __dirname, "..", "..", "..", "core", "test", "fixtures", "critic", fixture.outputFixture,
    ));
    assert.equal(createHash("sha256").update(fixtureBytes).digest("hex"), fixture.outputFixtureSha256, fixture.id);
    const fixtureText = fixtureBytes.toString("utf8");
    const output = projectCriticCalibrationExpectedOutput(selection, fixtureText);
    assert.ok(output, fixture.id);
    const packet = call.request.packet;
    assert.ok(packet.selectedTrackedText.length > 0 && packet.selectedTrackedText.length <= 8, fixture.id);
    assert.ok(packet.selectedTrackedText.reduce((sum, row) => sum + row.content.length, 0) <= 32_000, fixture.id);
    for (const row of packet.selectedTrackedText) {
      assert.match(row.projectRelativePath, /^synthetic-calibration\/C\d{2}\/[a-z0-9][a-z0-9-]*\.txt$/u);
      assert.ok(row.content.length <= 8_000);
      assert.equal(createHash("sha256").update(row.content).digest("hex"), row.sha256);
      assert.doesNotMatch(row.content, /(?:file|https?):\/\//iu);
      assert.doesNotMatch(row.content, /placeholder/iu, "every selected row must carry its actual neutral fact");
      assert.doesNotMatch(row.projectRelativePath, /(?:^|\/)\.(?:git|cairn)(?:\/|$)/u);
      assert.equal("provenance" in row, false, "compiled synthetic authority makes no Git or filesystem claim");
    }
    assert.equal("projectHash" in packet, false, "the synthetic project identity is not model input");
    if (fixture.id === "C01") assert.equal(packet.taskSpec.preferences.length, 10);
    if (fixture.id === "C03") {
      assert.deepEqual(packet.taskSpec.criteria.map((row) => [row.id, row.judge]), [
        ["c1", "critic"], ["c2", "critic"], ["c3", "cairn"],
      ]);
      assert.equal(packet.checkEvidence[0]?.criterionId, "c3");
    }
    if (["C05", "C06", "C07"].includes(fixture.id)) {
      assert.equal(packet.taskSpec.preferences.find((row) => row.id === "p2")?.comparison?.id, "comparison-p2");
      assert.equal(packet.comparisonTrials[0]?.criterionId, "p2");
      assert.equal(packet.comparisonTrials[0]?.presentationOrder, fixture.id === "C07" ? "B-A" : "A-B");
    }
    const artifacts = new Set(packet.artifactRegistry.map((row) => row.id));
    if (fixture.id === "C10") {
      for (const id of ["boundary-evidence", "boundary-counterevidence"]) assert.ok(artifacts.has(id), id);
      assert.deepEqual((output as any).unscopedFindings.map((row: any) => [row.evidenceRefs, row.counterEvidenceRefs]), [
        [["boundary-evidence"], ["boundary-counterevidence"]],
      ], "C10 keeps its evidence and counterevidence as distinct exact receipts");
    }
    if (fixture.id === "C11") {
      for (const id of ["boundary-action", "boundary-auth", "boundary-data", "boundary-recovery", "boundary-secret"]) {
        assert.ok(artifacts.has(id), id);
      }
      assert.deepEqual((output as any).unscopedFindings.map((row: any) => row.evidenceRefs), [
        ["boundary-secret"], ["boundary-data"], ["boundary-auth"], ["boundary-action"], ["boundary-recovery"],
      ], "C11 keeps all five native categories bound to separate exact receipts");
    }
    assert.equal(parseCriticOutput(output, call.request) === null, fixture.id === "C12",
      fixture.id === "C12" ? "the forged global authority must stay malformed" : `${fixture.id} projected output must parse`);
    const wireText = JSON.stringify(call.request.packet);
    for (const evaluatorPolicy of CRITIC_CALIBRATION_EVALUATOR_POLICIES) {
      assert.equal(wireText.includes(evaluatorPolicy), false, `${fixture.id} must not send evaluator policy: ${evaluatorPolicy}`);
    }
  }
});

const C04_OUTPUT = JSON.stringify({
  version: "cairn-critic-output/v1",
  findings: [
    {
      id: "f1", criterionId: "c1", status: "cant-tell", severity: null, confidence: "low",
      failureConditionId: null, observed: "The declared synthetic evidence is unavailable.",
      evidenceRefs: [], counterEvidenceRefs: [], selfCheck: "unresolved", rootCauseKey: null, smallestRepair: null,
    },
    {
      id: "f2", criterionId: "c2", status: "met", severity: null, confidence: "high",
      failureConditionId: null, observed: "The synthetic regression receipt keeps the supported path intact.",
      evidenceRefs: ["evidence-regression"], counterEvidenceRefs: [], selfCheck: "supported",
      rootCauseKey: null, smallestRepair: null,
    },
  ],
  unscopedFindings: [],
  comparisons: [],
  largestGapId: "f1",
});

test("critic calibration: one approval drives Core's exact body through one injected fake and records before restart", async () => {
  const profile = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-profile-"));
  const project = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-project-"));
  const fixture = CRITIC_CALIBRATION_MANIFEST.fixtures.find((row) => row.id === "C04");
  assert.ok(fixture);
  const fixtureSelection = selectCriticCalibrationFixture({ fixtureId: fixture.id, fixtureSha256: fixture.fixtureSha256 });
  const fixtureCall = fixtureSelection === null ? null : criticCalibrationFixtureRequest(fixtureSelection);
  assert.ok(fixtureCall);
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    requests.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify({
      id: "synthetic-request-1",
      model: "cairn/synthetic-critic-v1",
      choices: [{ index: 0, message: { role: "assistant", content: C04_OUTPUT }, finish_reason: "stop" }],
      usage: { prompt_tokens: 120, completion_tokens: 40, cost: 0 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const orchestrator = createCriticCalibrationOrchestrator({
      profileRoot: profile,
      projectRoot: project,
      transport: fakeTransport(fetchImpl),
      now: () => new Date("2026-08-11T12:00:00.000Z"),
      runId: () => "33333333-3333-4333-8333-333333333333",
    });
    assert.equal(orchestrator.ready, true);
    const opened = orchestrator.open({ dir: project, fixtureId: fixture.id, fixtureSha256: fixture.fixtureSha256 });
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(opened.value.status, "awaiting-approval");
    assert.equal(opened.value.disclosure.callKind, "synthetic-calibration");
    assert.match(opened.value.disclosure.notSent.join(" "), /project files or project content/u);
    assert.match(opened.value.disclosure.credentialText, /No saved provider key/u);
    assert.equal(orchestrator.current(join(project, "."))?.disclosure.approvalId, opened.value.disclosure.approvalId);
    assert.deepEqual(opened.value.disclosure.selection, fixtureCall.request.packet.selectedTrackedText.map((row) => ({
      path: row.projectRelativePath, sha256: row.sha256, characters: row.content.length,
    })));
    assert.deepEqual(opened.value.disclosure.planMetadata, {
      checks: 2, preferences: 0, references: 0, evidenceItems: 1, priorFindings: 0, comparisonTrials: 0,
    });
    assert.equal(opened.value.disclosure.totalRequestCharacters, canonicalCriticPacket(fixtureCall.request.packet)!.length);

    const decided = await orchestrator.decide({
      dir: join(project, "."),
      approvalId: opened.value.disclosure.approvalId,
      action: "approve",
      disclosure: opened.value.disclosure,
    });
    assert.equal(decided.ok, true);
    if (!decided.ok) return;
    assert.equal(decided.value.decision.outcome, "approved");
    assert.equal(decided.value.record.status, "answered");
    assert.equal(decided.value.record.fixtureId, "C04");
    assert.equal(decided.value.record.usage.promptTokens, 120);
    assert.equal(decided.value.record.parsedOutput.version, "cairn-critic-output/v1");
    assert.match(decided.value.record.assessmentSha256, SHA256);
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.url, "https://critic-calibration.invalid/v1/chat/completions");
    const body = String(requests[0]?.init.body);
    assert.equal(createHash("sha256").update(body).digest("hex"), fixture.requestBodySha256);
    const wire = JSON.parse(body) as Record<string, unknown> & { messages: Array<{ role: string; content: string }> };
    assert.deepEqual(Object.keys(wire).sort(), ["max_tokens", "messages", "model", "stream", "temperature", "top_p"]);
    assert.deepEqual(wire.messages, [
      { role: "system", content: fixtureCall.request.systemPrompt },
      { role: "user", content: canonicalCriticPacket(fixtureCall.request.packet) },
    ]);
    assert.equal("tools" in wire || "tool_choice" in wire || "functions" in wire || "stream_options" in wire, false);
    assert.equal(activeCriticActivationCount(), 0);

    const stateText = readFileSync(join(profile, "critic-calibration", "state.json"), "utf8");
    assert.doesNotMatch(stateText, new RegExp(project.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
    assert.doesNotMatch(stateText, /cairn-injected-fake-no-credential/u);
    assert.match(stateText, /"status":"answered"/u);

    const restarted = createCriticCalibrationOrchestrator({
      profileRoot: profile,
      projectRoot: project,
      transport: fakeTransport(fetchImpl),
      now: () => new Date("2026-08-11T12:01:00.000Z"),
      runId: () => "44444444-4444-4444-8444-444444444444",
    });
    assert.equal(restarted.ready, true);
    const replay = restarted.open({ dir: project, fixtureId: fixture.id, fixtureSha256: fixture.fixtureSha256 });
    assert.deepEqual(replay, { ok: false, code: "CRITIC_CALIBRATION_FIXTURE_ALREADY_RECORDED" });
    assert.equal(requests.length, 1, "restart must not repeat the already-recorded call");
    assert.equal(activeCriticActivationCount(), 0);
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true });
  }
});

test("critic calibration: decline, mismatch, cross-project, stale, and replay start no unintended send", async () => {
  const profile = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-profile-"));
  const project = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-project-"));
  const otherProject = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-other-"));
  const fixtures = Object.fromEntries(CRITIC_CALIBRATION_MANIFEST.fixtures.map((row) => [row.id, row]));
  let calls = 0;
  const fetchImpl = async (): Promise<Response> => {
    calls += 1;
    return new Response(JSON.stringify({
      id: "synthetic-request-2",
      model: "cairn/synthetic-critic-v1",
      choices: [{ index: 0, message: { role: "assistant", content: C04_OUTPUT }, finish_reason: "stop" }],
      usage: { prompt_tokens: 2, completion_tokens: 1, cost: 0 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const orchestrator = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
    });
    const first = orchestrator.open({ dir: project, fixtureId: fixtures.C01?.id, fixtureSha256: fixtures.C01?.fixtureSha256 });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const declined = await orchestrator.decide({
      dir: project, approvalId: first.value.disclosure.approvalId,
      action: "stop-task", disclosure: first.value.disclosure,
    });
    assert.equal(declined.ok, true);
    assert.equal(declined.ok ? declined.value.record.status : null, "declined");
    assert.equal(calls, 0);
    assert.deepEqual(await orchestrator.decide({
      dir: project, approvalId: first.value.disclosure.approvalId,
      action: "approve", disclosure: first.value.disclosure,
    }), { ok: false, code: "CRITIC_CALIBRATION_CALL_NOT_PENDING" });

    const second = orchestrator.open({ dir: project, fixtureId: fixtures.C04?.id, fixtureSha256: fixtures.C04?.fixtureSha256 });
    assert.equal(second.ok, true, "a terminal decline must not strand the remaining manifest");
    if (!second.ok) return;
    const altered = { ...second.value.disclosure, billingBasis: `${second.value.disclosure.billingBasis} altered` };
    assert.deepEqual(await orchestrator.decide({
      dir: project, approvalId: second.value.disclosure.approvalId,
      action: "approve", disclosure: altered,
    }), { ok: false, code: "CRITIC_CALL_DECISION_ECHO_MISMATCH" });
    assert.equal(calls, 0);
    assert.equal(orchestrator.current(project)?.disclosure.approvalId, second.value.disclosure.approvalId);
    assert.deepEqual(await orchestrator.decide({
      dir: otherProject, approvalId: second.value.disclosure.approvalId,
      action: "approve", disclosure: second.value.disclosure,
    }), { ok: false, code: "CRITIC_CALIBRATION_CALL_NOT_PENDING" });
    assert.equal(calls, 0);

    const approved = await orchestrator.decide({
      dir: join(project, "."), approvalId: second.value.disclosure.approvalId,
      action: "approve", disclosure: second.value.disclosure,
    });
    assert.equal(approved.ok, true);
    assert.equal(calls, 1);
    assert.deepEqual(await orchestrator.decide({
      dir: project, approvalId: second.value.disclosure.approvalId,
      action: "approve", disclosure: second.value.disclosure,
    }), { ok: false, code: "CRITIC_CALIBRATION_CALL_NOT_PENDING" });
    assert.equal(calls, 1);
    assert.equal(activeCriticActivationCount(), 0);
  } finally {
    rmSync(otherProject, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true });
  }
});

test("critic calibration: a competing project approval cannot replace or decide the held fixture", async () => {
  const profile = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-profile-"));
  const project = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-project-"));
  const fixture = CRITIC_CALIBRATION_MANIFEST.fixtures.find((row) => row.id === "C06")!;
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    throw new Error("a replacement approval must never reach the calibration sender");
  };
  try {
    const orchestrator = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
    });
    const opened = orchestrator.open({ dir: project, fixtureId: fixture.id, fixtureSha256: fixture.fixtureSha256 });
    assert.equal(opened.ok, true);
    if (!opened.ok) return;

    const other = bundle();
    const replacement = openCriticCallApproval({
      dir: project,
      request: other.request,
      authorization: approved(other.request),
      mode: "required",
    });
    assert.equal(replacement, null);
    assert.equal(calls, 0);
    assert.deepEqual(orchestrator.records(), []);
    assert.equal(currentCriticCallApproval(project), opened.value.disclosure,
      "the genuine held fixture must remain current and unconsumed");
    assert.equal(orchestrator.hasActive(project), true, "the held fixture remains separately cancellable");
    assert.equal(orchestrator.cancel(project).ok, true);
    assert.equal(currentCriticCallApproval(project), null,
      "cancelling the held fixture retires only its exact card");
    assert.equal(calls, 0);
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true });
  }
});

test("critic calibration: cancellation before and during a send is terminal, honest, and replay-safe", async () => {
  const profile = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-profile-"));
  const project = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-project-"));
  const fixture = (id: string) => CRITIC_CALIBRATION_MANIFEST.fixtures.find((row) => row.id === id)!;
  let calls = 0;
  let markStarted: (() => void) | null = null;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  const fetchImpl = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls += 1;
    markStarted?.();
    return await new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) { reject(new Error("cancelled")); return; }
      signal?.addEventListener("abort", () => reject(new Error("cancelled")), { once: true });
    });
  };

  try {
    const orchestrator = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
    });
    const before = orchestrator.open({ dir: project, fixtureId: fixture("C02").id, fixtureSha256: fixture("C02").fixtureSha256 });
    assert.equal(before.ok, true);
    if (!before.ok) return;
    const cancelled = orchestrator.cancel(project);
    assert.equal(cancelled.ok, true);
    assert.equal(cancelled.ok ? cancelled.value.status : null, "cancelled");
    assert.equal(calls, 0);
    assert.equal(orchestrator.current(project), null);

    const inFlight = orchestrator.open({ dir: project, fixtureId: fixture("C03").id, fixtureSha256: fixture("C03").fixtureSha256 });
    assert.equal(inFlight.ok, true, "a completed cancellation must not strand later fixtures");
    if (!inFlight.ok) return;
    const deciding = orchestrator.decide({
      dir: project, approvalId: inFlight.value.disclosure.approvalId,
      action: "approve", disclosure: inFlight.value.disclosure,
    });
    await started;
    const cancelling = orchestrator.cancel(project);
    assert.equal(cancelling.ok, true);
    assert.equal(cancelling.ok ? cancelling.value.status : null, "cancelling");
    const terminal = await deciding;
    assert.equal(terminal.ok, true);
    assert.equal(terminal.ok ? terminal.value.record.status : null, "unavailable");
    assert.equal(terminal.ok && terminal.value.record.status === "unavailable" ? terminal.value.record.code : null,
      "CRITIC_CALL_CANCELLED");
    assert.equal(calls, 1);
    assert.equal(orchestrator.current(project), null);

    const restarted = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
    });
    assert.equal(restarted.ready, true);
    assert.deepEqual(restarted.open({
      dir: project, fixtureId: fixture("C03").id, fixtureSha256: fixture("C03").fixtureSha256,
    }), { ok: false, code: "CRITIC_CALIBRATION_FIXTURE_ALREADY_RECORDED" });
    assert.equal(calls, 1);
    assert.equal(activeCriticActivationCount(), 0);
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true });
  }
});

test("critic calibration: missing, null, bare, cloned, and proxied transports cannot open a card or fall back to global fetch", () => {
  const profile = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-profile-"));
  const project = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-project-"));
  const fixture = CRITIC_CALIBRATION_MANIFEST.fixtures[0]!;
  let calls = 0;
  const fetchImpl: typeof fetch = async () => { calls += 1; throw new Error("must not send"); };
  const branded = fakeTransport(fetchImpl);
  try {
    assert.equal(createCriticCalibrationFakeTransport(null), null);
    assert.equal(createCriticCalibrationFakeTransport(new Proxy(fetchImpl, {})), null);
    for (const transport of [undefined, null, fetchImpl, { ...branded }, new Proxy(branded, {})] as const) {
      const orchestrator = createCriticCalibrationOrchestrator({
        profileRoot: profile,
        projectRoot: project,
        ...(transport === undefined ? {} : { transport: transport as any }),
      });
      assert.equal(orchestrator.ready, true);
      assert.deepEqual(orchestrator.open({ dir: project, fixtureId: fixture.id, fixtureSha256: fixture.fixtureSha256 }),
        { ok: false, code: "CRITIC_CALIBRATION_FAKE_TRANSPORT_REQUIRED" });
      assert.equal(orchestrator.hasActive(), false);
      assert.deepEqual(orchestrator.records(), []);
    }
    assert.equal(calls, 0);
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true });
  }
});

test("critic calibration: profile and project must be real disjoint roots before the store writes anything", () => {
  const outer = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-overlap-"));
  const child = join(outer, "project");
  mkdirSync(child);
  try {
    const same = createCriticCalibrationOrchestrator({ profileRoot: outer, projectRoot: outer });
    assert.equal(same.ready, false);
    assert.equal(existsSync(join(outer, "critic-calibration")), false);

    const projectInsideProfile = createCriticCalibrationOrchestrator({ profileRoot: outer, projectRoot: child });
    assert.equal(projectInsideProfile.ready, false);
    assert.equal(existsSync(join(outer, "critic-calibration")), false);

    const profileInsideProject = createCriticCalibrationOrchestrator({ profileRoot: child, projectRoot: outer });
    assert.equal(profileInsideProject.ready, false);
    assert.equal(existsSync(join(child, "critic-calibration")), false);
  } finally {
    rmSync(outer, { recursive: true, force: true });
  }
});

test("critic calibration: an older authentic state cannot replay a fixture because its immutable spend survives", async () => {
  const profile = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-profile-"));
  const project = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-project-"));
  const fixture = CRITIC_CALIBRATION_MANIFEST.fixtures.find((row) => row.id === "C04")!;
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      id: "synthetic-rollback",
      model: "cairn/synthetic-critic-v1",
      choices: [{ index: 0, message: { role: "assistant", content: C04_OUTPUT }, finish_reason: "stop" }],
      usage: { prompt_tokens: 4, completion_tokens: 2, cost: 0 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const first = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
      now: () => new Date("2026-08-11T13:00:00.000Z"),
    });
    const statePath = join(profile, "critic-calibration", "state.json");
    const olderAuthenticState = readFileSync(statePath, "utf8");
    const opened = first.open({ dir: project, fixtureId: fixture.id, fixtureSha256: fixture.fixtureSha256 });
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    const completed = await first.decide({
      dir: project, approvalId: opened.value.disclosure.approvalId, action: "approve", disclosure: opened.value.disclosure,
    });
    assert.equal(completed.ok, true);
    assert.equal(calls, 1);
    assert.equal(existsSync(join(profile, "critic-calibration", "spends-v1", "C04.json")), true);

    writeFileSync(statePath, olderAuthenticState, "utf8");
    const restarted = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
      now: () => new Date("2026-08-11T13:01:00.000Z"),
    });
    assert.equal(restarted.ready, true);
    const recovered = restarted.records()[0];
    assert.equal(recovered?.status, "unavailable");
    assert.equal(recovered?.status === "unavailable" ? recovered.code : null,
      "CRITIC_CALIBRATION_INTERRUPTED");
    assert.equal(recovered?.status === "unavailable" ? recovered.sent : false, null,
      "rollback leaves send completion honestly unknown");
    assert.deepEqual(restarted.open({ dir: project, fixtureId: fixture.id, fixtureSha256: fixture.fixtureSha256 }),
      { ok: false, code: "CRITIC_CALIBRATION_FIXTURE_ALREADY_RECORDED" });
    assert.equal(calls, 1);
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true });
  }
});

test("critic calibration: a durable sending snapshot recovers as unknown, never retries, and does not strand later fixtures", async () => {
  const profile = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-profile-"));
  const project = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-project-"));
  const fixture = (id: string) => CRITIC_CALIBRATION_MANIFEST.fixtures.find((row) => row.id === id)!;
  let calls = 0;
  let startedResolve: (() => void) | null = null;
  const started = new Promise<void>((resolve) => { startedResolve = resolve; });
  const fetchImpl: typeof fetch = async (_url, init) => {
    calls += 1;
    startedResolve?.();
    return await new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("cancelled")), { once: true });
    });
  };
  try {
    const first = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
      now: () => new Date("2026-08-11T14:00:00.000Z"),
    });
    const opened = first.open({ dir: project, fixtureId: fixture("C02").id, fixtureSha256: fixture("C02").fixtureSha256 });
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    const deciding = first.decide({
      dir: project, approvalId: opened.value.disclosure.approvalId, action: "approve", disclosure: opened.value.disclosure,
    });
    await started;
    const statePath = join(profile, "critic-calibration", "state.json");
    const sendingState = readFileSync(statePath, "utf8");
    assert.match(sendingState, /"status":"sending"/u);
    first.cancelAll();
    await first.settled();
    await deciding;

    // This authentic snapshot is exactly what a process crash can leave.
    writeFileSync(statePath, sendingState, "utf8");
    const restarted = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
      now: () => new Date("2026-08-11T14:01:00.000Z"),
    });
    assert.equal(restarted.ready, true);
    const interrupted = restarted.records().find((row) => row.fixtureId === "C02");
    assert.equal(interrupted?.status, "unavailable");
    assert.equal(interrupted?.status === "unavailable" ? interrupted.code : null, "CRITIC_CALIBRATION_INTERRUPTED");
    assert.deepEqual(restarted.open({
      dir: project, fixtureId: fixture("C02").id, fixtureSha256: fixture("C02").fixtureSha256,
    }), { ok: false, code: "CRITIC_CALIBRATION_FIXTURE_ALREADY_RECORDED" });
    const next = restarted.open({
      dir: project, fixtureId: fixture("C03").id, fixtureSha256: fixture("C03").fixtureSha256,
    });
    assert.equal(next.ok, true, "recovered uncertainty must not block the remaining preregistered schedule");
    restarted.cancel(project);
    assert.equal(calls, 1, "restart and recovery never retry the interrupted call");
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true });
  }
});

test("critic calibration: invalid answered output keeps bounded raw output, custody, provider fields, and usage across restart", async () => {
  const profile = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-profile-"));
  const project = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-project-"));
  const fixture = CRITIC_CALIBRATION_MANIFEST.fixtures.find((row) => row.id === "C12")!;
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({
    id: "synthetic-invalid-output",
    model: "cairn/synthetic-critic-v1",
    choices: [{ index: 0, message: { role: "assistant", content: "{}" }, finish_reason: "length" }],
    usage: { prompt_tokens: 9, completion_tokens: 3, cost: 0 },
  }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const first = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
      now: () => new Date("2026-08-11T15:00:00.000Z"),
    });
    const opened = first.open({ dir: project, fixtureId: fixture.id, fixtureSha256: fixture.fixtureSha256 });
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    const decided = await first.decide({
      dir: project, approvalId: opened.value.disclosure.approvalId, action: "approve", disclosure: opened.value.disclosure,
    });
    assert.equal(decided.ok, true);
    if (!decided.ok || decided.value.record.status !== "unavailable") return;
    assert.equal(decided.value.record.code, "CRITIC_CALIBRATION_OUTPUT_INVALID");
    assert.equal(decided.value.record.providerStatus, null,
      "an answered result cannot invent the successful 2xx status the transport did not retain");
    assert.equal(decided.value.record.rawOutput, "{}");
    assert.equal(decided.value.record.custody?.requestSha256, fixture.requestSha256);
    assert.equal(decided.value.record.providerReportedModel, "cairn/synthetic-critic-v1");
    assert.equal(decided.value.record.finishReason, "length");
    assert.equal(decided.value.record.requestId, "synthetic-invalid-output");
    assert.deepEqual(decided.value.record.usage, { promptTokens: 9, completionTokens: 3, costUsd: 0 });

    const restarted = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
      now: () => new Date("2026-08-11T15:01:00.000Z"),
    });
    assert.equal(restarted.ready, true);
    assert.deepEqual(restarted.records(), first.records());
    const persisted = restarted.records()[0];
    assert.equal(persisted?.status === "unavailable" ? persisted.providerStatus : undefined, null);
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true });
  }
});

test("critic calibration: a failed state add consumes approval before any send and cannot remain pending", async () => {
  const profile = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-profile-"));
  const project = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-project-"));
  const fixture = CRITIC_CALIBRATION_MANIFEST.fixtures.find((row) => row.id === "C08")!;
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    throw new Error("the sender must remain unreachable");
  };
  try {
    const service = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
      now: () => new Date("2026-08-11T16:00:00.000Z"),
    });
    const opened = service.open({ dir: project, fixtureId: fixture.id, fixtureSha256: fixture.fixtureSha256 });
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    const statePath = join(profile, "critic-calibration", "state.json");
    rmSync(statePath, { force: true });
    mkdirSync(statePath);

    const decided = await service.decide({
      dir: project, approvalId: opened.value.disclosure.approvalId, action: "approve", disclosure: opened.value.disclosure,
    });
    assert.deepEqual(decided, { ok: false, code: "CRITIC_CALIBRATION_STORE_UNAVAILABLE", consumed: true });
    assert.equal(calls, 0, "the immutable spend must be durable before the sender becomes reachable");
    assert.equal(service.hasActive(project), false);
    assert.equal(service.hasInFlightSend(), false);
    assert.equal(existsSync(join(profile, "critic-calibration", "spends-v1", "C08.json")), true);
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true });
  }
});

test("critic calibration: a failed terminal replace is reported as consumed and cannot leave an active send", async () => {
  const profile = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-profile-"));
  const project = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-project-"));
  const fixture = CRITIC_CALIBRATION_MANIFEST.fixtures.find((row) => row.id === "C09")!;
  const statePath = join(profile, "critic-calibration", "state.json");
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    rmSync(statePath, { force: true });
    mkdirSync(statePath);
    return new Response(JSON.stringify({
      id: "synthetic-replace-failure",
      model: "cairn/synthetic-critic-v1",
      choices: [{ index: 0, message: { role: "assistant", content: "{}" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 1, completion_tokens: 1, cost: 0 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const service = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
      now: () => new Date("2026-08-11T16:30:00.000Z"),
    });
    const opened = service.open({ dir: project, fixtureId: fixture.id, fixtureSha256: fixture.fixtureSha256 });
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    const decided = await service.decide({
      dir: project, approvalId: opened.value.disclosure.approvalId, action: "approve", disclosure: opened.value.disclosure,
    });
    assert.deepEqual(decided, { ok: false, code: "CRITIC_CALIBRATION_STORE_UNAVAILABLE", consumed: true });
    assert.equal(calls, 1);
    assert.equal(service.hasActive(project), false);
    assert.equal(service.hasInFlightSend(), false);
    assert.equal(existsSync(join(profile, "critic-calibration", "spends-v1", "C09.json")), true);
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true });
  }
});

test("critic calibration: restart auto-sends nothing and torn or forged durable state fails closed", () => {
  const profile = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-profile-"));
  const project = mkdtempSync(join(tmpdir(), "cairn-critic-calibration-project-"));
  const fixture = CRITIC_CALIBRATION_MANIFEST.fixtures.find((row) => row.id === "C05")!;
  let calls = 0;
  const fetchImpl = async (): Promise<Response> => { calls += 1; throw new Error("must not run"); };
  try {
    const first = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
    });
    const opened = first.open({ dir: project, fixtureId: fixture.id, fixtureSha256: fixture.fixtureSha256 });
    assert.equal(opened.ok, true);
    assert.equal(calls, 0);

    const restarted = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
    });
    assert.equal(restarted.ready, true);
    assert.equal(restarted.current(project), null);
    assert.equal(calls, 0, "restart must not reconstruct or send an in-memory approval");
    first.cancel(project);

    const statePath = join(profile, "critic-calibration", "state.json");
    const original = readFileSync(statePath, "utf8");
    const forged = original.replace(/"revision":\d+/u, '"revision":99');
    assert.notEqual(forged, original);
    writeFileSync(statePath, forged, "utf8");
    const unsafe = createCriticCalibrationOrchestrator({
      profileRoot: profile, projectRoot: project, transport: fakeTransport(fetchImpl),
    });
    assert.equal(unsafe.ready, false);
    assert.deepEqual(unsafe.open({ dir: project, fixtureId: fixture.id, fixtureSha256: fixture.fixtureSha256 }),
      { ok: false, code: "CRITIC_CALIBRATION_STORE_UNAVAILABLE" });
    assert.equal(readFileSync(statePath, "utf8"), forged, "recoverable forged evidence must be preserved");
    assert.equal(calls, 0);
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true });
  }
});

test("critic calibration: Main, preload, shared IPC, and both real card surfaces expose only the guarded calibration seam", () => {
  const source = (...parts: string[]) => readFileSync(join(__dirname, "..", "..", "src", ...parts), "utf8");
  const main = source("main", "main.ts");
  const tasks = source("main", "tasks.ts");
  const preload = source("preload.ts");
  const ipc = source("shared", "ipc.ts");
  const chat = source("renderer", "screens", "Chat.tsx");
  const taskRun = source("renderer", "screens", "TaskRun.tsx");

  for (const method of ["criticCalibrationOpen", "criticCalibrationCurrent", "criticCalibrationCancel", "onCriticCalibrationChanged"]) {
    assert.ok(ipc.includes(method), `shared IPC must type ${method}`);
    assert.ok(preload.includes(method), `preload must expose ${method}`);
  }
  for (const channel of ["critic:calibration-open", "critic:calibration-current", "critic:calibration-cancel"]) {
    assert.equal(tasks.match(new RegExp(`ipcMain\\.handle\\(\"${channel}\"`, "gu"))?.length, 1,
      `${channel} must have one handler`);
    assert.equal(preload.match(new RegExp(channel, "gu"))?.length, 1, `${channel} must have one bridge`);
  }
  assert.match(main, /CAIRN_TEST_CRITIC_CALIBRATION/u);
  assert.match(main, /process\.env\.CAIRN_E2E !== "1"/u);
  assert.match(main, /process\.env\.CAIRN_MOCK !== "1"/u);
  assert.match(main, /CAIRN_TEST_USER_DATA/u);

  for (const [name, screen] of [["Chat", chat], ["TaskRun", taskRun]] as const) {
    assert.match(screen, /criticCalibrationCurrent\(dir\)/u, `${name} must restore the Main-owned card`);
    assert.match(screen, /onCriticCalibrationChanged/u, `${name} must refresh when Main changes it`);
    assert.match(screen, /calibrationCall/u, `${name} must keep calibration separate from task state`);
    assert.match(screen, /<CriticCallCard/u, `${name} must render the real shared card`);
  }
  const column = chat.indexOf("const column = (");
  const connectedBody = chat.indexOf("{status?.connected ? (", chat.indexOf("<ConnectCard", column));
  const calibrationCard = chat.indexOf("{calibrationCall ? (", column);
  assert.ok(column >= 0 && calibrationCard > column && calibrationCard < connectedBody,
    "Chat must show the fake-only card even when no live provider is connected");

  for (const raw of [/sessions\.get\(dir\)/u, /sessions\.set\(dir,/u, /sessions\.delete\(dir\)/u,
    /sessions\.get\(request\.dir\)/u]) {
    assert.doesNotMatch(tasks, raw, "session state must use canonicalProjectKey consistently");
  }
});
