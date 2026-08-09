import {
  TASK_CALL_BUDGET_V1,
  composeCriticAssessmentCustody,
  consumeCriticCallAuthorization,
  criticCallAuthorizationCoversRequest,
  criticCallAuthorizationSha256,
  criticCallRequestBody,
  criticCallRequestBodyAuthorized,
  type CriticAssessmentCustodyV1,
  type CriticCallAuthorizationV1,
} from "@cairn/core";

import { postChatCompletions } from "./conductor/transports/openai-compatible.js";
import { ConductorHttpError } from "./conductor/transports/types.js";

/**
 * The one-shot, tool-free critic send.
 *
 * Core decides what the critic is asked (`CriticRequestV1`) and which call is
 * approved (`CriticCallAuthorizationV1`), and Core composes the outgoing body.
 * This module owns exactly one thing Core cannot: the send itself. It binds a
 * send to one specific approval, spends that approval before the request
 * leaves, and refuses a second send of the same approved call even when a
 * caller re-composes an identical authorization.
 *
 * It builds no request body, adds no message, exposes no tool, function, or
 * filesystem channel, and opens no endpoint the authorization did not name.
 */

/** This wrapper, not the conversation transport it shares a primitive with. An
 * authorization records the transport that will send it, so a change here must
 * move this string and refuse approvals minted for the older behavior. */
export const CRITIC_TRANSPORT_REVISION = "openai-compatible-critic/v1" as const;

/** Provider-reported strings are bounded before they are kept, under the same
 * shape rules Core applies to recorded prose: no control, bidi, or zero-width
 * characters, and no drive path or dangerous scheme. A provider does not get to
 * put 256 characters of its own choosing into a fact Cairn keeps and renders. */
const PROVIDER_TEXT_LIMIT = 256;
const PROVIDER_TEXT_FORBIDDEN = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/u;
const PROVIDER_TEXT_DRIVE_PATH = /^[A-Za-z]:[\\/]/u;
const PROVIDER_TEXT_SCHEME = /^(?:data|file|ftp|https?|javascript):/iu;
/** Bounded so a later stage cannot accumulate a provider-steered Infinity.
 * Far above any real critic call. */
const PROVIDER_COUNT_LIMIT = 1_000_000_000;

/**
 * One process's record of which approved calls have already been sent.
 *
 * Task 216 could make an authorization object single-use but could not stop a
 * caller from composing an identical one and sending again: the digest is a
 * pure function of the request and the route facts. This is where an *attempt*
 * becomes spent. It is deliberately module-private — a ledger a caller could
 * supply would be a ledger a caller could empty.
 *
 * It is bounded and refuses when full rather than evicting, because evicting
 * the oldest entry is exactly how a replay would get through. Durable spend
 * across a restart belongs to the pending-run journal, not here.
 */
export const SPENT_CALL_LEDGER_LIMIT = 512;
const spentCalls = new Set<string>();

export const CRITIC_CALL_REFUSAL_CODES = Object.freeze([
  "CRITIC_CALL_AUTHORIZATION_INVALID",
  "CRITIC_CALL_REQUEST_MISMATCH",
  "CRITIC_CALL_TRANSPORT_REVISION_MISMATCH",
  "CRITIC_CALL_BODY_NOT_AUTHORIZED",
  "CRITIC_CALL_CREDENTIAL_UNUSABLE",
  "CRITIC_CALL_ALREADY_SPENT",
  "CRITIC_CALL_LEDGER_FULL",
  "CRITIC_CALL_CANCELLED_BEFORE_SEND",
] as const);

export const CRITIC_CALL_UNAVAILABLE_CODES = Object.freeze([
  "CRITIC_CALL_REDIRECTED",
  "CRITIC_CALL_HTTP_ERROR",
  "CRITIC_CALL_NETWORK_ERROR",
  "CRITIC_CALL_TIMED_OUT",
  "CRITIC_CALL_CANCELLED",
  "CRITIC_CALL_OUTPUT_TOO_LARGE",
  "CRITIC_CALL_MALFORMED_RESPONSE",
  "CRITIC_CALL_MODEL_MISMATCH",
  "CRITIC_CALL_CREDENTIAL_ECHOED",
  "CRITIC_CALL_CLOCK_UNUSABLE",
  "CRITIC_CALL_CUSTODY_UNAVAILABLE",
] as const);

export type CriticCallRefusalCode = typeof CRITIC_CALL_REFUSAL_CODES[number];
export type CriticCallUnavailableCode = typeof CRITIC_CALL_UNAVAILABLE_CODES[number];

/** Every owner-facing sentence is a literal here. Provider text never becomes
 * owner text, so a provider cannot write Cairn's explanation of its own call. */
const OWNER_MESSAGES: Readonly<Record<CriticCallRefusalCode | CriticCallUnavailableCode, string>> = Object.freeze({
  CRITIC_CALL_AUTHORIZATION_INVALID: "Cairn had no approved critic call to send, so it sent nothing.",
  CRITIC_CALL_REQUEST_MISMATCH: "That approval was not for this critic request, so Cairn sent nothing.",
  CRITIC_CALL_TRANSPORT_REVISION_MISMATCH: "That approval was for a different sending path, so Cairn sent nothing.",
  CRITIC_CALL_BODY_NOT_AUTHORIZED: "Cairn could not confirm the exact approved request, so it sent nothing.",
  CRITIC_CALL_CREDENTIAL_UNUSABLE: "The saved provider key cannot be used as written. Reconnect with a fresh key.",
  CRITIC_CALL_ALREADY_SPENT: "That critic call was already made. Cairn did not repeat it.",
  CRITIC_CALL_LEDGER_FULL: "Cairn has tracked as many critic calls as it can this session, so it stopped rather than risk repeating a call you already paid for.",
  CRITIC_CALL_CANCELLED_BEFORE_SEND: "The critic call was stopped before Cairn sent it, so nothing was sent and nothing was spent.",
  CRITIC_CALL_REDIRECTED: "The provider redirected Cairn's request. Cairn stopped before sending it anywhere else.",
  CRITIC_CALL_HTTP_ERROR: "The provider did not answer the critic call.",
  CRITIC_CALL_NETWORK_ERROR: "Cairn could not reach the provider for the critic call.",
  CRITIC_CALL_TIMED_OUT: "The critic call ran past its time limit and was stopped.",
  CRITIC_CALL_CANCELLED: "The critic call was stopped before an answer arrived.",
  CRITIC_CALL_OUTPUT_TOO_LARGE: "The provider's answer was larger than Cairn can safely read, so it stopped reading it.",
  CRITIC_CALL_MALFORMED_RESPONSE: "The provider's answer was not in the expected shape, so Cairn kept none of it.",
  CRITIC_CALL_MODEL_MISMATCH: "A different model answered than the one approved, so Cairn kept none of it.",
  CRITIC_CALL_CREDENTIAL_ECHOED: "The provider's answer repeated Cairn's saved key, so Cairn kept none of it. Reconnect with a fresh key.",
  CRITIC_CALL_CLOCK_UNUSABLE: "Cairn could not stamp the time the critic answered, so it kept none of it.",
  CRITIC_CALL_CUSTODY_UNAVAILABLE: "Cairn could not record who answered the critic call, so it kept none of it.",
});

export type CriticCallUsageV1 = Readonly<{
  promptTokens: number | null;
  completionTokens: number | null;
  costUsd: number | null;
}>;

export type CriticCallResultV1 =
  | Readonly<{
      kind: "refused";
      sent: false;
      code: CriticCallRefusalCode;
      ownerMessage: string;
    }>
  | Readonly<{
      kind: "unavailable";
      sent: true;
      code: CriticCallUnavailableCode;
      status: number | null;
      ownerMessage: string;
    }>
  | Readonly<{
      kind: "answered";
      sent: true;
      rawOutput: string;
      custody: CriticAssessmentCustodyV1;
      providerReportedModel: string | null;
      finishReason: string | null;
      requestId: string | null;
      usage: CriticCallUsageV1;
    }>;

export type CriticCallInput = Readonly<{
  /** The branded `CriticRequestV1` the authorization was minted from. */
  request: unknown;
  /** The branded `CriticCallAuthorizationV1` naming the one approved call. */
  authorization: unknown;
  /** Used only as this request's Authorization header. Never recorded. */
  apiKey: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}>;

function refused(code: CriticCallRefusalCode): CriticCallResultV1 {
  return Object.freeze({ kind: "refused", sent: false, code, ownerMessage: OWNER_MESSAGES[code] } as const);
}

function unavailable(code: CriticCallUnavailableCode, status: number | null = null): CriticCallResultV1 {
  return Object.freeze({ kind: "unavailable", sent: true, code, status, ownerMessage: OWNER_MESSAGES[code] } as const);
}

/**
 * A credential goes into a header, and a header value is the one place a key is
 * used at all. A newline in one is a header injection. A code point above
 * U+00FF cannot be encoded as a header value at all: the platform throws while
 * building the request, which would happen *after* the approval was spent and
 * would be reported as a network failure the owner never had. Refuse it here,
 * before anything is spent.
 */
function usableCredential(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 4_096 || value.trim() !== value) return false;
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit > 0xff || unit < 0x21 || unit === 0x7f) return false;
  }
  return true;
}

/** A provider must not be able to get Cairn to write the saved key back into a
 * record by echoing it. Applied to every value that is kept, after parsing, so
 * a JSON \\uXXXX escape cannot smuggle it past a raw-text screen. */
function echoesCredential(value: string | null, apiKey: string): boolean {
  return value !== null && value.includes(apiKey);
}

/** Read through a call, not a property access: `aborted` flips during the
 * request, and narrowing it once would make every later read a constant. */
function aborted(signal: AbortSignal | undefined): boolean {
  return signal !== undefined && signal.aborted;
}

function providerText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= PROVIDER_TEXT_LIMIT
    && !PROVIDER_TEXT_FORBIDDEN.test(value)
    && !PROVIDER_TEXT_DRIVE_PATH.test(value)
    && !PROVIDER_TEXT_SCHEME.test(value)
    ? value
    : null;
}

function providerCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0)
    && value >= 0 && value <= PROVIDER_COUNT_LIMIT
    ? value
    : null;
}

function providerTokenCount(value: unknown): number | null {
  const count = providerCount(value);
  return count === null || !Number.isSafeInteger(count) ? null : count;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/**
 * Read the whole answer, stopping at the approved ceiling.
 *
 * The ceiling is taken in **bytes**, which is the stricter of the two limits
 * this call carries: `maxOutputCharacters` counts UTF-16 units while the frozen
 * budget's `maxCriticCapturedOutputBytes` counts bytes, and a UTF-8 encoding is
 * never shorter than the UTF-16 unit count of the same text. Bounding the bytes
 * therefore bounds the characters, and one number can enforce both.
 */
type BoundedRead =
  | Readonly<{ kind: "read"; text: string }>
  | Readonly<{ kind: "too-large" }>
  | Readonly<{ kind: "failed" }>;

async function readBounded(body: ReadableStream<Uint8Array>, capBytes: number): Promise<BoundedRead> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // An empty chunk carries nothing to count, so retaining it would grow
      // the buffer without ever reaching the ceiling. The call deadline is
      // what bounds an endless stream of them.
      if (value === undefined || value.byteLength === 0) continue;
      bytes += value.byteLength;
      // Checked before retaining, so the buffer never exceeds the ceiling.
      if (bytes > capBytes) return Object.freeze({ kind: "too-large" } as const);
      chunks.push(value);
    }
  } catch {
    return Object.freeze({ kind: "failed" } as const);
  } finally {
    // Releasing the connection must not turn an over-large answer into a
    // network failure, so a refusing cancel is swallowed exactly as the
    // conversation transport already swallows its own.
    try {
      await reader.cancel();
    } catch {
      /* releasing the body must not mask why Cairn stopped reading */
    }
    reader.releaseLock();
  }
  return Object.freeze({ kind: "read", text: new TextDecoder("utf-8").decode(Buffer.concat(chunks)) } as const);
}

export async function sendCriticCall(input: CriticCallInput): Promise<CriticCallResultV1> {
  // Read every caller-supplied value exactly once. `input` is an ordinary
  // object from a caller: an accessor could otherwise return a benign
  // credential to the guard and the real one to the wire, and a second read of
  // `request` or `signal` could disagree with the one that was checked.
  const { request, authorization: offered, apiKey, signal: callerSignal, fetchImpl: callerFetch, now } = input;

  // Brandedness first, and by a check that survives the spend, so a second send
  // of the same object is reported as the already-made call it is rather than
  // as an approval that never existed.
  if (criticCallAuthorizationSha256(offered) === null) return refused("CRITIC_CALL_AUTHORIZATION_INVALID");
  const authorization = offered as CriticCallAuthorizationV1;
  if (!criticCallAuthorizationCoversRequest(authorization, request)) {
    return refused("CRITIC_CALL_REQUEST_MISMATCH");
  }
  if (authorization.transportRevision !== CRITIC_TRANSPORT_REVISION) {
    return refused("CRITIC_CALL_TRANSPORT_REVISION_MISMATCH");
  }
  if (!usableCredential(apiKey)) return refused("CRITIC_CALL_CREDENTIAL_UNUSABLE");
  if (callerSignal !== undefined && !(callerSignal instanceof AbortSignal)) {
    return refused("CRITIC_CALL_CANCELLED_BEFORE_SEND");
  }
  // Already cancelled is knowable before anything is spent. Spending here would
  // burn one of the owner's three attempts on a call that never leaves.
  if (aborted(callerSignal)) return refused("CRITIC_CALL_CANCELLED_BEFORE_SEND");

  const call = authorization.routeRequestFingerprintSha256;
  if (spentCalls.has(call)) return refused("CRITIC_CALL_ALREADY_SPENT");
  if (spentCalls.size >= SPENT_CALL_LEDGER_LIMIT) return refused("CRITIC_CALL_LEDGER_FULL");

  // Core composes the body; this module never builds one. Composition also
  // proves the approval has not already been spent by some other caller.
  const body = criticCallRequestBody(authorization);
  if (body === null) return refused("CRITIC_CALL_ALREADY_SPENT");
  // A determinism guard rather than a guard against this caller: the bytes
  // below are the bytes composed above. If Core's composition ever stopped
  // being a pure function of the approval, this refuses instead of sending
  // bytes the authorization does not describe. It cannot fire today.
  if (!criticCallRequestBodyAuthorized(authorization, body)) {
    return refused("CRITIC_CALL_BODY_NOT_AUTHORIZED");
  }
  // Spend before sending. An interrupted and re-entered transport then finds
  // an approval that can no longer compose its own bytes. Nothing above this
  // line awaits, so two concurrent calls cannot both reach it.
  if (!consumeCriticCallAuthorization(authorization)) return refused("CRITIC_CALL_ALREADY_SPENT");
  spentCalls.add(call);

  const fetchImpl = callerFetch ?? fetch;
  const deadline = AbortSignal.timeout(authorization.timeoutMs);
  const signal = callerSignal === undefined ? deadline : AbortSignal.any([callerSignal, deadline]);

  let response: Response;
  try {
    response = await postChatCompletions({
      baseUrl: authorization.baseUrl,
      apiKey,
      body,
      signal,
      fetchImpl,
    });
  } catch (error) {
    if (error instanceof ConductorHttpError) {
      return error.status >= 300 && error.status < 400
        ? unavailable("CRITIC_CALL_REDIRECTED", error.status)
        : unavailable("CRITIC_CALL_HTTP_ERROR", error.status);
    }
    if (deadline.aborted) return unavailable("CRITIC_CALL_TIMED_OUT");
    if (aborted(callerSignal)) return unavailable("CRITIC_CALL_CANCELLED");
    return unavailable("CRITIC_CALL_NETWORK_ERROR");
  }

  if (!response.body) return unavailable("CRITIC_CALL_MALFORMED_RESPONSE", response.status);
  const capBytes = Math.min(authorization.maxOutputCharacters, TASK_CALL_BUDGET_V1.maxCriticCapturedOutputBytes);
  const read = await readBounded(response.body, capBytes);
  if (read.kind === "too-large") return unavailable("CRITIC_CALL_OUTPUT_TOO_LARGE", response.status);
  if (read.kind === "failed") {
    if (deadline.aborted) return unavailable("CRITIC_CALL_TIMED_OUT", response.status);
    if (aborted(callerSignal)) return unavailable("CRITIC_CALL_CANCELLED", response.status);
    return unavailable("CRITIC_CALL_NETWORK_ERROR", response.status);
  }
  const text = read.text;
  // A provider that echoes the saved key back must not get Cairn to write that
  // key into a record. Screened here for the unescaped spelling and again on
  // every parsed value below, because a JSON \uXXXX escape passes this one.
  if (text.includes(apiKey)) return unavailable("CRITIC_CALL_CREDENTIAL_ECHOED", response.status);

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return unavailable("CRITIC_CALL_MALFORMED_RESPONSE", response.status);
  }
  const envelope = record(payload);
  const choices = envelope === null ? null : envelope.choices;
  const choice = Array.isArray(choices) && choices.length > 0 ? record(choices[0]) : null;
  const message = choice === null ? null : record(choice.message);
  const rawOutput = message === null ? undefined : message.content;
  if (envelope === null || choice === null || typeof rawOutput !== "string") {
    return unavailable("CRITIC_CALL_MALFORMED_RESPONSE", response.status);
  }
  // Depth: unreachable while the byte ceiling is the smaller of the two, and
  // kept so a later change to either limit cannot silently widen capture.
  if (rawOutput.length > authorization.maxOutputCharacters) {
    return unavailable("CRITIC_CALL_OUTPUT_TOO_LARGE", response.status);
  }

  // A provider that answered as some other model did not answer the approved
  // call. Providers that report nothing stay allowed; ones that report a
  // different model do not.
  const providerReportedModel = envelope.model === undefined || envelope.model === null
    ? null
    : providerText(envelope.model);
  if (envelope.model !== undefined && envelope.model !== null && providerReportedModel !== authorization.resolvedModel) {
    return unavailable("CRITIC_CALL_MODEL_MISMATCH", response.status);
  }

  const finishReason = choice.finish_reason === undefined || choice.finish_reason === null
    ? null
    : providerText(choice.finish_reason);
  const requestId = envelope.id === undefined || envelope.id === null ? null : providerText(envelope.id);
  // The post-parse half of the credential screen. A JSON escape survives the
  // raw-text check above and is decoded by now, so every value Cairn is about
  // to keep is compared against the key itself.
  if (echoesCredential(rawOutput, apiKey) || echoesCredential(providerReportedModel, apiKey)
    || echoesCredential(finishReason, apiKey) || echoesCredential(requestId, apiKey)) {
    return unavailable("CRITIC_CALL_CREDENTIAL_ECHOED", response.status);
  }

  // A caller-supplied clock that throws would otherwise reject this call after
  // the owner had already paid for it.
  let createdAt: string;
  try {
    createdAt = (now ?? (() => new Date()))().toISOString();
  } catch {
    return unavailable("CRITIC_CALL_CLOCK_UNUSABLE", response.status);
  }

  const usageRecord = record(envelope.usage);
  const custody = composeCriticAssessmentCustody(request, {
    version: "cairn-critic-assessment-custody/v1",
    runId: authorization.runId,
    candidateRound: authorization.candidateRound,
    callAttempt: authorization.callAttempt,
    taskSpecSha256: authorization.taskSpecSha256,
    evidencePlanSha256: authorization.evidencePlanSha256,
    packetSha256: authorization.packetSha256,
    requestSha256: authorization.requestSha256,
    candidateSha256: authorization.candidateSha256,
    provider: authorization.provider,
    model: authorization.resolvedModel,
    resolvedModelRevision: authorization.resolvedModelRevision,
    connectionConsentVersion: authorization.connectionConsentVersion,
    routeRequestFingerprintSha256: authorization.routeRequestFingerprintSha256,
    criticPromptSha256: authorization.criticPromptSha256,
    policySha256: authorization.policySha256,
    createdAt,
  }, authorization);
  if (custody === null) return unavailable("CRITIC_CALL_CUSTODY_UNAVAILABLE", response.status);

  return Object.freeze({
    kind: "answered",
    sent: true,
    rawOutput,
    custody,
    providerReportedModel,
    finishReason,
    requestId,
    usage: Object.freeze({
      promptTokens: usageRecord === null ? null : providerTokenCount(usageRecord.prompt_tokens),
      completionTokens: usageRecord === null ? null : providerTokenCount(usageRecord.completion_tokens),
      costUsd: usageRecord === null ? null : providerCount(usageRecord.cost),
    }),
  } as const);
}

/** A read-only diagnostic. No collection and no reset is exposed: a ledger a
 * caller could empty would not bound anything. */
export function spentCriticCallCount(): number {
  return spentCalls.size;
}
