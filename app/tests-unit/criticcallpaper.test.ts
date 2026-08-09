import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CRITIC_LIMITS, TASK_CALL_BUDGET_V1 } from "@cairn/core";
import {
  CRITIC_CALL_ACTIONS_BY_MODE,
  CRITIC_CALL_ATTEMPT_CAP,
  CRITIC_CALL_OUTPUT_CHARACTER_CAP,
  CRITIC_CALL_TIMEOUT_MS_CAP,
  CRITIC_CALL_CREDENTIAL_TEXT,
  CRITIC_CALL_NOT_SENT,
} from "../src/shared/critic-call.js";

const renderer = (...parts: string[]) =>
  readFileSync(join(__dirname, "..", "..", "src", "renderer", ...parts), "utf8");

const card = renderer("components", "CriticCall.tsx");
const chat = renderer("screens", "Chat.tsx");
const taskRun = renderer("screens", "TaskRun.tsx");
const css = renderer("app.css");
const shared = readFileSync(join(__dirname, "..", "..", "src", "shared", "critic-call-parse.ts"), "utf8");

/** The body of the last rule for a selector, so a test can assert what a rule
 * declares rather than that its name appears somewhere. */
function lastRule(selector: string): string {
  const marker = `${selector} {`;
  const index = css.lastIndexOf(marker);
  assert.notEqual(index, -1, `${selector} needs a rule`);
  const start = index + marker.length;
  const end = css.indexOf("}", start);
  assert.notEqual(end, -1, `${selector} rule must close`);
  return css.slice(start, end);
}

/** Code only: comments must not satisfy a "the card shows this" assertion. */
const cardCode = card.split("\n").filter((line) => !/^\s*(?:\/\/|\*|\/\*)/u.test(line)).join("\n");

test("c1: the card shows every fact the owner is promised, from main's card alone", () => {
  assert.match(cardCode, /Independent critic — paid call \{count\(call\.attempt\)\} of at most \{count\(call\.attemptCap\)\}/u);

  for (const field of [
    "call.provider", "call.baseUrl", "call.configuredModel", "call.resolvedModel",
    "call.resolvedModelRevision", "call.connectionConsentVersion", "call.routeRequestFingerprintSha256",
    "call.selectedFiles", "call.selectedCharacters", "call.fileCap", "call.perFileCharacterCap",
    "call.totalCharacterCap", "call.timeoutMs", "call.maxOutputCharacters", "call.billingBasis",
    "call.purpose", "call.notSent", "call.totalRequestCharacters",
  ]) {
    assert.ok(cardCode.includes(field), `the card must show ${field}`);
  }

  // The whole payload, not only the files.
  for (const key of ["checks", "preferences", "references", "evidenceItems", "priorFindings", "comparisonTrials"]) {
    assert.ok(cardCode.includes(`metadata.${key}`), `the card must show planMetadata.${key}`);
  }
  assert.match(cardCode, /Also sends this task&apos;s plan and check metadata/u);
  assert.match(cardCode, /Whole request:/u);

  // Each selected file is named with its own count and its FULL hash: a
  // 12-character prefix cannot be checked against sha256sum.
  assert.match(cardCode, /call\.selection\.map/u);
  assert.match(cardCode, /\{file\.path\}/u);
  assert.match(cardCode, /count\(file\.characters\)/u);
  assert.match(cardCode, /\{file\.sha256\}/u);
  assert.doesNotMatch(cardCode, /sha256\.slice/u, "the hash must not be truncated");
});

test("c1: numbers and durations cannot vary by locale or be rounded away", () => {
  // The neighbouring disclosure pins en-US for exactly this reason: a card
  // reading "32.000 characters" to one owner misstates what is sent.
  assert.match(cardCode, /toLocaleString\("en-US"\)/u);
  assert.equal(cardCode.match(/toLocaleString\(/gu)?.length, 1, "one formatter, and it is pinned");
  assert.doesNotMatch(cardCode, /toLocaleString\(\)/u);

  // A stated limit must never be rounded to one the call could not run under.
  assert.match(cardCode, /return `\$\{count\(ms\)\} ms`/u, "a sub-second limit is stated exactly");
  assert.doesNotMatch(cardCode, /Math\.round/u);
});

test("c3: the card offers only the presses its own card lists", () => {
  assert.match(cardCode, /call\.actions\.map\(\(action\) =>/u);
  assert.doesNotMatch(cardCode, /actions\s*=\s*\[/u);
  assert.doesNotMatch(cardCode, /mode === "required"|mode === "optional"/u);

  const labels = card.slice(card.indexOf("const ACTION_LABELS"), card.indexOf("const ACTION_STYLES"));
  for (const action of new Set([...CRITIC_CALL_ACTIONS_BY_MODE.required, ...CRITIC_CALL_ACTIONS_BY_MODE.optional])) {
    assert.ok(labels.includes(`"${action}"`), `${action} needs a label`);
  }
  assert.equal(labels.match(/:\s*"/gu)?.length, 3, "exactly three labels, one per closed action");
});

test("c3: the destructive press is visibly destructive, and every button is styled", () => {
  // `.primary`/`.secondary` do not exist in this app; its buttons are pills.
  // Without this the control that ends a run renders identically to the one
  // that approves a paid call, and both render unstyled.
  assert.doesNotMatch(card, /className=\{action === "approve" \? "primary" : "secondary"\}/u);
  assert.match(card, /"stop-task": "pill pill-danger"/u, "stopping a task is the destructive press");
  assert.match(card, /"approve": "pill pill-primary"/u);
  assert.match(card, /"continue-without-critic": "pill pill-quiet"/u);

  // Those classes must actually carry rules.
  for (const selector of [".pill", ".pill-primary", ".pill-danger", ".pill-quiet"]) {
    assert.ok(css.includes(`${selector}`), `${selector} must exist in the stylesheet`);
  }
  assert.match(lastRule(".critic-call-actions"), /display:\s*flex/u);
  assert.match(lastRule(".critic-call"), /border-left:/u);
  assert.match(lastRule(".critic-call-files li"), /display:\s*grid/u);
});

test("c5: both run surfaces echo the exact card and press only what it offered", () => {
  for (const [name, source] of [["Chat", chat], ["TaskRun", taskRun]] as const) {
    assert.match(source, /cairn\.criticCallDecide\(\{/u, `${name} must decide through the one channel`);
    assert.match(source, /approvalId: call\.approvalId/u, `${name} must name the card's id`);
    assert.match(source, /disclosure: call,/u, `${name} must echo the card it showed`);
    assert.match(source, /\.actions\.includes\(action\)/u, `${name} must press only an offered action`);
    assert.doesNotMatch(source, /cairn-critic-call-disclosure/u, `${name} must not build a card`);

    // Rendered, not merely imported: the import alone once satisfied this.
    assert.match(source, /<CriticCallCard/u, `${name} must render the card`);
    assert.match(source, /busy=\{criticCallBusy\}/u, `${name} must disable while deciding`);

    // The busy flag must clear unconditionally. Guarding it behind the
    // generation or token that a session refresh bumps latches both controls
    // off forever — including "Stop this task" on a required critic.
    assert.match(source, /finally \{\n(?:\s*\/\/[^\n]*\n)*\s*setCriticCallBusy\(false\);/u,
      `${name} must always clear the busy flag`);
  }
});

test("c5: a refusal leaves the card on screen, because main leaves the approval standing", () => {
  // Main spends an approval only on a decision that succeeds. A renderer that
  // cleared its card on refusal would strand a live approval the owner can no
  // longer reach — in required mode, with no way to stop the task.
  // Scoped to the decider's own body: the identical early-return line exists
  // in applyTaskReviewChoice, and a file-wide match would be satisfied by it.
  const decider = taskRun.slice(
    taskRun.indexOf("async function decideCriticCall("),
    taskRun.indexOf("function tryAnother("),
  );
  assert.ok(decider.length > 0, "the decider must be findable");
  assert.match(decider, /if \(!response\.ok\) \{ setError\(response\.message\); return; \}/u);
  assert.doesNotMatch(decider, /if \(!response\.ok\) \{[^}]*setCriticCall\(null\)/u,
    "a refusal must not clear the card");
  assert.equal(decider.match(/setCriticCall\(null\)/gu)?.length, 1,
    "exactly one clear, on the success path");
  assert.match(chat, /criticCall: response\.ok \? null : current\.criticCall/u);
});

test("c5: the parser's bounds are the same numbers main composes from", () => {
  // Composition derives these from Core; validation copies them. If they ever
  // drift, every genuine card becomes undecidable — so pin the pairs.
  assert.equal(CRITIC_CALL_ATTEMPT_CAP, TASK_CALL_BUDGET_V1.maxCriticAttempts,
    "the attempt cap must match the frozen budget");
  assert.equal(CRITIC_CALL_TIMEOUT_MS_CAP, TASK_CALL_BUDGET_V1.maxCriticElapsedMs,
    "the timeout bound must match the frozen budget");
  assert.equal(CRITIC_CALL_OUTPUT_CHARACTER_CAP, CRITIC_LIMITS.rawOutputCharacters,
    "the output bound must match Core's own limit");
  // And the parser must actually use them rather than a second copy.
  for (const name of ["CRITIC_CALL_ATTEMPT_CAP", "CRITIC_CALL_TIMEOUT_MS_CAP", "CRITIC_CALL_OUTPUT_CHARACTER_CAP"]) {
    assert.ok(shared.includes(`wholeCount(record.${name === "CRITIC_CALL_ATTEMPT_CAP" ? "attemptCap"
      : name === "CRITIC_CALL_TIMEOUT_MS_CAP" ? "timeoutMs" : "maxOutputCharacters"}, ${name})`), `${name} must bound its own field`);
  }
});

test("c1: the card component carries no wording of its own about what is sent", () => {
  assert.match(cardCode, /call\.notSent\.join/u);
  for (const item of CRITIC_CALL_NOT_SENT) {
    assert.equal(card.includes(item), false, `"${item}" must come from main, not from the component`);
  }
  assert.equal(card.includes("cannot read or edit the project"), false, "the purpose sentence is main's");

  // The credential sentence is a shared constant, not renderer prose, and it
  // does not claim the key is withheld — it is sent, as the header that signs
  // the request.
  assert.match(cardCode, /\{CRITIC_CALL_CREDENTIAL_TEXT\}/u);
  assert.equal(card.includes(CRITIC_CALL_CREDENTIAL_TEXT), false);
  assert.equal([...CRITIC_CALL_NOT_SENT].some((item) => /key/u.test(item)), false,
    "the provider key must not be listed as something that is not sent");
  assert.match(CRITIC_CALL_CREDENTIAL_TEXT, /signs this one request/u);
});
