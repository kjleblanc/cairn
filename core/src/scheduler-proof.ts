import { createHash, randomUUID } from "node:crypto";
import {
  closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, mkdtempSync, openSync,
  readFileSync, realpathSync, renameSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { scaffoldProject } from "./files.js";
import { schedulerGit, schedulerGitDir } from "./scheduler-git.js";

const PROOF_FILE = "passive-proof-v1.json";

export interface DisposableSchedulerProof {
  root: string;
  token: string;
}

interface ProofRecord {
  schemaVersion: 1;
  root: string;
  tokenSha256: string;
  createdAt: string;
  initialCommit: string;
  initialTree: string;
  initialFiles: string[];
  consumedBy: string;
}

export class SchedulerProofError extends Error {
  constructor(public readonly code: string, message: string) {
    super(`${code}: ${message}`);
  }
}

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

function canonical(path: string): string {
  return realpathSync.native(resolve(path));
}

function samePath(left: string, right: string): boolean {
  return canonical(left).replace(/\\/g, "/").toLocaleLowerCase("en-US") ===
    canonical(right).replace(/\\/g, "/").toLocaleLowerCase("en-US");
}

function sameLexicalPath(left: string, right: string): boolean {
  return resolve(left).replace(/\\/g, "/").toLocaleLowerCase("en-US") ===
    resolve(right).replace(/\\/g, "/").toLocaleLowerCase("en-US");
}

function proofPath(root: string): string {
  return join(schedulerGitDir(root), "cairn", PROOF_FILE);
}

function atomicWrite(target: string, text: string, createOnly = false): void {
  mkdirSync(dirname(target), { recursive: true });
  if (createOnly) {
    const fd = openSync(target, "wx");
    try { writeFileSync(fd, text, "utf8"); fsyncSync(fd); }
    finally { closeSync(fd); }
    return;
  }
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  const fd = openSync(temporary, "wx");
  try { writeFileSync(fd, text, "utf8"); fsyncSync(fd); }
  finally { closeSync(fd); }
  renameSync(temporary, target);
}

function parseRecord(root: string): ProofRecord {
  const path = proofPath(root);
  if (!existsSync(path)) throw new SchedulerProofError("DISPOSABLE_PROVENANCE_UNPROVED", "The repository has no coordinator creation record.");
  let value: unknown;
  try { value = JSON.parse(readFileSync(path, "utf8")); }
  catch { throw new SchedulerProofError("DISPOSABLE_PROVENANCE_UNPROVED", "The coordinator creation record is malformed."); }
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new SchedulerProofError("DISPOSABLE_PROVENANCE_UNPROVED", "The coordinator creation record is not one plain object.");
  }
  const expected = ["schemaVersion", "root", "tokenSha256", "createdAt", "initialCommit", "initialTree", "initialFiles", "consumedBy"].sort();
  if (JSON.stringify(Object.keys(value as object).sort()) !== JSON.stringify(expected)) {
    throw new SchedulerProofError("DISPOSABLE_PROVENANCE_UNPROVED", "The coordinator creation record has missing or unknown fields.");
  }
  const record = value as ProofRecord;
  if (record.schemaVersion !== 1 || typeof record.root !== "string" || typeof record.tokenSha256 !== "string" ||
      typeof record.createdAt !== "string" || typeof record.initialCommit !== "string" || typeof record.initialTree !== "string" ||
      !Array.isArray(record.initialFiles) || record.initialFiles.some((file) => typeof file !== "string") ||
      typeof record.consumedBy !== "string") {
    throw new SchedulerProofError("DISPOSABLE_PROVENANCE_UNPROVED", "The coordinator creation record has invalid values.");
  }
  return record;
}

function assertRootShape(root: string): void {
  const resolved = resolve(root);
  const dotGit = join(resolved, ".git");
  if (!sameLexicalPath(resolved, canonical(resolved)) || lstatSync(resolved).isSymbolicLink() || !lstatSync(resolved).isDirectory() ||
      !existsSync(dotGit) || lstatSync(dotGit).isSymbolicLink() || !lstatSync(dotGit).isDirectory()) {
    throw new SchedulerProofError("DISPOSABLE_PROVENANCE_UNPROVED", "The proof root is a link, reparse alias, or non-directory.");
  }
  const realTemp = canonical(tmpdir());
  const realRoot = canonical(resolved);
  const rel = relative(realTemp, realRoot);
  if (!rel || rel.startsWith("..") || resolve(realTemp, rel) !== realRoot) {
    throw new SchedulerProofError("DISPOSABLE_PROVENANCE_UNPROVED", "The proof root is not one new child of the operating-system temporary directory.");
  }
  if (!samePath(schedulerGitDir(root), join(root, ".git"))) {
    throw new SchedulerProofError("DISPOSABLE_PROVENANCE_UNPROVED", "Linked or alternate Git directories are unsupported.");
  }
}

function assertRepositoryShape(root: string, record: ProofRecord): void {
  const head = schedulerGit(root, ["rev-parse", "refs/heads/main"]);
  const tree = schedulerGit(root, ["rev-parse", "HEAD^{tree}"]);
  const files = schedulerGit(root, ["ls-tree", "-r", "--name-only", "HEAD"]).split(/\r?\n/).filter(Boolean).sort();
  const refs = schedulerGit(root, ["for-each-ref", "--format=%(refname)"]).split(/\r?\n/).filter(Boolean);
  const stages = schedulerGit(root, ["ls-files", "--stage"]);
  if (head !== record.initialCommit || tree !== record.initialTree || schedulerGit(root, ["rev-list", "--count", "HEAD"]) !== "1" ||
      JSON.stringify(files) !== JSON.stringify([...record.initialFiles].sort()) ||
      JSON.stringify(refs) !== JSON.stringify(["refs/heads/main"]) || schedulerGit(root, ["remote"]) ||
      existsSync(join(schedulerGitDir(root), "objects", "info", "alternates")) ||
      /(^|\n)160000 /.test(stages) || schedulerGit(root, ["status", "--porcelain=v1", "--untracked-files=all", "--ignored"])) {
    throw new SchedulerProofError("DISPOSABLE_PROVENANCE_UNPROVED", "The disposable repository no longer matches its exact one-commit creation state.");
  }
}

/** Create the only repository shape admitted by the passive Experimental Draft. */
export function createDisposableSchedulerProof(): DisposableSchedulerProof {
  const root = mkdtempSync(join(tmpdir(), "cairn-passive-proof-"));
  if (lstatSync(root).isSymbolicLink() || !lstatSync(root).isDirectory()) {
    throw new SchedulerProofError("DISPOSABLE_PROVENANCE_UNPROVED", "The operating system did not create one regular proof directory.");
  }
  const created = scaffoldProject(root, {
    name: "Cairn passive scheduler proof",
    what: "create disposable passive text artifacts",
    who: "offline proof",
    milestone: "show ready-first contained scheduling",
    timebox: "default",
  });
  schedulerGit(root, ["init", "-b", "main"]);
  schedulerGit(root, ["config", "user.name", "Cairn Passive Proof"]);
  schedulerGit(root, ["config", "user.email", "cairn-passive-proof@example.invalid"]);
  const initialFiles = created.map((path) => relative(root, path).replace(/\\/g, "/")).sort();
  schedulerGit(root, ["add", "--", ...initialFiles]);
  schedulerGit(root, ["commit", "-m", "Create disposable Cairn passive proof"]);
  const token = randomUUID();
  const record: ProofRecord = {
    schemaVersion: 1,
    root: canonical(root),
    tokenSha256: sha256(token),
    createdAt: new Date().toISOString(),
    initialCommit: schedulerGit(root, ["rev-parse", "HEAD"]),
    initialTree: schedulerGit(root, ["rev-parse", "HEAD^{tree}"]),
    initialFiles,
    consumedBy: "",
  };
  atomicWrite(proofPath(root), `${JSON.stringify(record, null, 2)}\n`, true);
  verifyDisposableSchedulerProof({ root, token });
  return { root, token };
}

/** Verify exact creator provenance. This performs no mutation. */
export function verifyDisposableSchedulerProof(proof: DisposableSchedulerProof, allowConsumed = false): void {
  if (!proof || typeof proof.root !== "string" || typeof proof.token !== "string" || !proof.token) {
    throw new SchedulerProofError("DISPOSABLE_PROVENANCE_UNPROVED", "A complete proof capability is required.");
  }
  assertRootShape(proof.root);
  const record = parseRecord(proof.root);
  if (!samePath(record.root, proof.root) || record.tokenSha256 !== sha256(proof.token) || (!allowConsumed && record.consumedBy)) {
    throw new SchedulerProofError("DISPOSABLE_PROVENANCE_UNPROVED", "The proof capability is wrong, copied, or already consumed.");
  }
  assertRepositoryShape(proof.root, record);
}

/** One-use compare-and-record claim performed immediately before batch state creation. */
export function claimDisposableSchedulerProof(proof: DisposableSchedulerProof, runId: string): void {
  verifyDisposableSchedulerProof(proof);
  const record = parseRecord(proof.root);
  record.consumedBy = runId;
  atomicWrite(proofPath(proof.root), `${JSON.stringify(record, null, 2)}\n`);
  const saved = parseRecord(proof.root);
  if (saved.consumedBy !== runId) throw new SchedulerProofError("DISPOSABLE_PROVENANCE_UNPROVED", "The proof claim was not recorded exactly.");
}

export function disposableSchedulerProofRecord(root: string): Omit<ProofRecord, "tokenSha256"> {
  const { tokenSha256: _redacted, ...record } = parseRecord(root);
  return record;
}
