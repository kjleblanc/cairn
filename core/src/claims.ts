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

export const TASK_SPEC_WORKER_CLAIMS_VERSION = "cairn-task-spec-worker-claims/v1" as const;

export interface TaskSpecWorkerCriterionClaim {
  id: `c${number}`;
  result: string;
}

export interface TaskSpecWorkerPreferenceClaim {
  id: `p${number}`;
  result: string;
}

/** Worker-authored assertions only. None of these fields carries judge/source authority. */
export interface TaskSpecWorkerClaims {
  version: typeof TASK_SPEC_WORKER_CLAIMS_VERSION;
  taskSpecSha256: string;
  disposition: "DONE" | "STOPPED";
  summary: string;
  changes: readonly string[];
  criteria: readonly TaskSpecWorkerCriterionClaim[];
  preferences: readonly TaskSpecWorkerPreferenceClaim[];
  howToTry: string;
  limitations: string;
  milestone: "YES" | "NO" | "UNCLEAR";
}

export interface TaskSpecWorkerClaimsExpectation {
  taskSpecSha256: string;
  criterionIds: readonly `c${number}`[];
  preferenceIds: readonly `p${number}`[];
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

const TASK_SPEC_FORBIDDEN_RECORD_TEXT = /[\u0000\u202a-\u202e\u2066-\u2069]/u;

/** Keep the v4 parser and record mint on one text boundary. The legacy parser
 * deliberately retains its historical empty/control-character behavior. */
function taskSpecRecordString(value: unknown, cap: number, meaningful = false): value is string {
  return cappedString(value, cap)
    && (!meaningful || value.trim().length > 0)
    && !TASK_SPEC_FORBIDDEN_RECORD_TEXT.test(value);
}

const FENCE_OPENER = /^```cairn-claims[ \t]*$/;
const FENCE_CLOSER = /^```[ \t]*$/;

/**
 * Finds every `cairn-claims` fence in a message in one pass over its lines,
 * returning each fence's body text (joined with "\n").
 *
 * This replaces a line-anchored regex
 * (`/^```cairn-claims[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm`) that was
 * O(n^2): with no closer ahead, its lazy `[\s\S]*?` body group re-scanned
 * all the way to end-of-string from every opener line before giving up, and
 * a crafted message can have one opener per line. This line walk keeps the
 * exact same fence grammar (a line matching the opener while closed opens a
 * fence; a line matching the closer while open closes it; any other line
 * while open — including one that merely looks like another opener,
 * matching the old regex's lazy-match behavior — is body text; anything
 * while closed is prose; an unclosed trailing fence is discarded, just as
 * the old regex found no match for it) but does it in a single O(n) scan.
 */
function extractClaimsFences(message: string): string[] {
  const fences: string[] = [];
  let open = false;
  let body: string[] = [];
  for (const line of message.split(/\r?\n/)) {
    if (open) {
      if (FENCE_CLOSER.test(line)) {
        fences.push(body.join("\n"));
        open = false;
      } else {
        body.push(line);
      }
    } else if (FENCE_OPENER.test(line)) {
      open = true;
      body = [];
    }
  }
  return fences;
}

/**
 * The worker's account of its own work, parsed fail-closed from the one
 * fenced cairn-claims block in its final message. Anything unexpected —
 * zero fences, two fences, non-JSON, unknown keys, oversized fields —
 * returns null, and the caller stops honestly instead of guessing.
 */
export function parseWorkerClaims(finalMessage: string | null): WorkerClaims | null {
  if (!finalMessage || finalMessage.length > TOTAL_CAP) return null;
  // The line walk recognizes only \n and \r\n. A bare \r, U+2028, or U+2029
  // was a line boundary to the old multiline-regex parser and could hide a
  // second fence from this walk (fail-open). No real worker transport emits
  // them; reject the whole message instead of guessing.
  if (/\r(?!\n)|\u2028|\u2029/.test(finalMessage)) return null;
  const fences = extractClaimsFences(finalMessage);
  if (fences.length !== 1) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fences[0]);
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

function exactKeys(record: Readonly<Record<string, unknown>>, expected: readonly string[]): boolean {
  const keys = Reflect.ownKeys(record);
  if (keys.some((key) => typeof key !== "string")) return false;
  const sorted = [...(keys as string[])].sort();
  const wanted = [...expected].sort();
  if (sorted.length !== wanted.length || sorted.some((key, index) => key !== wanted[index])) return false;
  const descriptors = Object.getOwnPropertyDescriptors(record);
  return expected.every((key) => {
    const descriptor = descriptors[key];
    return Boolean(descriptor && !descriptor.get && !descriptor.set && "value" in descriptor && descriptor.enumerable);
  });
}

function safeExpectedIds(
  values: readonly string[],
  pattern: RegExp,
  cap: number,
): boolean {
  if (!Array.isArray(values) || values.length > cap) return false;
  const seen = new Set<string>();
  return values.every((value) => typeof value === "string" && pattern.test(value)
    && !seen.has(value) && Boolean(seen.add(value)));
}

function parseTaskSpecClaimRows<T extends `c${number}` | `p${number}`>(
  value: unknown,
  expectedIds: readonly T[],
): ReadonlyArray<Readonly<{ id: T; result: string }>> | null {
  if (!Array.isArray(value) || value.length !== expectedIds.length) return null;
  const rows: Readonly<{ id: T; result: string }>[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const prototype = Object.getPrototypeOf(entry);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const row = entry as Readonly<Record<string, unknown>>;
    if (!exactKeys(row, ["id", "result"]) || row.id !== expectedIds[index]
      || !taskSpecRecordString(row.result, CHECK_RESULT_CAP)) return null;
    rows.push(Object.freeze({ id: row.id as T, result: row.result }));
  }
  return Object.freeze(rows);
}

/**
 * Parse the one versioned Task-Spec claims fence against Main's exact expected
 * digest and ordered cN/pN ids. Unknown, missing, duplicate, reordered, or
 * authority-looking fields fail closed; returned rows remain worker claims.
 */
export function parseTaskSpecWorkerClaims(
  finalMessage: string | null,
  expectation: TaskSpecWorkerClaimsExpectation,
): TaskSpecWorkerClaims | null {
  try {
    if (!finalMessage || finalMessage.length > TOTAL_CAP || /\r(?!\n)|\u2028|\u2029/.test(finalMessage)) return null;
    if (!expectation || typeof expectation !== "object" || Array.isArray(expectation)
      || !/^[a-f0-9]{64}$/.test(expectation.taskSpecSha256)
      || !safeExpectedIds(expectation.criterionIds, /^c(?:[1-9]|1[0-2])$/, 12)
      || !safeExpectedIds(expectation.preferenceIds, /^p(?:[1-9]|1[0-2])$/, 12)) return null;
    const fences = extractClaimsFences(finalMessage);
    if (fences.length !== 1) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(fences[0]);
    } catch {
      return null;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const prototype = Object.getPrototypeOf(parsed);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const record = parsed as Readonly<Record<string, unknown>>;
    const expected = [
      "changes", "criteria", "disposition", "howToTry", "limitations", "milestone",
      "preferences", "summary", "taskSpecSha256", "version",
    ];
    if (!exactKeys(record, expected) || record.version !== TASK_SPEC_WORKER_CLAIMS_VERSION
      || record.taskSpecSha256 !== expectation.taskSpecSha256
      || (record.disposition !== "DONE" && record.disposition !== "STOPPED")
      || (record.milestone !== "YES" && record.milestone !== "NO" && record.milestone !== "UNCLEAR")
      || !taskSpecRecordString(record.summary, SUMMARY_CAP, true)
      || !taskSpecRecordString(record.howToTry, PROSE_CAP, true)
      || !taskSpecRecordString(record.limitations, PROSE_CAP)
      || !Array.isArray(record.changes) || record.changes.length > CHANGES_COUNT_CAP
      || !record.changes.every((entry) => taskSpecRecordString(entry, CHANGE_CAP))) return null;
    const criteria = parseTaskSpecClaimRows(record.criteria, expectation.criterionIds);
    const preferences = parseTaskSpecClaimRows(record.preferences, expectation.preferenceIds);
    if (!criteria || !preferences) return null;
    return Object.freeze({
      version: TASK_SPEC_WORKER_CLAIMS_VERSION,
      taskSpecSha256: record.taskSpecSha256,
      disposition: record.disposition,
      summary: record.summary,
      changes: Object.freeze([...(record.changes as string[])]),
      criteria,
      preferences,
      howToTry: record.howToTry,
      limitations: record.limitations,
      milestone: record.milestone,
    }) as TaskSpecWorkerClaims;
  } catch {
    return null;
  }
}
