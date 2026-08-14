import type { TaskRequestView } from "@cairn/core";

/**
 * The unsealed candidate, as the owner's screen sees it.
 *
 * Cairn pauses here after the worker has really changed files and Cairn has
 * really checked them, but before it writes a report, a log row, a commit, or
 * a result. The owner reads what happened and says whether Cairn may finish.
 *
 * This is a DISPLAY projection, not an authority. It carries no project path,
 * no lock, no adapter, and no capability, because answering it grants nothing:
 * "continue" only lets the still-open run reach the same close it would have
 * reached on its own. That is why there is no receipt, hash, or grant here —
 * there is no spend or irreversible effect for one to protect.
 *
 * `checkpointId` exists for one reason: to say WHICH pause is being answered,
 * so a stale press left over from an earlier run cannot answer a live one.
 */

export const UNSEALED_CANDIDATE_VERSION = "cairn-unsealed-candidate/v1" as const;

export const UNSEALED_CANDIDATE_CHOICES = Object.freeze(["continue", "stop"] as const);

export type UnsealedCandidateChoice = typeof UNSEALED_CANDIDATE_CHOICES[number];

export type UnsealedCandidateProjectionV1 = Readonly<{
  version: typeof UNSEALED_CANDIDATE_VERSION;
  /** One-use, Main-owned identity for this exact pause. Not authority. */
  checkpointId: string;
  taskNumber: number;
  /** Output-only projection of the request this run accepted. */
  acceptedRequest: TaskRequestView;
  /** Inert notes kept with that request; never owner-attributed requirements. */
  requestContext: readonly string[];
  /** The worker Cairn actually dispatched, named so the claims below have an
   * author the owner can see. */
  adapterLabel: string;
  /** From Git, never from the worker's claims. Includes Cairn's own task brief,
   * because at this moment the brief is genuinely one of the changed paths —
   * the same answer the final result card will give. */
  changedPaths: readonly string[];
  /**
   * The worker speaking, or null when it left nothing Cairn could read. Every
   * surface that shows this must attribute it to the worker.
   *
   * `disposition` is the worker's own verdict on its work, and it is normally
   * "DONE" at this moment. That is exactly the tension the candidate exists to
   * show: the worker says it finished, and Cairn has not agreed yet. Hiding it
   * would make the pause look like Cairn's doubt rather than the worker's
   * unverified claim.
   *
   * Declared inline rather than imported, matching `ResultCard`: this shape
   * crosses into the renderer, so it is written where it is read.
   */
  claims: Readonly<{
    disposition: string;
    summary: string;
    changes: readonly string[];
    checks: readonly Readonly<{ name: string; result: string }>[];
    howToTry: string;
    limitations: string;
    milestone: string;
  }> | null;
  evidenceSummary: string | null;
  /**
   * Task 238: every promise the owner accepted, answered in three separate
   * fields so the screen can never blur them together. `cairn` is what Cairn
   * itself ran; `worker` is the worker's sentence and belongs to the worker;
   * `owner` is the owner's own judgment and starts `pending` — this card is
   * where they answer it. Empty when the run carried no promises.
   */
  promises: readonly UnsealedCandidatePromiseView[];
  choices: readonly UnsealedCandidateChoice[];
}>;

export type UnsealedCandidatePromiseView = Readonly<{
  id: string;
  text: string;
  source: string;
  /** Who owes this row's answer. */
  answeredBy: "cairn" | "owner";
  /** Cairn's own finding, or null when it has none (owner rows always null). */
  cairn: Readonly<{
    label: string;
    command: string;
    status: "passed" | "failed" | "unfinished";
    durationMs: number;
  }> | null;
  /** The worker's own words for this row, attributed wherever shown. */
  worker: string | null;
  owner: UnsealedCandidateOwnerAnswer | "pending";
}>;

export const UNSEALED_CANDIDATE_OWNER_ANSWERS = Object.freeze(["met", "not-met"] as const);

export type UnsealedCandidateOwnerAnswer = typeof UNSEALED_CANDIDATE_OWNER_ANSWERS[number];

/** The only shape the renderer may send back. */
export type UnsealedCandidateDecisionRequest = {
  dir: string;
  checkpointId: string;
  choice: UnsealedCandidateChoice;
  /** The owner's judgment per row id. Rows left out stay unanswered, which
   * cannot seal — an omission is never read as approval. */
  ownerAnswers: Readonly<Record<string, UnsealedCandidateOwnerAnswer>>;
};

export type UnsealedCandidateDecisionV1 = Readonly<{
  version: typeof UNSEALED_CANDIDATE_VERSION;
  checkpointId: string;
  choice: UnsealedCandidateChoice;
  ownerAnswers: Readonly<Record<string, UnsealedCandidateOwnerAnswer>>;
}>;

const CHECKPOINT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export function isUnsealedCandidateChoice(value: unknown): value is UnsealedCandidateChoice {
  return typeof value === "string"
    && (UNSEALED_CANDIDATE_CHOICES as readonly string[]).includes(value);
}

/**
 * Exact keys only. An extra property means the sender is not the surface this
 * channel was built for, so the press is refused rather than partially read.
 */
export function parseUnsealedCandidateDecisionRequest(
  value: unknown,
): UnsealedCandidateDecisionRequest | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  if (keys.join("\0") !== "checkpointId\0choice\0dir\0ownerAnswers") return null;
  const { dir, checkpointId, choice, ownerAnswers } = value as Record<string, unknown>;
  if (typeof dir !== "string" || dir.length === 0 || dir.length > 4_000) return null;
  if (typeof checkpointId !== "string" || !CHECKPOINT_ID.test(checkpointId)) return null;
  if (!isUnsealedCandidateChoice(choice)) return null;
  const answers = parseOwnerAnswers(ownerAnswers);
  if (answers === null) return null;
  return { dir, checkpointId, choice, ownerAnswers: answers };
}

const ROW_ID = /^c[1-9][0-9]{0,2}$/u;
const OWNER_ANSWER_CAP = 32;

/**
 * Row ids only, and only the two real answers. An unrecognised word is refused
 * outright rather than dropped, because a press Cairn cannot read exactly is
 * not a press it should act on.
 */
function parseOwnerAnswers(
  value: unknown,
): Readonly<Record<string, UnsealedCandidateOwnerAnswer>> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > OWNER_ANSWER_CAP) return null;
  const answers: Record<string, UnsealedCandidateOwnerAnswer> = {};
  for (const [id, answer] of entries) {
    if (!ROW_ID.test(id)) return null;
    if (answer !== "met" && answer !== "not-met") return null;
    answers[id] = answer;
  }
  return Object.freeze(answers);
}
