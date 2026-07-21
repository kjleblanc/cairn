import test from "node:test";
import assert from "node:assert/strict";
import {
  BoundedProviderError,
  canonicalTask027LiveAuthorization,
  createFakeBoundedProvider,
  installedOfficialSdk,
  LIVE_CREDENTIAL_APPROVAL,
  LIVE_TASK_001_APPROVAL,
  LIVE_TASK_002_APPROVAL,
  liveCostApproval,
  parseTask027LiveAuthorization,
  proofProviderRequest,
  PROOF_TOTAL_COST_CAP_USD,
  TASK_027_BRIEF_COMMIT,
  TASK_027_BRIEF_SHA256,
  type Task027LiveAuthorization,
  validateBoundedProviderResult,
} from "../src/bounded-provider.js";

function authorization(): Task027LiveAuthorization {
  const approvedAt = new Date(Date.now() - 1_000).toISOString();
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
  return {
    schemaVersion: 2, taskNumber: 27, briefCommit: TASK_027_BRIEF_COMMIT, briefSha256: TASK_027_BRIEF_SHA256,
    implementationDigest: "a".repeat(64), sdkVersion: "0.93.0", endpoint: "https://api.anthropic.com/v1/messages",
    method: "POST", model: "claude-haiku-4-5", maxRetries: 0, maxTokens: 64, serviceTier: "standard_only",
    task001InputSha256: proofProviderRequest(1).inputSha256, task002InputSha256: proofProviderRequest(2).inputSha256,
    maxCallsPerTask: 1, maxCostUsdPerTask: 0.25, totalCostCapUsd: 0.5, inputUsdPerMillion: 1,
    outputUsdPerMillion: 10, maxInputTokens: 200_000, approvedAt, expiresAt,
    credentialApproval: LIVE_CREDENTIAL_APPROVAL, task001Approval: LIVE_TASK_001_APPROVAL,
    task002Approval: LIVE_TASK_002_APPROVAL, costApproval: liveCostApproval(1, 10, 200_000),
  };
}

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
  assert.throws(() => validateBoundedProviderResult(1, '{"replacement":"Welcome to a friendly list where every good book has a home.","replacement":"Welcome to another friendly list where every good book has a home."}'), /PROVIDER_OUTPUT_INVALID/);
  assert.throws(() => validateBoundedProviderResult(1, '{"replacement":"Welcome to a friendly list where every good book has a home."}', 0.251), /PROVIDER_COST_LIMIT/);
  assert.equal(PROOF_TOTAL_COST_CAP_USD, 0.5);
});

test("Task 027 live authorization requires exact canonical bytes and rejects shadow keys", () => {
  const canonical = canonicalTask027LiveAuthorization(authorization());
  assert.equal(parseTask027LiveAuthorization(canonical).taskNumber, 27);
  assert.throws(() => parseTask027LiveAuthorization(canonical.replace('"schemaVersion": 2', '"schemaVersion": 2,\n  "schemaVersion": 2')), /LIVE_APPROVAL_REQUIRED/);
  assert.throws(() => parseTask027LiveAuthorization(canonical.replace("  \"taskNumber\": 27,\n", "")), /LIVE_APPROVAL_REQUIRED/);
  assert.throws(() => parseTask027LiveAuthorization(canonical.replace("{\n", "{ ")), /LIVE_APPROVAL_NONCANONICAL/);
  assert.throws(() => parseTask027LiveAuthorization(canonical.replace('"inputUsdPerMillion": 1', '"inputUsdPerMillion": 1.01')), /LIVE_APPROVAL_REQUIRED/);
});

test("the direct official SDK version and every credential/request source pin match", () => {
  const sdk = installedOfficialSdk();
  assert.equal(sdk.version, "0.93.0");
  assert.deepEqual(Object.keys(sdk.hashes).sort(), ["client.mjs", "core/credentials.mjs", "index.mjs",
    "lib/credentials/credential-chain.mjs", "lib/credentials/token-cache.mjs", "lib/credentials/user-oauth.mjs", "package.json"].sort());
});

test("two fake calls can overlap but remain separately bounded", async () => {
  let maximum = 0;
  const provider = createFakeBoundedProvider({ delayMs: 20, onActiveChange: (active) => { maximum = Math.max(maximum, active); } });
  const results = await Promise.all([provider.call(proofProviderRequest(1)), provider.call(proofProviderRequest(2))]);
  assert.equal(results.length, 2);
  assert.equal(maximum, 2);
  assert.equal(provider.snapshot().totalCalls, 2);
});
