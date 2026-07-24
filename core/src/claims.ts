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
