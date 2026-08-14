/**
 * Fixed codes, said in words the owner can read.
 *
 * A fixed code is a fact the owner cannot read. This is not hypothetical:
 * `app/shots/task-168-stopped-desktop.png` — a capture this repository made
 * and never showed the owner — has a shipped result card reading
 * "STOPPED — CANCELLED_BY_OWNER" in front of a self-described beginner.
 *
 * Every code the owner can see gets one plain clause. The code itself is still
 * shown, demoted to a quiet second line: it is useful in the record and to
 * anyone debugging, and deleting it would lose a real fact. It simply never
 * arrives alone.
 *
 * `errorCode` is NOT a closed set — `main/conductor/relay.ts` assigns any
 * SCREAMING_CASE head matching its fixed-code shape — so an unrecognized code
 * must still produce a sentence rather than being echoed raw.
 *
 * The `SerialStopReason` values are mirrored by `STOP_REASON_IN_PLAIN_WORDS`
 * in `core/src/records.ts`, which writes the same facts into the report;
 * `core/test/records.test.ts` asserts the two never disagree. Two copies exist
 * deliberately: the renderer imports `@cairn/core` for types only, and this
 * must not become its first runtime import.
 */
export const KNOWN_CODE_WORDS: Readonly<Record<string, string>> = {
  // core: SerialStopReason
  ADAPTER_FAILED: "the worker program itself did not run",
  INVALID_ADAPTER_RESULT: "the worker finished, but its answer could not be read",
  PROTECTED_WORK_CHANGED: "work that was meant to stay untouched had changed",
  RECORD_VERIFICATION_FAILED: "Cairn could not confirm its own records were written correctly",
  WORKER_CLAIMS_MISSING: "the worker never said what it had done",
  REAL_MODEL_CALL_NOT_AUTHORIZED: "the run was not approved to make a real, paid call",
  MODEL_REPORTED_STOPPED: "the worker stopped itself and said why",
  MODEL_RESULT_NOT_VERIFIED: "the change could not be confirmed against a saved history",
  Q9_CRITIC_CALLS_EXHAUSTED: "the required critic did not return a usable result within its allowed calls and one retry",
  Q9_REQUIRED_CHECK_STILL_FAILED: "an original required check still failed after the repair",
  Q9_NATIVE_BOUNDARY_STOPPED: "an independent safety boundary required this task to stop",
  Q9_REQUIRED_EVIDENCE_INCOMPLETE: "the required evidence was not complete enough to verify the result",
  Q9_WORKFLOW_VERIFICATION_FAILED: "Cairn could not safely verify the guarded quality workflow",
  ADAPTER_TIMED_OUT: "the worker ran out of time",
  CANCELLED_BY_OWNER: "you stopped it yourself",
  OWNER_STOPPED_AT_CANDIDATE: "you looked at the worker's changes and kept them without finishing the task",
  TASK_PROMISE_NOT_MET: "at least one thing this task promised was not shown to be done",
  // app-side closes
  CONNECTION_REQUIRED: "no assistant is connected yet, so nothing could run",
  CONDUCTOR_CONNECT_NOT_AUTHORIZED: "connecting was not approved, so it did not happen",
  CONDUCTOR_OAUTH_NOT_AUTHORIZED: "signing in was not approved, so it did not happen",
  CONDUCTOR_CONSENT_REQUIRED: "your saved assistant is paused until you review Cairn's updated sharing permission",
};

const UNKNOWN = "it stopped for a reason Cairn has no plain description for";

/**
 * Returns null only when there is no code at all. Never returns the code
 * itself, and never reaches the prototype chain — `Object.hasOwn` rather than
 * `in`, so a code named `constructor` cannot resolve to a function.
 */
export function codeInPlainWords(code: string | null): string | null {
  if (code === null) return null;
  return Object.hasOwn(KNOWN_CODE_WORDS, code) ? KNOWN_CODE_WORDS[code]! : UNKNOWN;
}
