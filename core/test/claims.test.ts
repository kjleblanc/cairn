import test from "node:test";
import assert from "node:assert/strict";
import {
  parseTaskSpecWorkerClaims,
  parseWorkerClaims,
  TASK_SPEC_WORKER_CLAIMS_VERSION,
} from "../src/claims.js";

const VALID = {
  disposition: "DONE", summary: "Added the visible result.",
  changes: ["visible.txt — created with the requested text"],
  checks: [{ name: "read the file back", result: "matches byte-for-byte" }],
  howToTry: "Open visible.txt.", limitations: "None.", milestone: "NO",
};
const fence = (body: string) => "I finished.\n\n```cairn-claims\n" + body + "\n```\n";

test("a well-formed fence parses to typed claims", () => {
  const claims = parseWorkerClaims(fence(JSON.stringify(VALID)));
  assert.deepEqual(claims, VALID);
});

test("fail-closed on every malformed shape", () => {
  assert.equal(parseWorkerClaims(null), null);
  assert.equal(parseWorkerClaims(""), null);
  assert.equal(parseWorkerClaims("no fence at all"), null);
  assert.equal(parseWorkerClaims(fence(JSON.stringify(VALID)) + fence(JSON.stringify(VALID))), null, "two fences");
  assert.equal(parseWorkerClaims(fence("not json")), null);
  assert.equal(parseWorkerClaims(fence(JSON.stringify({ ...VALID, extra: 1 }))), null, "unknown key");
  const { milestone: _dropped, ...missing } = VALID;
  assert.equal(parseWorkerClaims(fence(JSON.stringify(missing))), null, "missing key");
  assert.equal(parseWorkerClaims(fence(JSON.stringify({ ...VALID, disposition: "MAYBE" }))), null);
  assert.equal(parseWorkerClaims(fence(JSON.stringify({ ...VALID, milestone: "PROBABLY" }))), null);
  assert.equal(parseWorkerClaims(fence(JSON.stringify({ ...VALID, changes: "one string" }))), null);
  assert.equal(parseWorkerClaims(fence(JSON.stringify({ ...VALID, checks: [{ name: "x" }] }))), null, "check missing result");
  assert.equal(parseWorkerClaims(fence(JSON.stringify({ ...VALID, summary: "x".repeat(301) }))), null, "summary cap");
  assert.equal(parseWorkerClaims(fence(JSON.stringify({ ...VALID, changes: Array(51).fill("x") }))), null, "changes count cap");
  assert.equal(parseWorkerClaims("x".repeat(262_145)), null, "total size cap");
});

test("empty strings and empty lists are honest and allowed", () => {
  const sparse = { ...VALID, summary: "", changes: [], checks: [], howToTry: "", limitations: "" };
  assert.deepEqual(parseWorkerClaims(fence(JSON.stringify(sparse))), sparse);
});

test("adversarial: repeated unclosed openers stay linear, not quadratic", () => {
  // The old fence regex (/^```cairn-claims[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm)
  // is O(n^2): every line-anchored opener with no closer ahead makes the lazy
  // [\s\S]*? re-scan all the way to end-of-string before giving up, and there
  // is one such opener per line. Empirically, 262,144 chars of repeated
  // "```cairn-claims\n" took ~880ms single-threaded against that regex. A
  // linear line-walk should finish in roughly 1-5ms; 250ms is a tight-but-safe
  // bound: the old quadratic code measured ~1000ms on this exact input, which
  // a 2000ms bound failed to catch as a regression.
  const input = "```cairn-claims\n".repeat(262_144 / 16).slice(0, 262_144);
  assert.equal(input.length, 262_144);
  const start = Date.now();
  const result = parseWorkerClaims(input);
  const elapsed = Date.now() - start;
  assert.equal(result, null, "an unclosed trailing fence is not a fence");
  assert.ok(elapsed < 250, `expected a linear scan under 250ms, took ${elapsed}ms`);
});

test("fail-closed on exotic line separators that could hide a second fence", () => {
  // JS multiline `^`/`$` anchors (the `m` flag the OLD fence regex used)
  // treat not just \n, but also a bare \r (CR not followed by LF), U+2028
  // (LINE SEPARATOR), and U+2029 (PARAGRAPH SEPARATOR) as line boundaries.
  // The line walk here only recognizes \r?\n, so on adversarial input
  // containing these characters the two parsers can disagree about how
  // many fences a message contains. Rather than reproduce the old
  // regex's exact boundary-shifting behavior for every possible
  // placement, the fix rejects any message containing one of these
  // characters outright. (Escape sequences \u2028/\u2029 are used below,
  // not literal characters, so this source file itself stays plain ASCII.)

  // The reviewer's literal reproducer for each separator: two complete,
  // independently-recognizable fences glued together by one exotic
  // separator. Both the old regex and the un-fixed walk already agree
  // this is two fences (not one) and return null; kept here as a named
  // regression guard for each of the three characters the fix covers.
  const twoFencesGluedByBareCr = fence(JSON.stringify(VALID)) + "\r" + fence(JSON.stringify(VALID));
  assert.equal(parseWorkerClaims(twoFencesGluedByBareCr), null, "two fences glued by a bare CR");
  const twoFencesGluedByLs = fence(JSON.stringify(VALID)) + "\u2028" + fence(JSON.stringify(VALID));
  assert.equal(parseWorkerClaims(twoFencesGluedByLs), null, "two fences glued by U+2028");
  const twoFencesGluedByPs = fence(JSON.stringify(VALID)) + "\u2029" + fence(JSON.stringify(VALID));
  assert.equal(parseWorkerClaims(twoFencesGluedByPs), null, "two fences glued by U+2029");

  // The genuinely discriminating case: one single, otherwise-perfectly-
  // valid fence, with a bare CR sitting in unrelated prose outside it.
  // The line walk sees one clean fence and happily parses it (fail-open
  // — this is the actual pre-fix behavior, confirmed empirically). No
  // real worker transport emits a bare CR, so the fix rejects the whole
  // message rather than trying to reason about what else it might hide.
  assert.equal(parseWorkerClaims("before\rafter" + fence(JSON.stringify(VALID))), null, "lone bare CR rejects the whole message");

  // CRLF acceptance is untouched: a normal fence using \r\n line endings
  // still parses (covered already by the existing byte-identical tests,
  // reaffirmed here alongside the new rejections).
  const crlfFence = fence(JSON.stringify(VALID)).replace(/\n/g, "\r\n");
  assert.deepEqual(parseWorkerClaims(crlfFence), VALID, "CRLF still parses");
});

test("total size cap boundary: exactly TOTAL_CAP parses, one char over is null", () => {
  const base = fence(JSON.stringify(VALID));
  const padLength = 262_144 - base.length;
  assert.ok(padLength >= 0, "fenced VALID payload already exceeds the cap; fix the test fixture");
  const atCap = base + "x".repeat(padLength);
  assert.equal(atCap.length, 262_144);
  assert.deepEqual(parseWorkerClaims(atCap), VALID, "exactly at the cap still parses");
  const overCap = atCap + "x";
  assert.equal(overCap.length, 262_145);
  assert.equal(parseWorkerClaims(overCap), null, "one char over the cap is null");
});

test("remaining field caps: check name/result, checks count, howToTry, limitations", () => {
  assert.equal(
    parseWorkerClaims(fence(JSON.stringify({ ...VALID, checks: [{ name: "n".repeat(201), result: "r" }] }))),
    null,
    "check name cap (200)",
  );
  assert.equal(
    parseWorkerClaims(fence(JSON.stringify({ ...VALID, checks: [{ name: "n", result: "r".repeat(501) }] }))),
    null,
    "check result cap (500)",
  );
  assert.equal(
    parseWorkerClaims(fence(JSON.stringify({ ...VALID, checks: Array(31).fill({ name: "n", result: "r" }) }))),
    null,
    "checks count cap (30)",
  );
  assert.equal(
    parseWorkerClaims(fence(JSON.stringify({ ...VALID, howToTry: "x".repeat(2001) }))),
    null,
    "howToTry cap (2000)",
  );
  assert.equal(
    parseWorkerClaims(fence(JSON.stringify({ ...VALID, limitations: "x".repeat(2001) }))),
    null,
    "limitations cap (2000)",
  );
});

const TASK_SPEC_SHA256 = "a".repeat(64);
const EXPECTED_TASK_SPEC_CLAIMS = {
  taskSpecSha256: TASK_SPEC_SHA256,
  criterionIds: ["c1", "c2"] as const,
  preferenceIds: ["p1"] as const,
};
const VALID_TASK_SPEC_CLAIMS = {
  version: TASK_SPEC_WORKER_CLAIMS_VERSION,
  taskSpecSha256: TASK_SPEC_SHA256,
  disposition: "DONE",
  summary: "Implemented the requested result.",
  changes: ["Changed the visible result."],
  criteria: [{ id: "c1", result: "worker says met" }, { id: "c2", result: "worker says met" }],
  preferences: [{ id: "p1", result: "worker says improved" }],
  howToTry: "Open the result.",
  limitations: "Worker assertions are not verification.",
  milestone: "NO",
};

test("Task-Spec claims parse only against the exact hash and ordered complete cN/pN ids", () => {
  const parsed = parseTaskSpecWorkerClaims(
    fence(JSON.stringify(VALID_TASK_SPEC_CLAIMS)),
    EXPECTED_TASK_SPEC_CLAIMS,
  );
  assert.deepEqual(parsed, VALID_TASK_SPEC_CLAIMS);
  assert.ok(parsed && Object.isFrozen(parsed) && Object.isFrozen(parsed.criteria)
    && Object.isFrozen(parsed.preferences) && parsed.criteria.every(Object.isFrozen));
  assert.equal(parseWorkerClaims(fence(JSON.stringify(VALID_TASK_SPEC_CLAIMS))), null, "legacy parser stays exact");

  assert.equal(parseTaskSpecWorkerClaims(fence(JSON.stringify({
    ...VALID_TASK_SPEC_CLAIMS, taskSpecSha256: "b".repeat(64),
  })), EXPECTED_TASK_SPEC_CLAIMS), null, "wrong hash");
  const { taskSpecSha256: _missingHash, ...missingHash } = VALID_TASK_SPEC_CLAIMS;
  assert.equal(parseTaskSpecWorkerClaims(fence(JSON.stringify(missingHash)), EXPECTED_TASK_SPEC_CLAIMS), null, "missing hash");
  assert.equal(parseTaskSpecWorkerClaims(fence(JSON.stringify({
    ...VALID_TASK_SPEC_CLAIMS, criteria: [VALID_TASK_SPEC_CLAIMS.criteria[1], VALID_TASK_SPEC_CLAIMS.criteria[0]],
  })), EXPECTED_TASK_SPEC_CLAIMS), null, "reordered ids");
  assert.equal(parseTaskSpecWorkerClaims(fence(JSON.stringify({
    ...VALID_TASK_SPEC_CLAIMS, criteria: [VALID_TASK_SPEC_CLAIMS.criteria[0]],
  })), EXPECTED_TASK_SPEC_CLAIMS), null, "missing id");
  assert.equal(parseTaskSpecWorkerClaims(fence(JSON.stringify({
    ...VALID_TASK_SPEC_CLAIMS,
    criteria: [VALID_TASK_SPEC_CLAIMS.criteria[0], { id: "c1", result: "duplicate" }],
  })), EXPECTED_TASK_SPEC_CLAIMS), null, "duplicate id");
  assert.equal(parseTaskSpecWorkerClaims(fence(JSON.stringify({
    ...VALID_TASK_SPEC_CLAIMS,
    preferences: [{ id: "p2", result: "unknown" }],
  })), EXPECTED_TASK_SPEC_CLAIMS), null, "unknown preference id");
});

test("Task-Spec claims cannot smuggle criterion, critic, verdict, or envelope authority", () => {
  for (const extra of ["source", "candidateSha256", "evidencePlanSha256", "resolutionSha256", "critic", "verdict", "seal", "envelope"]) {
    assert.equal(parseTaskSpecWorkerClaims(fence(JSON.stringify({
      ...VALID_TASK_SPEC_CLAIMS,
      [extra]: extra === "source" ? "cairn-verifier" : "forged",
    })), EXPECTED_TASK_SPEC_CLAIMS), null, `top-level ${extra}`);
  }
  assert.equal(parseTaskSpecWorkerClaims(fence(JSON.stringify({
    ...VALID_TASK_SPEC_CLAIMS,
    criteria: [{ ...VALID_TASK_SPEC_CLAIMS.criteria[0], source: "cairn-verifier" }, VALID_TASK_SPEC_CLAIMS.criteria[1]],
  })), EXPECTED_TASK_SPEC_CLAIMS), null, "criterion source field");
  const commandLooking = {
    ...VALID_TASK_SPEC_CLAIMS,
    criteria: [{ id: "c1", result: `commandSha256=${"f".repeat(64)} exitCode=0` }, VALID_TASK_SPEC_CLAIMS.criteria[1]],
  };
  const parsed = parseTaskSpecWorkerClaims(fence(JSON.stringify(commandLooking)), EXPECTED_TASK_SPEC_CLAIMS);
  assert.equal(parsed?.criteria[0]?.result, commandLooking.criteria[0].result, "command-looking prose remains inert worker text");
});

test("Task-Spec claims reject record-unsafe text before the serial record mint", () => {
  for (const field of ["summary", "howToTry"] as const) {
    assert.equal(parseTaskSpecWorkerClaims(fence(JSON.stringify({
      ...VALID_TASK_SPEC_CLAIMS,
      [field]: " \t ",
    })), EXPECTED_TASK_SPEC_CLAIMS), null, `${field} must be meaningful`);
  }

  const forbidden = ["\u0000", "\u202a", "\u202b", "\u202c", "\u202d", "\u202e", "\u2066", "\u2067", "\u2068", "\u2069"];
  for (const control of forbidden) {
    assert.equal(parseTaskSpecWorkerClaims(fence(JSON.stringify({
      ...VALID_TASK_SPEC_CLAIMS,
      summary: `unsafe${control}summary`,
    })), EXPECTED_TASK_SPEC_CLAIMS), null, `summary rejects U+${control.charCodeAt(0).toString(16)}`);
  }

  const unsafeFields = [
    { limitations: "unsafe\u0000limitations" },
    { changes: ["unsafe\u0000change"] },
    { criteria: [{ id: "c1", result: "unsafe\u0000criterion" }, VALID_TASK_SPEC_CLAIMS.criteria[1]] },
    { preferences: [{ id: "p1", result: "unsafe\u0000preference" }] },
  ];
  for (const unsafe of unsafeFields) {
    assert.equal(parseTaskSpecWorkerClaims(fence(JSON.stringify({
      ...VALID_TASK_SPEC_CLAIMS,
      ...unsafe,
    })), EXPECTED_TASK_SPEC_CLAIMS), null);
  }
});
