export interface WorkerClaimCheck { name: string; result: string }

export interface WorkerClaims {
  disposition: "DONE" | "STOPPED";
  summary: string;
  changes: string[];
  checks: WorkerClaimCheck[];
  howToTry: string;
  limitations: string;
  milestone: "YES" | "NO" | "UNCLEAR";
}

const TOTAL_CAP = 262_144;
const SUMMARY_CAP = 300;
const CHANGE_CAP = 500;
const CHANGES_COUNT_CAP = 50;
const CHECK_NAME_CAP = 200;
const CHECK_RESULT_CAP = 500;
const CHECKS_COUNT_CAP = 30;
const PROSE_CAP = 2_000;

function cappedString(value: unknown, cap: number): value is string {
  return typeof value === "string" && value.length <= cap;
}

/**
 * The worker's account of its own work, parsed fail-closed from the one
 * fenced cairn-claims block in its final message. Anything unexpected —
 * zero fences, two fences, non-JSON, unknown keys, oversized fields —
 * returns null, and the caller stops honestly instead of guessing.
 */
export function parseWorkerClaims(finalMessage: string | null): WorkerClaims | null {
  if (!finalMessage || finalMessage.length > TOTAL_CAP) return null;
  const fences = [...finalMessage.matchAll(/^```cairn-claims[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm)];
  if (fences.length !== 1) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fences[0][1]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const expected = ["changes", "checks", "disposition", "howToTry", "limitations", "milestone", "summary"];
  const keys = Object.keys(record).sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) return null;
  if (record.disposition !== "DONE" && record.disposition !== "STOPPED") return null;
  if (record.milestone !== "YES" && record.milestone !== "NO" && record.milestone !== "UNCLEAR") return null;
  if (!cappedString(record.summary, SUMMARY_CAP)) return null;
  if (!cappedString(record.howToTry, PROSE_CAP)) return null;
  if (!cappedString(record.limitations, PROSE_CAP)) return null;
  if (!Array.isArray(record.changes) || record.changes.length > CHANGES_COUNT_CAP ||
      !record.changes.every((entry) => cappedString(entry, CHANGE_CAP))) return null;
  if (!Array.isArray(record.checks) || record.checks.length > CHECKS_COUNT_CAP) return null;
  const checks: WorkerClaimCheck[] = [];
  for (const entry of record.checks) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const check = entry as Record<string, unknown>;
    const checkKeys = Object.keys(check).sort();
    if (checkKeys.length !== 2 || checkKeys[0] !== "name" || checkKeys[1] !== "result") return null;
    if (!cappedString(check.name, CHECK_NAME_CAP) || !cappedString(check.result, CHECK_RESULT_CAP)) return null;
    checks.push({ name: check.name, result: check.result });
  }
  return {
    disposition: record.disposition,
    summary: record.summary,
    changes: [...(record.changes as string[])],
    checks,
    howToTry: record.howToTry,
    limitations: record.limitations,
    milestone: record.milestone,
  };
}
