import assert from "node:assert/strict";
import { existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  evaluatePassiveAssertions, PASSIVE_ARTIFACT_MAX_BYTES, PASSIVE_LITERAL_MAX_BYTES, validatePassiveAssertions,
  type PassiveAssertion,
} from "../src/scheduler-checks.js";

function fixture(label: string): string {
  const root = mkdtempSync(join(tmpdir(), `cairn-task-029-check-${label}-`));
  mkdirSync(join(root, "artifacts", "task-001"), { recursive: true });
  return root;
}

test("the declarative evaluator has no process, VM, worker, or dynamic module surface", () => {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "scheduler-checks.ts"), "utf8");
  assert.doesNotMatch(source, /node:child_process|node:vm|worker_threads|spawn|execFile|execSync|fork\(|import\s*\(/);
});

test("code-looking artifact text is compared as passive bytes and never executed", () => {
  const root = fixture("never-execute");
  const path = "artifacts/task-001/result.md";
  const sentinel = join(root, "outside-sentinel.txt");
  const text = `# Passive text\n\nwriteFileSync(${JSON.stringify(sentinel)}, "escaped")\n`;
  writeFileSync(join(root, path), text);
  const assertions: PassiveAssertion[] = [
    { kind: "utf8Contains", path, fragments: ["writeFileSync", "Passive text"], lineEndings: "normalize" },
  ];
  evaluatePassiveAssertions(root, assertions);
  assert.equal(existsSync(sentinel), false);
});

test("legacy executable and npm declarations are rejected as unknown assertion data", () => {
  const allowed = ["artifacts/task-001/result.md"];
  for (const declaration of [
    { executable: "node", args: ["--test", "escape.test.mjs"] },
    { executable: "npm.cmd", args: ["run", "deploy"] },
    { kind: "npm", path: allowed[0], script: "postinstall" },
  ]) {
    assert.throws(() => validatePassiveAssertions([declaration], allowed), /DECLARATIVE_CHECK_INVALID/);
  }

  const accessor = { kind: "fileExists", path: allowed[0] };
  Object.defineProperty(accessor, "path", { enumerable: true, get: () => allowed[0] });
  assert.throws(() => validatePassiveAssertions([accessor], allowed), /DECLARATIVE_CHECK_INVALID/);
  const hidden = { kind: "fileExists", path: allowed[0] };
  Object.defineProperty(hidden, "command", { enumerable: false, value: "node escape.js" });
  assert.throws(() => validatePassiveAssertions([hidden], allowed), /DECLARATIVE_CHECK_INVALID/);
  assert.throws(() => validatePassiveAssertions([
    { kind: "utf8Equals", path: allowed[0], expected: "x".repeat(PASSIVE_LITERAL_MAX_BYTES + 1), lineEndings: "exact" },
  ], allowed), /DECLARATIVE_CHECK_INVALID/);
});

test("exact, normalized, and contains assertions evaluate bounded UTF-8 text", () => {
  const root = fixture("comparison");
  const path = "artifacts/task-001/result.txt";
  writeFileSync(join(root, path), "first\r\nsecond\r\n");
  const assertions = validatePassiveAssertions([
    { kind: "fileExists", path },
    { kind: "utf8Equals", path, expected: "first\nsecond\n", lineEndings: "normalize" },
    { kind: "utf8Contains", path, fragments: ["first\n", "second"], lineEndings: "normalize" },
  ], [path]);
  assert.doesNotThrow(() => evaluatePassiveAssertions(root, assertions));
});

test("NUL, invalid UTF-8, oversized, and hard-linked artifacts fail closed", () => {
  const cases: Array<[string, Buffer]> = [
    ["nul", Buffer.from("before\0after")],
    ["invalid", Buffer.from([0xc3, 0x28])],
    ["oversized", Buffer.alloc(PASSIVE_ARTIFACT_MAX_BYTES + 1, 0x61)],
  ];
  for (const [label, bytes] of cases) {
    const root = fixture(label);
    const path = "artifacts/task-001/result.txt";
    writeFileSync(join(root, path), bytes);
    assert.throws(() => evaluatePassiveAssertions(root, [{ kind: "fileExists", path }]), /PASSIVE_PATH_ESCAPE/);
  }

  const hardRoot = fixture("hard-link");
  const hardPath = "artifacts/task-001/result.txt";
  writeFileSync(join(hardRoot, hardPath), "linked\n");
  linkSync(join(hardRoot, hardPath), join(hardRoot, "artifact-alias.txt"));
  assert.throws(() => evaluatePassiveAssertions(hardRoot, [{ kind: "fileExists", path: hardPath }]), /PASSIVE_PATH_ESCAPE/);
});

test("a symbolic-link artifact fails closed when the platform permits creating one", (context) => {
  const root = fixture("symbolic-link");
  const target = join(root, "outside-target.txt");
  const path = "artifacts/task-001/result.txt";
  writeFileSync(target, "outside\n");
  try { symlinkSync(target, join(root, path), "file"); }
  catch (error) {
    context.skip(`file symlink creation unavailable: ${String(error)}`);
    return;
  }
  assert.throws(() => evaluatePassiveAssertions(root, [{ kind: "fileExists", path }]), /PASSIVE_PATH_ESCAPE/);
});
