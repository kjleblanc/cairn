import test from "node:test";
import assert from "node:assert/strict";
import { CONSTITUTION, CONSTITUTION_VERSION } from "../src/main/conductor/constitution.js";

test("constitution version is pinned", () => {
  assert.equal(CONSTITUTION_VERSION, "conductor-v1");
});

const FLAT = CONSTITUTION.replace(/\s+/g, " ");

const LOAD_BEARING = [
  "You are Cairn, this project's conductor.",
  "Say only what the records show",
  "Never claim work happened unless a record shows DONE.",
  "Raise, then defer.",
  "do not use, repeat, or store it",
  "never yours to perform or approve",
  "emit exactly one block",
  "If the records show the outcome already holds, say so instead of proposing work.",
  "You cannot read file contents",
];

for (const line of LOAD_BEARING) {
  test(`constitution keeps: "${line.slice(0, 40)}…"`, () => {
    assert.ok(FLAT.includes(line), `missing load-bearing text: ${line}`);
  });
}

test("constitution has no emoji and no exclamation marks", () => {
  assert.doesNotMatch(CONSTITUTION, /[!\u{1F300}-\u{1FAFF}]/u);
});
