import test from "node:test";
import assert from "node:assert/strict";
import { parseWorkerClaims } from "../src/claims.js";

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
  // linear line-walk should finish in roughly 1-5ms; 2000ms is a loose bound
  // chosen to avoid CI flake while still catching a quadratic regression.
  const input = "```cairn-claims\n".repeat(262_144 / 16).slice(0, 262_144);
  assert.equal(input.length, 262_144);
  const start = Date.now();
  const result = parseWorkerClaims(input);
  const elapsed = Date.now() - start;
  assert.equal(result, null, "an unclosed trailing fence is not a fence");
  assert.ok(elapsed < 2000, `expected a linear scan under 2000ms, took ${elapsed}ms`);
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
