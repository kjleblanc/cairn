import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CONCURRENT_DISABLE_ENV } from "../src/concurrent-run.js";

const here = dirname(fileURLToPath(import.meta.url));
const sourceRoot = join(here, "..", "..", "src");

test("the Contract v2.2 emergency switch has the exact required name", () => {
  assert.equal(CONCURRENT_DISABLE_ENV, "CAIRN_BOUNDED_CONCURRENCY_DISABLE");
});

test("the coordinator-facing provider module cannot import the credential SDK", () => {
  const source = readFileSync(join(sourceRoot, "bounded-provider.ts"), "utf8");
  assert.doesNotMatch(source, /import\(["']@anthropic-ai\/claude-agent-sdk["']\)/);
  assert.doesNotMatch(source, /\bquery\s*\(/);
  assert.doesNotMatch(source, /bounded-network-guard/);
});

test("the isolated broker uses the direct official Messages SDK and only the custom fetch delegate", () => {
  const child = readFileSync(join(sourceRoot, "bounded-broker-child.ts"), "utf8");
  const boundary = readFileSync(join(sourceRoot, "bounded-messages-fetch.ts"), "utf8");
  const provider = readFileSync(join(sourceRoot, "bounded-provider.ts"), "utf8");
  assert.match(child, /from "@anthropic-ai\/sdk"/);
  assert.match(child, /client\.messages\.create\(/);
  assert.match(child, /maxRetries:\s*0/);
  assert.match(child, /fetch:\s*boundary\.fetch/);
  assert.doesNotMatch(child, /claude-agent-sdk|\bquery\s*\(|spawn\s*\(/);
  assert.equal((boundary.match(/await delegate\(/g) ?? []).length, 1);
  assert.match(boundary, /ANTHROPIC_MESSAGES_URL/);
  assert.match(provider, /function brokerProcessEnvironment\(\)/);
  assert.doesNotMatch(provider, /env:\s*process\.env|\.\.\.process\.env/);
  assert.doesNotMatch(provider, /ANTHROPIC_API_KEY.*process\.env|ANTHROPIC_AUTH_TOKEN.*process\.env/);
  assert.equal(readFileSync(join(sourceRoot, "..", "package.json"), "utf8").includes('"@anthropic-ai/sdk": "0.93.0"'), true);
});

test("the bounded mutating API is raw-file-only and has no raw-object official proof export", async () => {
  const moduleName = "../src/concurrent-run.js";
  const candidate = await import(moduleName) as Record<string, unknown>;
  assert.equal(typeof candidate.runConcurrentFromManifestPath, "function");
  assert.equal(candidate.runConcurrentOfficialProof, undefined);
  assert.equal(candidate.admitConcurrentRun, undefined);
  assert.equal(candidate.runConcurrentFake, undefined);
});

test("Desktop status uses a sanitized bounded view rather than persisted state", async () => {
  const moduleName = "../src/concurrent-run.js";
  const candidate = await import(moduleName) as Record<string, unknown>;
  assert.equal(typeof candidate.concurrentRunView, "function");
});
