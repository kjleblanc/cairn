import test from "node:test";
import assert from "node:assert/strict";
import { parseModel } from "../src/flows/task.js";

test("parseModel reads the space form: --model <id>", () => {
  assert.equal(parseModel(["task", "--model", "demo-model-x"]), "demo-model-x");
});

test("parseModel reads the equals form: --model=<id>", () => {
  assert.equal(parseModel(["task", "--model=demo-model-x"]), "demo-model-x");
});

test("parseModel returns undefined when the flag is absent", () => {
  assert.equal(parseModel(["task"]), undefined);
  assert.equal(parseModel(["task", "--mock"]), undefined);
});

test("parseModel does not swallow a following flag or an empty value", () => {
  assert.equal(parseModel(["task", "--model"]), undefined); // no value given
  assert.equal(parseModel(["task", "--model", "--mock"]), undefined); // next token is a flag
  assert.equal(parseModel(["task", "--model="]), undefined); // empty value
});

test("parseModel carries the chosen id through alongside --mock", () => {
  assert.equal(parseModel(["task", "--mock", "--model", "demo-model-x"]), "demo-model-x");
});
