import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { atomicWriteText } from "../src/main/atomicwrite.js";

test("atomic text replacement lands the complete new value", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-atomic-write-"));
  try {
    const target = join(root, "conductor.json");
    writeFileSync(target, "old", "utf8");
    atomicWriteText(target, "new-complete-value");
    assert.equal(readFileSync(target, "utf8"), "new-complete-value");
    assert.deepEqual(readdirSync(root), ["conductor.json"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a failed final replacement preserves the prior value and removes the temporary copy", () => {
  const root = mkdtempSync(join(tmpdir(), "cairn-atomic-write-failure-"));
  try {
    const target = join(root, "conductor.json");
    writeFileSync(target, "encrypted-key-before-renewal", "utf8");
    assert.throws(() => atomicWriteText(target, "new-scope", () => {
      throw new Error("injected rename failure");
    }), /injected rename failure/);
    assert.equal(readFileSync(target, "utf8"), "encrypted-key-before-renewal");
    assert.deepEqual(readdirSync(root), ["conductor.json"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
