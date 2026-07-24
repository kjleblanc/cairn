import test from "node:test";
import assert from "node:assert/strict";
import { extractTaskBlock } from "../src/main/conductor/taskblock.js";

const fence = (body: string) => "Here is my proposal.\n\n```cairn-task\n" + body + "\n```\nAnything else?";

test("a valid block parses and the fence leaves the text", () => {
  const reply = fence('{"outcome": "The page title says My Bookshelf", "concerns": [], "notes": ""}');
  const { block, text } = extractTaskBlock(reply);
  assert.ok(block);
  assert.equal(block.outcome, "The page title says My Bookshelf");
  assert.deepEqual(block.concerns, []);
  assert.equal(text.includes("cairn-task"), false);
  assert.ok(text.startsWith("Here is my proposal."));
});

test("concerns parse with kinds and bounded shape", () => {
  const reply = fence('{"outcome": "Save the book list locally", "concerns": [{"kind": "risk", "text": "Plain-text storage is readable by anything on this computer"}], "notes": "owner set aside the sync question"}');
  const { block } = extractTaskBlock(reply);
  assert.ok(block);
  assert.equal(block.concerns.length, 1);
  assert.equal(block.concerns[0].kind, "risk");
});

test("no fence means no block and untouched text", () => {
  const { block, text } = extractTaskBlock("Just a chat reply.");
  assert.equal(block, null);
  assert.equal(text, "Just a chat reply.");
});

for (const [name, body] of [
  ["malformed json", "{not json"],
  ["extra key", '{"outcome": "x", "concerns": [], "notes": "", "sneaky": true}'],
  ["missing outcome", '{"concerns": [], "notes": ""}'],
  ["empty outcome", '{"outcome": "  ", "concerns": [], "notes": ""}'],
  ["oversized outcome", `{"outcome": "${"x".repeat(301)}", "concerns": [], "notes": ""}`],
  ["bad concern kind", '{"outcome": "x", "concerns": [{"kind": "warning", "text": "y"}], "notes": ""}'],
  ["concern extra key", '{"outcome": "x", "concerns": [{"kind": "risk", "text": "y", "z": 1}], "notes": ""}'],
  ["too many concerns", '{"outcome": "x", "concerns": [{"kind":"risk","text":"a"},{"kind":"risk","text":"b"},{"kind":"risk","text":"c"},{"kind":"risk","text":"d"}], "notes": ""}'],
  ["array payload", '["outcome"]'],
  ["oversized notes", `{"outcome": "x", "concerns": [], "notes": "${"n".repeat(1001)}"}`],
] as const) {
  test(`invalid block is rejected: ${name}`, () => {
    const { block, text } = extractTaskBlock(fence(body));
    assert.equal(block, null);
    assert.ok(text.length > 0, "conversation text is preserved even when the block is invalid");
  });
}

test("only the first fence is honored", () => {
  const reply = fence('{"outcome": "first", "concerns": [], "notes": ""}') + "\n" + fence('{"outcome": "second", "concerns": [], "notes": ""}');
  const { block } = extractTaskBlock(reply);
  assert.ok(block);
  assert.equal(block.outcome, "first");
});
