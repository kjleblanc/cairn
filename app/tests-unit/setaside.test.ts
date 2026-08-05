import assert from "node:assert/strict";
import test from "node:test";
import { bindTaskIntent, type TaskIntentSourceInput } from "@cairn/core";
import {
  buildSetAsideReplacement,
  preservesSetAsideReplacement,
  SET_ASIDE_CONTEXT_PREFIX,
} from "../src/main/conductor/setaside.js";

const OWNER_INPUT_ID = "11111111-1111-4111-8111-111111111111";
const FIRST_RISK_ID = "22222222-2222-4222-8222-222222222222";
const SECOND_RISK_ID = "33333333-3333-4333-8333-333333333333";
const OWNER_TEXT = "Change the page title";

const sources: readonly TaskIntentSourceInput[] = Object.freeze([
  Object.freeze({ kind: "conversation", inputId: OWNER_INPUT_ID, text: OWNER_TEXT }),
]);

function intent(context: readonly string[] = []) {
  const value = bindTaskIntent({
    version: "cairn-task-intent/v1",
    outcome: { source: "owner-stated", text: "Change the page title", ownerQuote: OWNER_TEXT },
    requirements: [{ source: "cairn-chosen", text: "Keep the counts exact", ownerQuote: null }],
    context,
  }, sources);
  assert.ok(value);
  return value;
}

test("set-aside fallback keeps the authenticated request, carries context, and removes only the selected risk", () => {
  const original = intent(["Desktop only"]);
  const result = buildSetAsideReplacement({
    intent: original,
    risks: [
      { riskId: FIRST_RISK_ID, text: "Renaming may break bookmarks." },
      { riskId: SECOND_RISK_ID, text: "The old title may need a redirect." },
    ],
  }, FIRST_RISK_ID, sources);

  assert.ok(result);
  assert.notEqual(result.intent, original, "the replacement owns a newly validated intent value");
  assert.deepEqual(result.context, [
    "Desktop only",
    `${SET_ASIDE_CONTEXT_PREFIX}Renaming may break bookmarks.`,
  ]);
  assert.deepEqual(result.intent.context, result.context);
  assert.deepEqual(result.request, {
    outcome: { source: "owner-stated", text: "Change the page title", ownerText: OWNER_TEXT },
    requirements: [{ source: "cairn-chosen", text: "Keep the counts exact", ownerText: null }],
  });
  assert.deepEqual(result.remainingRisks, [
    { text: "The old title may need a redirect." },
  ]);
  assert.equal(Object.isFrozen(result.intent), true);
  assert.equal(Object.isFrozen(result.context), true);
  assert.equal(Object.isFrozen(result.remainingRisks), true);

  const validCandidate = {
    request: result.request,
    context: [...result.context, "Cairn's additional visible context"],
    risks: result.remainingRisks,
  };
  assert.equal(preservesSetAsideReplacement(validCandidate, result), true,
    "a semantically preserving conductor task may add context after main's required prefix");
  assert.equal(preservesSetAsideReplacement({ ...validCandidate, context: ["Desktop only"] }, result), false);
  assert.equal(preservesSetAsideReplacement({ ...validCandidate, risks: [] }, result), false,
    "the conductor may not silently clear a different unresolved risk");
  assert.equal(preservesSetAsideReplacement({
    ...validCandidate,
    request: { ...result.request, outcome: { ...result.request.outcome, text: "A different task" } },
  }, result), false);
});

test("set-aside fallback refuses an unknown risk or context that cannot carry the concern", () => {
  const current = {
    intent: intent(["one", "two", "three"]),
    risks: [{ riskId: FIRST_RISK_ID, text: "Renaming may break bookmarks." }],
  };

  assert.equal(buildSetAsideReplacement(current, SECOND_RISK_ID, sources), null);
  assert.equal(buildSetAsideReplacement(current, FIRST_RISK_ID, sources), null,
    "a full three-note context must fail closed before the old action is retired");

  const alreadyCarried = buildSetAsideReplacement({
    intent: intent(["one", "two", `${SET_ASIDE_CONTEXT_PREFIX}Renaming may break bookmarks.`]),
    risks: current.risks,
  }, FIRST_RISK_ID, sources);
  assert.ok(alreadyCarried);
  assert.deepEqual(alreadyCarried.context, [
    "one",
    "two",
    `${SET_ASIDE_CONTEXT_PREFIX}Renaming may break bookmarks.`,
  ], "an already-carried concern is not duplicated or refused at the three-note cap");
});
