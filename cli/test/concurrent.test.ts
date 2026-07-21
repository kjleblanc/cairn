import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { concurrentResultLines } from "../src/flows/concurrent.js";

test("bounded result text shows each task, serial order, calls, cost, and cleanup", () => {
  const lines = concurrentResultLines({
    runId: "proof-cli", projectRoot: "C:/Temp/proof", startMain: "a", finalMain: "b",
    tasks: [
      { taskNumber: 1, disposition: "DONE", callConsumed: true, checksPassed: true, integrationCommit: "one" },
      { taskNumber: 2, disposition: "STOPPED", blocker: "PROVIDER_OUTPUT_INVALID", callConsumed: true, checksPassed: false, integrationCommit: "two" },
    ],
    integrationOrder: [1, 2], providerCalls: 2, providerCostUsd: 0, cleanedUp: true,
  });
  const text = lines.join("\n");
  assert.match(text, /Task 001: DONE/);
  assert.match(text, /Task 002: STOPPED — PROVIDER_OUTPUT_INVALID/);
  assert.match(text, /Integration order: 001 → 002/);
  assert.match(text, /Provider calls: 2/);
  assert.match(text, /Cleanup: complete/);
});

test("the CLI passes only an exact authorization path to the strict core parser", () => {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "flows", "concurrent.ts"), "utf8");
  assert.doesNotMatch(source, /JSON\.parse\(raw\)/);
  assert.doesNotMatch(source, /readFileSync/);
  assert.match(source, /authorizationPath/);
});
