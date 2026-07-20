import { createHash } from "node:crypto";

export const CONCURRENT_TRANSITIONS = [
  "admission", "worktree-root", "task-worktree", "approval-freeze",
  "call-consume", "broker-result", "result-apply", "task-commit",
  "integration-lease", "integration-candidate", "candidate-checks",
  "evidence-finalize", "main-fast-forward", "task-cleanup",
  "integration-cleanup", "process-cleanup", "run-cleanup",
] as const;

export type ConcurrentTransitionName = typeof CONCURRENT_TRANSITIONS[number];

export interface ConcurrentPendingTransition {
  schemaVersion: 1;
  sequence: number;
  name: ConcurrentTransitionName;
  taskNumber: 1 | 2 | null;
  target: string;
  before: string;
  intendedAfter: string;
  startedAt: string;
}

export interface ConcurrentJournal {
  schemaVersion: 1;
  sequence: number;
  pending: ConcurrentPendingTransition | null;
  completed: Array<{ sequence: number; name: ConcurrentTransitionName; taskNumber: 1 | 2 | null; after: string }>;
}

export function newConcurrentJournal(): ConcurrentJournal {
  return { schemaVersion: 1, sequence: 0, pending: null, completed: [] };
}

function exactKeys(value: object, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

export function parseConcurrentState(text: string): Record<string, unknown> {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("CORRUPT_STATE"); }
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error("CORRUPT_STATE");
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 2 || !record.journal || typeof record.journal !== "object" || Array.isArray(record.journal)) {
    throw new Error("UNSUPPORTED_STATE");
  }
  const journal = record.journal as Record<string, unknown>;
  if (!exactKeys(journal, ["schemaVersion", "sequence", "pending", "completed"]) || journal.schemaVersion !== 1 ||
      !Number.isSafeInteger(journal.sequence) || !Array.isArray(journal.completed)) throw new Error("CORRUPT_STATE");
  if (journal.pending !== null) {
    if (!journal.pending || typeof journal.pending !== "object" || Array.isArray(journal.pending) ||
        !exactKeys(journal.pending, ["schemaVersion", "sequence", "name", "taskNumber", "target", "before", "intendedAfter", "startedAt"])) {
      throw new Error("CORRUPT_STATE");
    }
    const pending = journal.pending as Record<string, unknown>;
    if (pending.schemaVersion !== 1 || !CONCURRENT_TRANSITIONS.includes(pending.name as ConcurrentTransitionName)) throw new Error("CORRUPT_STATE");
  }
  return record;
}

export function beginConcurrentTransition(
  journal: ConcurrentJournal,
  name: ConcurrentTransitionName,
  taskNumber: 1 | 2 | null,
  target: string,
  before: string,
  intendedAfter: string,
): ConcurrentPendingTransition {
  if (journal.pending) throw new Error("TRANSITION_ACTIVE");
  const pending: ConcurrentPendingTransition = {
    schemaVersion: 1,
    sequence: journal.sequence + 1,
    name,
    taskNumber,
    target,
    before,
    intendedAfter,
    startedAt: new Date().toISOString(),
  };
  journal.sequence = pending.sequence;
  journal.pending = pending;
  return pending;
}

export function completeConcurrentTransition(journal: ConcurrentJournal, observedAfter: string): void {
  const pending = journal.pending;
  if (!pending) throw new Error("NO_TRANSITION_ACTIVE");
  if (pending.intendedAfter !== observedAfter) throw new Error("TRANSITION_RESULT_MISMATCH");
  journal.completed.push({ sequence: pending.sequence, name: pending.name, taskNumber: pending.taskNumber, after: observedAfter });
  journal.pending = null;
}

export function concurrentStateDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}
