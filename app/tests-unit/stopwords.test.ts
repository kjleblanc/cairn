import test from "node:test";
import assert from "node:assert/strict";
import { codeInPlainWords, KNOWN_CODE_WORDS } from "../src/shared/stopwords.js";

test("every known code has a plain clause that is not the code", () => {
  for (const [code, said] of Object.entries(KNOWN_CODE_WORDS)) {
    assert.ok(said.length > 0, `no plain words for ${code}`);
    assert.ok(!said.includes("_"), `${code} was echoed back as a code, not explained`);
    assert.ok(!/[A-Z]{3,}/.test(said), `${code} still reads like a constant: ${said}`);
  }
});

test("the ten serial stop reasons are all covered", () => {
  for (const reason of [
    "ADAPTER_FAILED", "INVALID_ADAPTER_RESULT", "PROTECTED_WORK_CHANGED",
    "RECORD_VERIFICATION_FAILED", "WORKER_CLAIMS_MISSING",
    "REAL_MODEL_CALL_NOT_AUTHORIZED", "MODEL_REPORTED_STOPPED",
    "MODEL_RESULT_NOT_VERIFIED", "ADAPTER_TIMED_OUT", "CANCELLED_BY_OWNER",
  ]) {
    assert.ok(reason in KNOWN_CODE_WORDS, `no plain words for ${reason}`);
  }
});

test("the app's own closes are covered too", () => {
  for (const code of [
    "CONNECTION_REQUIRED", "CONDUCTOR_CONNECT_NOT_AUTHORIZED",
    "CONDUCTOR_OAUTH_NOT_AUTHORIZED", "CONDUCTOR_CONSENT_REQUIRED",
  ]) {
    assert.ok(code in KNOWN_CODE_WORDS, `no plain words for ${code}`);
  }
});

/**
 * `errorCode` is not a closed set: `relay.ts` assigns any SCREAMING_CASE head
 * matching its fixed-code shape. An unrecognized code must still reach the
 * owner as a sentence, never as a bare constant.
 */
test("an unknown code is explained, never shown bare", () => {
  const said = codeInPlainWords("SOME_NEW_CODE");
  assert.ok(said !== null);
  assert.ok(!said.includes("SOME_NEW_CODE"), "an unknown code must not be echoed raw");
  assert.ok(said.length > 0);
});

test("no code means no sentence", () => {
  assert.equal(codeInPlainWords(null), null);
});

test("cancelled by owner reads as ordinary English", () => {
  assert.equal(codeInPlainWords("CANCELLED_BY_OWNER"), "you stopped it yourself");
});

/**
 * The failure this file exists to close, kept as a test so it cannot come
 * back: `app/shots/task-168-stopped-desktop.png` shows a shipped result card
 * reading "STOPPED — CANCELLED_BY_OWNER" in front of a beginner.
 */
test("a prototype key is not mistaken for a known code", () => {
  const said = codeInPlainWords("constructor");
  assert.ok(said !== null);
  assert.ok(!said.includes("constructor"), "prototype lookup must not leak");
});
