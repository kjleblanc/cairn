import test from "node:test";
import assert from "node:assert/strict";
import { BODIES } from "../src/renderer/bodies.js";

test("every body has a non-empty id, and ids are unique", () => {
  for (const body of BODIES) {
    assert.ok(body.id.trim().length > 0, `body ${body.name} has an empty id`);
  }
  const ids = BODIES.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length, "body ids must be unique");
});

test("exactly one body is marked recommended", () => {
  const recommended = BODIES.filter((b) => b.recommended === true);
  assert.equal(recommended.length, 1);
});

test("every blurb is non-empty and under 140 characters", () => {
  for (const body of BODIES) {
    assert.ok(body.blurb.trim().length > 0, `body ${body.name} has an empty blurb`);
    assert.ok(body.blurb.length < 140, `body ${body.name}'s blurb is ${body.blurb.length} chars, expected under 140`);
  }
});

test("every body names how it bills in plain words", () => {
  for (const body of BODIES) {
    assert.ok(body.billing.trim().length > 0, `body ${body.name} has an empty billing line`);
    assert.ok(body.billing.length < 100, `body ${body.name}'s billing line is ${body.billing.length} chars, expected under 100`);
  }
});

test("exactly two bodies are primary — the two doors on the connect card's first screen", () => {
  const primary = BODIES.filter((b) => b.primary === true);
  assert.equal(primary.length, 2);
  assert.ok(primary.every((b) => b.id === "moonshotai/kimi-k3" || b.id === "kimi-for-coding"));
});
