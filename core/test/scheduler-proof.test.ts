import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import test from "node:test";
import {
  claimDisposableSchedulerProof, createDisposableSchedulerProof, disposableSchedulerProofRecord,
  schedulerGit, schedulerGitDir, scaffoldProject, verifyDisposableSchedulerProof,
} from "../src/index.js";

function arbitraryRepository(label: string): string {
  const root = mkdtempSync(join(tmpdir(), `cairn-task-029-arbitrary-${label}-`));
  const created = scaffoldProject(root, { name: "arbitrary", what: "not proof", who: "test", milestone: "refuse", timebox: "default" });
  schedulerGit(root, ["init", "-b", "main"]);
  schedulerGit(root, ["config", "user.name", "Cairn Test"]);
  schedulerGit(root, ["config", "user.email", "cairn@example.invalid"]);
  schedulerGit(root, ["add", "--", ...created.map((path) => relative(root, path).replace(/\\/g, "/"))]);
  schedulerGit(root, ["commit", "-m", "arbitrary temp repository"]);
  return root;
}

test("the coordinator creates and verifies one exact disposable proof repository", () => {
  const proof = createDisposableSchedulerProof();
  assert.doesNotThrow(() => verifyDisposableSchedulerProof(proof));
  const record = disposableSchedulerProofRecord(proof.root);
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.consumedBy, "");
  assert.equal(record.initialFiles.length, 4);
  assert.equal(schedulerGit(proof.root, ["remote"]), "");
  assert.equal(schedulerGit(proof.root, ["rev-list", "--count", "HEAD"]), "1");
});

test("an arbitrary pre-existing temp repository and a copied proof marker are refused", () => {
  const arbitrary = arbitraryRepository("plain");
  assert.throws(() => verifyDisposableSchedulerProof({ root: arbitrary, token: "invented" }), /DISPOSABLE_PROVENANCE_UNPROVED/);

  const source = createDisposableSchedulerProof();
  const copied = arbitraryRepository("copied");
  const targetMarker = join(schedulerGitDir(copied), "cairn", "passive-proof-v1.json");
  mkdirSync(join(schedulerGitDir(copied), "cairn"), { recursive: true });
  copyFileSync(join(schedulerGitDir(source.root), "cairn", "passive-proof-v1.json"), targetMarker);
  assert.throws(() => verifyDisposableSchedulerProof({ root: copied, token: source.token }), /DISPOSABLE_PROVENANCE_UNPROVED/);
});

test("wrong, reused, changed-tree, extra-ref, remote, submodule, ignored-file, and alternate-object proofs fail closed", () => {
  const wrong = createDisposableSchedulerProof();
  assert.throws(() => verifyDisposableSchedulerProof({ root: wrong.root, token: "wrong" }), /DISPOSABLE_PROVENANCE_UNPROVED/);

  const consumed = createDisposableSchedulerProof();
  claimDisposableSchedulerProof(consumed, "run-once");
  assert.throws(() => verifyDisposableSchedulerProof(consumed), /DISPOSABLE_PROVENANCE_UNPROVED/);
  assert.doesNotThrow(() => verifyDisposableSchedulerProof(consumed, true));

  const changed = createDisposableSchedulerProof();
  writeFileSync(join(changed.root, "untracked.txt"), "dirty\n");
  assert.throws(() => verifyDisposableSchedulerProof(changed), /DISPOSABLE_PROVENANCE_UNPROVED/);

  const ref = createDisposableSchedulerProof();
  schedulerGit(ref.root, ["branch", "extra-proof-ref"]);
  assert.throws(() => verifyDisposableSchedulerProof(ref), /DISPOSABLE_PROVENANCE_UNPROVED/);

  const remote = createDisposableSchedulerProof();
  schedulerGit(remote.root, ["remote", "add", "origin", "https://example.invalid/refused.git"]);
  assert.throws(() => verifyDisposableSchedulerProof(remote), /DISPOSABLE_PROVENANCE_UNPROVED/);

  const submodule = createDisposableSchedulerProof();
  const submoduleRecord = disposableSchedulerProofRecord(submodule.root);
  schedulerGit(submodule.root, ["update-index", "--add", "--cacheinfo", `160000,${submoduleRecord.initialCommit},vendor/module`]);
  assert.throws(() => verifyDisposableSchedulerProof(submodule), /DISPOSABLE_PROVENANCE_UNPROVED/);

  const ignored = createDisposableSchedulerProof();
  writeFileSync(join(schedulerGitDir(ignored.root), "info", "exclude"), "ignored-evidence.txt\n");
  writeFileSync(join(ignored.root, "ignored-evidence.txt"), "must be visible to admission\n");
  assert.throws(() => verifyDisposableSchedulerProof(ignored), /DISPOSABLE_PROVENANCE_UNPROVED/);

  const alternate = createDisposableSchedulerProof();
  const other = createDisposableSchedulerProof();
  writeFileSync(join(schedulerGitDir(alternate.root), "objects", "info", "alternates"), `${join(schedulerGitDir(other.root), "objects")}\n`);
  assert.throws(() => verifyDisposableSchedulerProof(alternate), /DISPOSABLE_PROVENANCE_UNPROVED/);
});

test("a junction alias cannot turn another path into a disposable proof root", (context) => {
  const proof = createDisposableSchedulerProof();
  const aliasParent = mkdtempSync(join(tmpdir(), "cairn-task-029-alias-"));
  const alias = join(aliasParent, "proof-junction");
  try { symlinkSync(proof.root, alias, "junction"); }
  catch (error) {
    context.skip(`junction creation unavailable: ${String(error)}`);
    return;
  }
  assert.throws(() => verifyDisposableSchedulerProof({ root: alias, token: proof.token }), /DISPOSABLE_PROVENANCE_UNPROVED/);
});

test("a junction in a proof root's ancestor is also refused", (context) => {
  const proof = createDisposableSchedulerProof();
  const aliasParent = mkdtempSync(join(tmpdir(), "cairn-task-029-parent-alias-"));
  const parentAlias = join(aliasParent, "temp-parent-junction");
  try { symlinkSync(dirname(proof.root), parentAlias, "junction"); }
  catch (error) {
    context.skip(`junction creation unavailable: ${String(error)}`);
    return;
  }
  const aliasedRoot = join(parentAlias, basename(proof.root));
  assert.throws(() => verifyDisposableSchedulerProof({ root: aliasedRoot, token: proof.token }), /DISPOSABLE_PROVENANCE_UNPROVED/);
});
