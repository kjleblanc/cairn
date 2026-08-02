import test from "node:test";
import assert from "node:assert/strict";
import { BODIES } from "../src/shared/bodies.js";

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

// Task 137: since task 131 the OpenRouter doors offer one-click sign-in, so
// a billing line that says only "key from openrouter.ai" undersells the easy
// path — every OpenRouter seat's line names the choice.
test("every OpenRouter body's billing line names the sign-in choice", () => {
  const openRouterBodies = BODIES.filter((b) => b.baseUrl === undefined);
  assert.ok(openRouterBodies.length > 0);
  for (const body of openRouterBodies) {
    assert.ok(body.billing.includes("sign in"), `body ${body.name}'s billing line does not name sign-in: ${body.billing}`);
  }
});

test("Claude's current flagship, mid, and fast tiers keep their verified OpenRouter ids and prices", () => {
  const expected = [
    {
      id: "anthropic/claude-opus-5",
      name: "Claude Opus 5",
      price: "$5 per million input tokens and $25 per million output tokens",
    },
    {
      id: "anthropic/claude-sonnet-5",
      name: "Claude Sonnet 5",
      price: "$2 per million input tokens and $10 per million output tokens",
    },
    {
      id: "anthropic/claude-haiku-4.5",
      name: "Claude Haiku 4.5",
      price: "$1 per million input tokens and $5 per million output tokens",
    },
  ];

  for (const tier of expected) {
    const body = BODIES.find((candidate) => candidate.id === tier.id);
    assert.ok(body, `${tier.name} is missing from the picker`);
    assert.equal(body.name, tier.name);
    assert.ok(body.blurb.includes(tier.price), `${tier.name} does not show its verified price`);
    assert.equal(body.billing, "Bills per use — sign in or paste a key");
    assert.equal(body.baseUrl, undefined, `${tier.name} must use OpenRouter`);
  }
});

test("exactly two bodies are primary — the two doors on the connect card's first screen", () => {
  const primary = BODIES.filter((b) => b.primary === true);
  assert.equal(primary.length, 2);
  assert.ok(primary.every((b) => b.id === "moonshotai/kimi-k3" || b.id === "kimi-for-coding"));
});
