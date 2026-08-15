import {
  composeSerialCritiquePacket,
  parseSerialCritiqueOutput,
  serialCritiquePreview,
  serialCritiqueRequestBody,
  type SerialCritiqueCandidateFactsV1,
  type SerialCritiquePacketV1,
  type SerialTaskPromiseAnswerV1,
} from "@cairn/core";

import { postChatCompletions } from "./conductor/transports/openai-compatible.js";
import { canonicalProjectKey } from "./conductor/turnauth.js";
import {
  CANDIDATE_CRITIQUE_CREDENTIAL_TEXT,
  CANDIDATE_CRITIQUE_LIMIT_TEXT,
  CANDIDATE_CRITIQUE_NOT_SENT,
  CANDIDATE_CRITIQUE_PURPOSE_TEXT,
  CANDIDATE_CRITIQUE_VERSION,
  parseCandidateCritiqueDecisionRequest,
  type CandidateCritiqueDisclosureV1,
  type CandidateCritiqueProjectionV1,
  type CandidateCritiqueStateV1,
} from "../shared/critique.js";

/**
 * Task 240: the critic's half of the unsealed-candidate pause.
 *
 * Cairn offers one inspection while the run is already stopped and waiting, and
 * makes at most one request for it. This module owns that offer and nothing
 * else. It writes no file, runs no command, and settles no pause: the candidate
 * card still owns the owner's two real choices, and Core still owns the
 * terminal truth.
 *
 * The one property worth guarding is spend. An approval is consumed the instant
 * it is accepted, before the request goes out, so a duplicate press, a stale
 * press, or a press for another project's checkpoint can never buy a second
 * call. Every failure - no connection, a refused status, unreadable output, a
 * critic that tried to invent a row - ends as one honest `unavailable`. There
 * is no retry anywhere in this file, and no fallback to a second route.
 */

const PENDING_LIMIT = 64;

export type CandidateCritiqueConnectionV1 = Readonly<{
  provider: string;
  baseUrl: string;
  model: string;
}>;

export type CandidateCritiqueDepsV1 = Readonly<{
  fetchImpl: typeof fetch;
  /** Read at call time, used only as the Authorization header, never stored. */
  credential: () => string;
  signal?: AbortSignal;
}>;

type Held = {
  projectKey: string;
  checkpointId: string;
  state: CandidateCritiqueStateV1;
  disclosure: CandidateCritiqueDisclosureV1 | null;
  packet: SerialCritiquePacketV1 | null;
  connection: CandidateCritiqueConnectionV1 | null;
  /** Flipped before the request leaves, so one offer can buy only one call. */
  spent: boolean;
  projection: CandidateCritiqueProjectionV1;
};

const held = new Map<string, Held>();

function projectKey(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 4_000) return null;
  try { return canonicalProjectKey(value); } catch { return null; }
}

function project(entry: Held, patch: Partial<{
  state: CandidateCritiqueStateV1;
  findings: CandidateCritiqueProjectionV1["findings"];
  notes: readonly string[];
  unavailableReason: string | null;
}>): CandidateCritiqueProjectionV1 {
  const next = Object.freeze({
    version: CANDIDATE_CRITIQUE_VERSION,
    checkpointId: entry.checkpointId,
    state: patch.state ?? entry.projection.state,
    disclosure: entry.disclosure,
    findings: patch.findings ?? entry.projection.findings,
    notes: patch.notes ?? entry.projection.notes,
    unavailableReason: patch.unavailableReason ?? null,
  });
  entry.projection = next;
  entry.state = next.state;
  return next;
}

/**
 * Open the one offer this project may hold, alongside its pause.
 *
 * A run with no frozen rows gets no offer at all: there would be nothing for a
 * finding to name, so every answer would be advisory and the card would promise
 * something it cannot deliver. A project with no connected provider gets an
 * `unavailable` offer rather than silence, because "Cairn cannot ask anyone"
 * is a thing the owner should read rather than infer.
 */
export function openCandidateCritique(input: {
  dir: string;
  checkpointId: string;
  answers: readonly SerialTaskPromiseAnswerV1[];
  facts: SerialCritiqueCandidateFactsV1;
  connection: CandidateCritiqueConnectionV1 | null;
}): CandidateCritiqueProjectionV1 | null {
  const key = projectKey(input.dir);
  if (key === null || held.has(key) || held.size >= PENDING_LIMIT) return null;
  if (typeof input.checkpointId !== "string" || input.checkpointId.length === 0) return null;

  const packet = composeSerialCritiquePacket(input.answers, input.facts);
  if (packet === null) return null;

  const connection = input.connection;
  let disclosure: CandidateCritiqueDisclosureV1 | null = null;
  if (connection !== null) {
    const preview = serialCritiquePreview(packet);
    disclosure = Object.freeze({
      provider: connection.provider,
      baseUrl: connection.baseUrl,
      model: connection.model,
      rowIds: preview.rowIds,
      artifacts: preview.artifacts,
      files: preview.files,
      totalCharacters: preview.totalCharacters,
      purpose: CANDIDATE_CRITIQUE_PURPOSE_TEXT,
      notSent: CANDIDATE_CRITIQUE_NOT_SENT,
      credentialText: CANDIDATE_CRITIQUE_CREDENTIAL_TEXT,
      limitText: CANDIDATE_CRITIQUE_LIMIT_TEXT,
    });
  }

  const state: CandidateCritiqueStateV1 = connection === null ? "unavailable" : "offered";
  const entry: Held = {
    projectKey: key,
    checkpointId: input.checkpointId,
    state,
    disclosure,
    packet,
    connection,
    spent: connection === null,
    projection: Object.freeze({
      version: CANDIDATE_CRITIQUE_VERSION,
      checkpointId: input.checkpointId,
      state,
      disclosure,
      findings: Object.freeze([]),
      notes: Object.freeze([]),
      unavailableReason: connection === null ? "CRITIQUE_NO_CONNECTION" : null,
    }),
  };
  held.set(key, entry);
  return entry.projection;
}

/** Output only. */
export function currentCandidateCritique(dir: string): CandidateCritiqueProjectionV1 | null {
  const key = projectKey(dir);
  return key === null ? null : held.get(key)?.projection ?? null;
}

export const CANDIDATE_CRITIQUE_REFUSALS = Object.freeze([
  "CANDIDATE_CRITIQUE_MALFORMED_DECISION",
  "CANDIDATE_CRITIQUE_UNKNOWN_CHECKPOINT",
  "CANDIDATE_CRITIQUE_ALREADY_DECIDED",
] as const);

export type CandidateCritiqueRefusal = typeof CANDIDATE_CRITIQUE_REFUSALS[number];

export type CandidateCritiqueDecisionOutcome =
  | Readonly<{ ok: true; projection: CandidateCritiqueProjectionV1 }>
  | Readonly<{ ok: false; code: CandidateCritiqueRefusal }>;

const refuse = (code: CandidateCritiqueRefusal): CandidateCritiqueDecisionOutcome =>
  Object.freeze({ ok: false, code } as const);

/**
 * Answer the offer.
 *
 * `skip` spends nothing. `approve` spends the one call, and does so by marking
 * the offer consumed BEFORE the request is built, so that every path out of
 * here - including a thrown transport, a rejected status, and unreadable output
 * - leaves an offer that can never be pressed again.
 *
 * Nothing thrown here escapes: this runs beside a Core runner that is blocked
 * on the pause with no catch of its own, so an exception reaching it would
 * strand the run holding its lock. Every failure becomes a reported state.
 */
export async function decideCandidateCritique(
  value: unknown,
  deps: CandidateCritiqueDepsV1,
): Promise<CandidateCritiqueDecisionOutcome> {
  const request = parseCandidateCritiqueDecisionRequest(value);
  if (request === null) return refuse("CANDIDATE_CRITIQUE_MALFORMED_DECISION");

  const key = projectKey(request.dir);
  const entry = key === null ? undefined : held.get(key);
  if (entry === undefined || entry.checkpointId !== request.checkpointId) {
    return refuse("CANDIDATE_CRITIQUE_UNKNOWN_CHECKPOINT");
  }
  if (entry.spent) return refuse("CANDIDATE_CRITIQUE_ALREADY_DECIDED");

  if (request.action === "skip") {
    entry.spent = true;
    return Object.freeze({ ok: true, projection: project(entry, { state: "declined" }) } as const);
  }

  // Consumed before anything leaves the machine. A second press from a
  // double-click, a replayed message, or a second window now refuses.
  entry.spent = true;
  const packet = entry.packet;
  const connection = entry.connection;
  if (packet === null || connection === null) {
    return Object.freeze({
      ok: true,
      projection: project(entry, { state: "unavailable", unavailableReason: "CRITIQUE_NO_CONNECTION" }),
    } as const);
  }

  const unavailable = (reason: string): CandidateCritiqueDecisionOutcome => Object.freeze({
    ok: true,
    projection: project(entry, { state: "unavailable", unavailableReason: reason }),
  } as const);

  let raw: string;
  try {
    const response = await postChatCompletions({
      baseUrl: connection.baseUrl,
      apiKey: deps.credential(),
      body: serialCritiqueRequestBody(connection.model, packet),
      ...(deps.signal ? { signal: deps.signal } : {}),
      fetchImpl: deps.fetchImpl,
    });
    if (!response.ok) return unavailable("CRITIQUE_REQUEST_REFUSED");
    const payload = await response.json() as unknown;
    const content = readContent(payload);
    if (content === null) return unavailable("CRITIQUE_RESPONSE_UNREADABLE");
    raw = content;
  } catch {
    // Redacted on purpose: a transport error can carry a URL with a token in
    // it, and this string reaches the screen.
    return unavailable("CRITIQUE_REQUEST_FAILED");
  }

  const outcome = parseSerialCritiqueOutput(packet, raw);
  if (outcome.state !== "answered") return unavailable(outcome.reason);

  return Object.freeze({
    ok: true,
    projection: project(entry, {
      state: "answered",
      findings: Object.freeze(outcome.findings.map((finding) => Object.freeze({
        checkId: finding.checkId as string,
        judgment: finding.judgment,
        observation: finding.observation,
        evidenceRefs: finding.evidenceRefs,
      }))),
      notes: Object.freeze(outcome.notes.map((note) => note.text)),
    }),
  } as const);
}

/** The provider's answer, read at exactly one place and no deeper. */
function readContent(payload: unknown): string | null {
  if (payload === null || typeof payload !== "object") return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0] as { message?: { content?: unknown } } | null;
  const content = first?.message?.content;
  return typeof content === "string" ? content : null;
}

/** Cleared with the pause it belongs to, so no press can outlive its run. */
export function closeCandidateCritique(dir: string, checkpointId: string): void {
  const key = projectKey(dir);
  if (key === null) return;
  const entry = held.get(key);
  if (entry !== undefined && entry.checkpointId === checkpointId) held.delete(key);
}

export function _resetCandidateCritiquesForTests(): void {
  held.clear();
}
