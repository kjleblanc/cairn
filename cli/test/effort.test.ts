import test from "node:test";
import assert from "node:assert/strict";
import { parseEffort } from "../src/flows/task.js";

test("parseEffort reads the space form: --effort <level>", () => {
  assert.equal(parseEffort(["task", "--effort", "low"]), "low");
});

test("parseEffort reads the equals form: --effort=<level>", () => {
  assert.equal(parseEffort(["task", "--effort=high"]), "high");
});

test("parseEffort returns undefined when the flag is absent", () => {
  assert.equal(parseEffort(["task"]), undefined);
  assert.equal(parseEffort(["task", "--mock"]), undefined);
});

test("parseEffort does not swallow a following flag or an empty value", () => {
  assert.equal(parseEffort(["task", "--effort"]), undefined); // no value given
  assert.equal(parseEffort(["task", "--effort", "--mock"]), undefined); // next token is a flag
  assert.equal(parseEffort(["task", "--effort="]), undefined); // empty value
});

test("parseEffort carries the chosen level through alongside --mock and --model", () => {
  assert.equal(parseEffort(["task", "--mock", "--model", "demo-model-x", "--effort", "xhigh"]), "xhigh");
});

test("parseEffort returns an invalid value as typed — the entrypoint rejects it with a plain message", () => {
  assert.equal(parseEffort(["task", "--effort", "silly"]), "silly");
});
