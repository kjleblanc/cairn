import test from "node:test";
import assert from "node:assert/strict";
import { extractFollowups, sanitizeFollowups } from "../src/main/conductor/followups.js";

const fence = (body: string) => "The card says this task finished DONE.\n\n```cairn-followups\n" + body + "\n```\n";

test("a valid block parses and the fence leaves the text", () => {
  const { followups, text } = extractFollowups(fence('["Retry with a narrower outcome", "Update PROJECT.md"]'));
  assert.deepEqual(followups, ["Retry with a narrower outcome", "Update PROJECT.md"]);
  assert.equal(text.includes("cairn-followups"), false);
  assert.ok(text.startsWith("The card says"));
});

test("one suggestion is a valid list; three is the most", () => {
  assert.deepEqual(extractFollowups(fence('["One step"]')).followups, ["One step"]);
  assert.deepEqual(extractFollowups(fence('["a", "b", "c"]')).followups, ["a", "b", "c"]);
  assert.equal(extractFollowups(fence('["a", "b", "c", "d"]')).followups, null);
  assert.equal(extractFollowups(fence("[]")).followups, null);
});

test("no fence means no suggestions and untouched text", () => {
  const { followups, text } = extractFollowups("Just a comment.");
  assert.equal(followups, null);
  assert.equal(text, "Just a comment.");
});

for (const [name, body] of [
  ["malformed json", "[not json"],
  ["object payload", '{"suggestion": "x"}'],
  ["non-string item", '["ok", 7]'],
  ["empty item", '["ok", "   "]'],
  ["oversized item", `["${"x".repeat(141)}"]`],
  ["item with a newline", '["line one\\nline two"]'],
  ["oversized block", `["${"x".repeat(1001)}"]`],
] as const) {
  test(`invalid block is rejected: ${name}`, () => {
    const { followups, text } = extractFollowups(fence(body));
    assert.equal(followups, null);
    assert.ok(text.length > 0, "the comment's text is preserved even when the block is invalid");
    assert.equal(text.includes("cairn-followups"), false);
  });
}

test("items are trimmed and exact duplicates dropped, not fatal", () => {
  assert.deepEqual(sanitizeFollowups(["  Padded  ", "Padded", "Other"]), ["Padded", "Other"]);
  assert.deepEqual(sanitizeFollowups(["Same", "Same"]), ["Same"]);
});

test("sanitizeFollowups fails closed on non-arrays and bad shapes", () => {
  assert.equal(sanitizeFollowups(undefined), null);
  assert.equal(sanitizeFollowups(null), null);
  assert.equal(sanitizeFollowups("one"), null);
  assert.equal(sanitizeFollowups([]), null);
  assert.equal(sanitizeFollowups(["a", "b", "c", "d"]), null);
  assert.equal(sanitizeFollowups(["multi\nline"]), null);
});
