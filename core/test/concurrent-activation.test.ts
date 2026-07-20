import test from "node:test";
import assert from "node:assert/strict";
import { concurrentActivationDecision, validateConcurrentActivation } from "../src/concurrent-activation.js";

test("valuable-repository activation is an exact separately validated record", async () => {
  const moduleName = "../src/concurrent-activation.js";
  const candidate = await import(moduleName) as Record<string, unknown>;
  assert.equal(typeof candidate.validateConcurrentActivation, "function");
  assert.equal(typeof candidate.concurrentActivationDecision, "function");
});

const valid = {
  schemaVersion: 1 as const,
  implementationCommit: "a".repeat(40),
  implementationDigest: "b".repeat(64),
  reviewVerdict: "PASS" as const,
  ownerDecision: "accept" as const,
  qualifiedDeveloperVerdict: "PASS" as const,
  repositoryRoot: "C:/valuable/project",
  repositoryGitDir: "C:/valuable/project/.git",
  activatedAt: "2026-07-20T12:00:00.000Z",
};

test("activation rejects unknown fields, mismatched repository identity, and emergency disable", () => {
  assert.deepEqual(validateConcurrentActivation(valid), valid);
  assert.throws(() => validateConcurrentActivation({ ...valid, extra: true }), /ACTIVATION_INVALID/);
  assert.throws(() => concurrentActivationDecision(valid, { repositoryRoot: "C:/other", repositoryGitDir: valid.repositoryGitDir, implementationDigest: valid.implementationDigest }, undefined), /ACTIVATION_MISMATCH/);
  assert.throws(() => concurrentActivationDecision(valid, { repositoryRoot: valid.repositoryRoot, repositoryGitDir: valid.repositoryGitDir, implementationDigest: valid.implementationDigest }, "1"), /FINAL_DISABLED/);
});
