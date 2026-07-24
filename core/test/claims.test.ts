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
