import test from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  recordTurnMarker,
  setTurnMarkerDir,
  turnDigest,
  turnMarkerSequence,
  turnMarkers,
  validateOwnerReplyContext,
} from "../src/main/conductor/turnauth.js";

const INPUT_ID = "11111111-1111-4111-8111-111111111111";
const TS = "2026-08-04T12:00:00.000Z";

test("an owner marker binds project, conversation, id, timestamp, raw text, and inert context", () => {
  const markerRoot = mkdtempSync(join(tmpdir(), "cairn-turn-markers-"));
  const project = mkdtempSync(join(tmpdir(), "cairn-turn-project-"));
  const context = validateOwnerReplyContext({
    kind: "question",
    response: "answer",
    question: "Which settling speed should Cairn use?",
  });
  assert.ok(context);
  setTurnMarkerDir(markerRoot);
  const raw = "  café 🪨\r\n300  ";
  recordTurnMarker(project, "001", INPUT_ID, TS, raw, context);

  const markers = turnMarkers(project);
  assert.ok(markers.has(turnDigest(project, "001", INPUT_ID, TS, raw, context)));
  assert.ok(!markers.has(turnDigest(`${project}-other`, "001", INPUT_ID, TS, raw, context)));
  assert.ok(!markers.has(turnDigest(project, "002", INPUT_ID, TS, raw, context)));
  assert.ok(!markers.has(turnDigest(project, "001", "22222222-2222-4222-8222-222222222222", TS, raw, context)));
  assert.ok(!markers.has(turnDigest(project, "001", INPUT_ID, "2026-08-04T12:00:01.000Z", raw, context)));
  assert.ok(!markers.has(turnDigest(project, "001", INPUT_ID, TS, "  café 🪨\n300  ", context)));
  assert.ok(!markers.has(turnDigest(project, "001", INPUT_ID, TS, raw, null)));
});

test("the marker store fails closed", () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-turn-project-"));
  setTurnMarkerDir(null);
  assert.throws(
    () => recordTurnMarker(project, "001", INPUT_ID, TS, "hello", null),
    /TURN_MARKER_STORE_UNAVAILABLE/,
  );
  assert.deepEqual([...turnMarkers(project)], []);
});

test("marker custody refuses a profile contained by the selected project", () => {
  const project = mkdtempSync(join(tmpdir(), "cairn-turn-custody-"));
  const profile = join(project, "app-profile");
  mkdirSync(profile);
  setTurnMarkerDir(profile);
  assert.throws(
    () => recordTurnMarker(project, "001", INPUT_ID, TS, "hello", null),
    /TURN_MARKER_CUSTODY_UNSAFE/,
  );
  assert.deepEqual(turnMarkerSequence(project), []);
});

test("a crash-partial ledger tail is separated and the new marker is re-readable", () => {
  const markerRoot = mkdtempSync(join(tmpdir(), "cairn-turn-markers-"));
  const project = mkdtempSync(join(tmpdir(), "cairn-turn-project-"));
  setTurnMarkerDir(markerRoot);
  recordTurnMarker(project, "001", INPUT_ID, TS, "first", null);
  const ledgers = join(markerRoot, "owner-turn-markers");
  const ledger = join(ledgers, readdirSync(ledgers)[0]);
  appendFileSync(ledger, "crash-partial-tail", "utf8");

  const secondId = "22222222-2222-4222-8222-222222222222";
  recordTurnMarker(project, "001", secondId, "2026-08-04T12:01:00.000Z", "second", null);

  const secondDigest = turnDigest(project, "001", secondId, "2026-08-04T12:01:00.000Z", "second", null);
  assert.equal(turnMarkerSequence(project).at(-1), secondDigest);
  assert.match(readFileSync(ledger, "utf8"), /crash-partial-tail\n[0-9a-f]{64}\n$/);
});

test("reply context is exact, bounded, and contains no live ids", () => {
  const request = {
    outcome: { source: "owner-stated", text: "Use the chosen speed", ownerText: "300" },
    requirements: [{ source: "cairn-chosen", text: "Keep the control readable", ownerText: null }],
  };
  assert.ok(validateOwnerReplyContext({ kind: "task", response: "correction", request, context: ["Desktop only"] }));
  assert.ok(validateOwnerReplyContext({ kind: "risk", response: "set-aside", risk: "This keeps data on this computer." }));
  assert.equal(validateOwnerReplyContext({ kind: "question", response: "answer", question: "x", actionId: "model-id" }), null);
  assert.equal(validateOwnerReplyContext({ kind: "risk", response: "set-aside", risk: "x", riskId: "model-id" }), null);
  assert.equal(validateOwnerReplyContext({ kind: "question", response: "answer", question: "x".repeat(301) }), null);
});
