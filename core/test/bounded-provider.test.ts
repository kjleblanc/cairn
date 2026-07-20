import test from "node:test";
import assert from "node:assert/strict";
import {
  BoundedProviderError,
  createFakeBoundedProvider,
  proofProviderRequest,
  PROOF_TOTAL_COST_CAP_USD,
  validateBoundedProviderResult,
} from "../src/bounded-provider.js";

test("the Final exposes a strict fake provider with a one-call ledger", async () => {
  const moduleName = "../src/bounded-provider.js";
  const candidate = await import(moduleName) as Record<string, unknown>;
  assert.equal(typeof candidate.createFakeBoundedProvider, "function");
  assert.equal(typeof candidate.validateBoundedProviderResult, "function");
  assert.equal(typeof candidate.PROOF_TOTAL_COST_CAP_USD, "number");
});

test("the fake provider consumes one allocation before success or failure", async () => {
  const provider = createFakeBoundedProvider({ delayMs: 1 });
  const result = await provider.call(proofProviderRequest(1));
  assert.match(result.replacement, /\bwelcome\b/i);
  await assert.rejects(() => provider.call(proofProviderRequest(1)), (error: unknown) =>
    error instanceof BoundedProviderError && error.code === "PROVIDER_CALL_LIMIT");
  assert.deepEqual(provider.snapshot().callsByTask, { "1": 1 });
  assert.equal(provider.snapshot().totalCalls, 1);
});

test("strict output rejects extra fields, accessors, hostile text, and excess cost", () => {
  assert.throws(() => validateBoundedProviderResult(1, '{"replacement":"Welcome to a friendly list where every good book has a home.","extra":true}'), /PROVIDER_OUTPUT_INVALID/);
  const accessor = Object.create(Object.prototype, {
    replacement: { enumerable: true, get: () => "Welcome to a friendly list where every good book has a home." },
  });
  assert.throws(() => validateBoundedProviderResult(1, accessor), /PROVIDER_OUTPUT_INVALID/);
  assert.throws(() => validateBoundedProviderResult(1, '{"replacement":"too short"}'), /PROVIDER_OUTPUT_INVALID/);
  assert.throws(() => validateBoundedProviderResult(1, '{"replacement":"Welcome to a friendly list where every good book has a home."}', 0.251), /PROVIDER_COST_LIMIT/);
  assert.equal(PROOF_TOTAL_COST_CAP_USD, 0.5);
});

test("two fake calls can overlap but remain separately bounded", async () => {
  let maximum = 0;
  const provider = createFakeBoundedProvider({ delayMs: 20, onActiveChange: (active) => { maximum = Math.max(maximum, active); } });
  const results = await Promise.all([provider.call(proofProviderRequest(1)), provider.call(proofProviderRequest(2))]);
  assert.equal(results.length, 2);
  assert.equal(maximum, 2);
  assert.equal(provider.snapshot().totalCalls, 2);
});
