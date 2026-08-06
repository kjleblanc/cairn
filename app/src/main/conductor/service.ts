import { shell } from "electron";
import { randomUUID } from "node:crypto";
import { bindTaskIntent, taskRequestView, type TaskIntent } from "@cairn/core";
import type {
  ConductorAction,
  ConductorActionReply,
  ConductorChatTurn,
  ConductorConnectRequest,
  ConductorConsentCard,
  ConductorConversationSummary,
  ConductorDelta,
  ConductorOAuthEvent,
  ConductorOAuthRequest,
  ConductorRenewConsentRequest,
  ConductorSendRequest,
  ConductorStatus,
  ConductorStreamSnapshot,
  ConductorTurn,
  Result,
  ResultCard,
  TaskBlock,
} from "../../shared/ipc.js";
import { OPENROUTER_BASE_URL } from "../../shared/bodies.js";
import { isQuitDraining, runningDirs } from "../rungate.js";
import { logError } from "../log.js";
import { ConductorHttpError, promptTooLarge, streamChat, type ChatTurnMessage, type SlotWithKey } from "./client.js";
import { consentCardFor } from "./consent.js";
import { CONSTITUTION } from "./constitution.js";
import { assembleBriefing } from "./context.js";
import * as keystore from "./keystore.js";
import { beginOpenRouterOAuth, createLoopbackListener, type OAuthAttempt } from "./oauth.js";
import { cardBriefing } from "./relay.js";
import { connectionNoteFor } from "./seatnote.js";
import type { StoredConnection } from "./keystore.js";
import { appendCairnTurn, appendOwnerTurn, ConversationAppendUncertainError, ensureCairnExcluded, listConversations, newConversationId, readHistorySnapshot, readTurns, type ConductorHistorySnapshot } from "./store.js";
import { extractFollowups, followupSafeStreamingText } from "./followups.js";
import { controlSafeStreamingText, extractConductorControl, type ConductorControlCandidate } from "./taskblock.js";
import { isConversationId } from "./conversation-id.js";
import { canonicalProjectKey, validateOwnerReplyContext, type OwnerReplyContext } from "./turnauth.js";
import { buildSetAsideReplacement, preservesSetAsideReplacement, type SetAsideReplacement } from "./setaside.js";

const CONNECT_NOT_AUTHORIZED = "CONDUCTOR_CONNECT_NOT_AUTHORIZED";
const OAUTH_NOT_AUTHORIZED = "CONDUCTOR_OAUTH_NOT_AUTHORIZED";
const CONSENT_REQUIRED = "CONDUCTOR_CONSENT_REQUIRED";
const ENCRYPTION_UNAVAILABLE = "This computer cannot store the key securely, so Cairn did not save it.";
const PROMPT_TOO_LARGE_MESSAGE =
  "Cairn did not send this because the project briefing and conversation together are too large. Start a new conversation. If that also stops, the project's saved records need a smaller briefing.";

/**
 * What a turn is FOR. The streaming body is one and the same; this decides
 * three things about it.
 *
 * A "reply" answers the owner. They asked, so a proposed task is welcome and a
 * failure is theirs to see and retry.
 *
 * "commentary" is the ENVELOPE's own paid call, on a card the owner asked
 * nothing about. It never proposes a dispatchable task — a comment on
 * finished work becomes a `cairn-task` card over nobody's question — and if
 * it fails, the card stands alone rather than growing an error bubble and a
 * "Try again" for a question no one asked. Since Task 157 (the owner's
 * request) it may offer up to three lightweight follow-up SUGGESTIONS:
 * tapping one just sends an ordinary owner message, so every dispatch gate
 * still waits for the owner.
 */
type TurnKind = "reply" | "commentary";

/**
 * The envelope's whole request of the conductor, verbatim.
 *
 * The card itself is already in the prompt: it rides the history as SYSTEM
 * context through `cardBriefing`, which keeps the report's own separation —
 * what Cairn's runtime verified under one label, what the worker claims under
 * another. So this says only what to do with it: comment once, in plain words,
 * on the records rather than on impressions, and then offer the follow-ups.
 *
 * Task 157 (the owner's request) added the suggestions: this turn's founding
 * rule was "a comment on finished work is not a pitch for more", and the
 * owner now asks for exactly that pitch — in lightweight form. A suggestion
 * is not a proposal: it never becomes a `cairn-task` block here, it never
 * dispatches anything, and tapping one just starts the ordinary conversation
 * in which every gate still waits for the owner.
 */
const COMMENTARY_INSTRUCTION = "The envelope just posted the result card above. Do two things. First, add one short plain-language comment for the owner: state result facts only from the card or the records in your briefing, and name your source. Second, offer one to three small next steps the records genuinely point to, in one fenced block of short imperative sentences the owner could tap to send as-is (\"Retry the stopped task with a narrower outcome\", \"Update the milestone line in PROJECT.md\"). If nothing genuinely follows, omit the block entirely.\n\n```cairn-followups\n[\"first small next step\", \"second small next step\"]\n```\n\nNever emit a cairn-task or cairn-question block in this turn: commentary creates no action. These suggestions are not a dispatch — the owner decides each one in conversation.";

const INVALID_SEND = "CONDUCTOR_SEND_INVALID: Cairn refused a malformed conversation request.";
const EMPTY_SEND = "Type a message before sending.";
const STALE_ACTION_REPLY = "CONDUCTOR_ACTION_STALE: That question or task is no longer current.";
const WRONG_ACTION_REPLY = "CONDUCTOR_ACTION_REPLY_INVALID: That response does not match the current question or task.";
const OWNER_TURN_READBACK_FAILED = "CONDUCTOR_OWNER_TURN_READBACK_FAILED: Cairn saved the message but could not authenticate it for this provider call.";
const OWNER_TURN_POSTWRITE_VERIFICATION_FAILED = "CONDUCTOR_OWNER_TURN_POSTWRITE_VERIFICATION_FAILED: Cairn saved and authenticated this message, but final append verification failed. It was not sent to the provider.";
const OWNER_TURN_PERSISTENCE_UNCERTAIN = "CONDUCTOR_OWNER_TURN_PERSISTENCE_UNCERTAIN: Cairn could not confirm whether this message finished saving. It was not sent to the provider; copy it before reloading.";
const CAIRN_TURN_POSTWRITE_VERIFICATION_FAILED = "CONDUCTOR_CAIRN_TURN_POSTWRITE_VERIFICATION_FAILED: Cairn saved this answer, but final append verification failed. No action was activated.";
const CAIRN_TURN_PERSISTENCE_UNCERTAIN = "CONDUCTOR_CAIRN_TURN_PERSISTENCE_UNCERTAIN: Cairn could not confirm whether this answer finished saving. No action was activated; copy the visible text before reloading.";
const UNBOUND_TASK = "Cairn could not link that proposal to an authenticated owner message. Please restate the needed detail.";
const SET_ASIDE_REPLACEMENT_UNAVAILABLE = "CONDUCTOR_SET_ASIDE_REPLACEMENT_UNAVAILABLE: Cairn kept this proposal current because its context cannot safely carry that set-aside concern. Ask Cairn to revise the task instead.";
const PROPOSAL_ACKNOWLEDGEMENT = "Here's the plan.";
const SET_ASIDE_PENDING_ACKNOWLEDGEMENT = "Updating the plan...";
const SET_ASIDE_ACKNOWLEDGEMENT = "I carried that concern forward.";
const ACTION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** One live stream per project dir, so a stray second send can't stomp on a
 * stream already in flight and `stop` has something to abort. It carries its
 * `kind` because the refusal the next send gets has to name what is actually in
 * flight: a reply the owner started is on screen with a Stop control, and a
 * comment the envelope started is neither. */
type LiveStream = {
  controller: AbortController;
  kind: TurnKind;
  conversationId: string;
  startedAt: string;
  text: string;
  /** Present only after main validates and consumes an exact targeted reply.
   * Renderer reattachment may announce/focus it, never resend from it. */
  settlementKind?: ConductorActionReply["kind"];
};

const controllers = new Map<string, LiveStream>();

/** The one still-actionable proposal per project. This state deliberately
 * stays in main memory: conversation files live inside the worker-writable
 * project, so replaying a control from those files would let edited history
 * manufacture dispatch UI. A renderer remount may read this trusted snapshot;
 * a full app restart safely forgets it. */
type CurrentProposal = { conversationId: string; block: TaskBlock };
const proposals = new Map<string, CurrentProposal>();

type InternalAction =
  | { kind: "question"; actionId: string; conversationId: string; question: string }
  | {
      kind: "task";
      actionId: string;
      conversationId: string;
      intent: TaskIntent;
      request: Extract<ConductorAction, { kind: "task" }>["request"];
      context: readonly string[];
      risks: readonly { riskId: string; text: string }[];
    };

const currentActions = new Map<string, InternalAction>();

/**
 * Task routing keeps only an in-memory preview. Any conversation-side change
 * to proposal authority retires that preview through this main-private seam;
 * `null` means every project (used by app-wide disconnect/reset).
 */
type TaskProposalChangedListener = (dir: string | null) => void;
const taskProposalChangedListeners = new Set<TaskProposalChangedListener>();

export function onTaskProposalChanged(listener: TaskProposalChangedListener): () => void {
  taskProposalChangedListeners.add(listener);
  return () => taskProposalChangedListeners.delete(listener);
}

function notifyTaskProposalChanged(dir: string | null): void {
  for (const listener of [...taskProposalChangedListeners]) {
    try {
      listener(dir);
    } catch (error) {
      logError("conductor:task-proposal-listener", error);
    }
  }
}

function actionKey(dir: string): string {
  return canonicalProjectKey(dir);
}

function taskRunningForProject(dir: string): boolean {
  const key = actionKey(dir);
  return runningDirs().some((runningDir) => actionKey(runningDir) === key);
}

function exactRecord(value: unknown, keys: readonly string[], optional: readonly string[] = []): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const actual = Object.keys(value);
  if (keys.some((key) => !actual.includes(key)) || actual.some((key) => !keys.includes(key) && !optional.includes(key))) return null;
  return value as Record<string, unknown>;
}

function checkedActionReply(value: unknown): ConductorActionReply | null {
  const common = exactRecord(value, ["kind", "actionId"], ["riskId"]);
  if (!common || typeof common.actionId !== "string" || !ACTION_UUID.test(common.actionId)) return null;
  if (common.kind === "set-risk-aside") {
    const record = exactRecord(value, ["kind", "actionId", "riskId"]);
    return record && typeof record.riskId === "string" && ACTION_UUID.test(record.riskId)
      ? { kind: "set-risk-aside", actionId: common.actionId, riskId: record.riskId }
      : null;
  }
  if (common.kind !== "answer" && common.kind !== "defer" && common.kind !== "correction") return null;
  if (Object.prototype.hasOwnProperty.call(common, "riskId")) return null;
  return { kind: common.kind, actionId: common.actionId };
}

function checkedSendRequest(value: unknown): ConductorSendRequest | null {
  const record = exactRecord(value, ["dir", "conversationId", "text"], ["actionReply"]);
  if (!record || typeof record.dir !== "string" || !record.dir || typeof record.text !== "string") return null;
  if (record.conversationId !== null && !isConversationId(record.conversationId)) return null;
  const hasReply = Object.prototype.hasOwnProperty.call(record, "actionReply");
  const actionReply = hasReply ? checkedActionReply(record.actionReply) : null;
  if (hasReply && actionReply === null) return null;
  return {
    dir: record.dir,
    conversationId: record.conversationId,
    text: record.text,
    ...(actionReply !== null ? { actionReply } : {}),
  };
}

function actionView(value: InternalAction): ConductorAction {
  if (value.kind === "question") {
    return { kind: value.kind, actionId: value.actionId, conversationId: value.conversationId, question: value.question };
  }
  return {
    kind: value.kind,
    actionId: value.actionId,
    conversationId: value.conversationId,
    request: value.request,
    context: [...value.context],
    risks: value.risks.map((risk) => ({ ...risk })),
  };
}

function actionReplyContext(
  dir: string,
  conversationId: string | null,
  reply: ConductorActionReply | undefined,
): Result<OwnerReplyContext | null> {
  const current = currentActions.get(actionKey(dir));
  if (reply === undefined) {
    // Until the renderer action cards land, an ordinary composer message is
    // still allowed to move the conversation on. It retires the action after
    // append like every owner turn, but carries no claim that it answered a
    // particular action. Targeted answer/defer/risk/correction paths below
    // remain exact-ID only.
    return { ok: true, value: null };
  }
  if (!current || current.actionId !== reply.actionId || current.conversationId !== conversationId) {
    return { ok: false, message: STALE_ACTION_REPLY };
  }
  let candidate: unknown = null;
  if (current.kind === "question" && (reply.kind === "answer" || reply.kind === "defer")) {
    candidate = { kind: "question", response: reply.kind, question: current.question };
  } else if (current.kind === "task" && reply.kind === "correction") {
    candidate = { kind: "task", response: "correction", request: current.request, context: current.context };
  } else if (current.kind === "task" && reply.kind === "set-risk-aside") {
    const risk = current.risks.find((item) => item.riskId === reply.riskId);
    if (risk) candidate = { kind: "risk", response: "set-aside", risk: risk.text };
  }
  const checked = validateOwnerReplyContext(candidate);
  return checked === null ? { ok: false, message: WRONG_ACTION_REPLY } : { ok: true, value: checked };
}

/** The owner-facing disclosure Cairn shows before it may act on the
 * conversation without per-message approval. Main re-derives this from the
 * renderer's baseUrl+model and requires an exact match before connecting —
 * the renderer's copy is never trusted on its own. The sentences live in
 * `consent.ts`, pure, so the unit suite pins them without booting the app. */
export function conductorConsentCard(baseUrl: string, model: string): ConductorConsentCard {
  return consentCardFor(baseUrl, model);
}

function sameCard(a: ConductorConsentCard, b: ConductorConsentCard): boolean {
  return a.provider === b.provider && a.baseUrl === b.baseUrl && a.model === b.model && a.data === b.data && a.cost === b.cost && a.checkbox === b.checkbox && a.fileContentsCheckbox === b.fileContentsCheckbox;
}

/** Consent is versioned by the exact main-derived data sentence the owner
 * approved. Legacy, missing, and unknown scopes all fail closed while the
 * encrypted credential remains available for an explicit renewal. */
function hasCurrentConsent(conn: StoredConnection): boolean {
  return conn.authorizedDataScope === conductorConsentCard(conn.baseUrl, conn.model).data;
}

export function status(): ConductorStatus {
  const conn = keystore.readConnection();
  const consentCurrent = conn !== null && hasCurrentConsent(conn);
  return {
    connected: consentCurrent,
    consentRequired: conn !== null && !consentCurrent,
    baseUrl: conn?.baseUrl ?? "",
    model: conn?.model ?? "",
    provider: conn ? new URL(conn.baseUrl).host : "",
    encryptionAvailable: keystore.encryptionAvailable(),
  };
}

/** The dispatch-gate pattern from `tasks.ts`: re-derive the disclosure main
 * trusts, compare field-by-field against what the renderer showed the
 * owner, and refuse with a fixed code on any mismatch — never trust the
 * renderer's copy of the card, or an unchecked box. */
export function connect(request: ConductorConnectRequest): Result<null> {
  const expected = conductorConsentCard(request.card.baseUrl, request.card.model);
  if (!sameCard(expected, request.card) || request.consentConfirmed !== true || request.fileContentsConfirmed !== true) {
    return { ok: false, message: CONNECT_NOT_AUTHORIZED };
  }
  if (!keystore.encryptionAvailable()) {
    return { ok: false, message: ENCRYPTION_UNAVAILABLE };
  }
  keystore.saveKey(request.card.baseUrl, request.card.model, request.apiKey, expected.data);
  return { ok: true, value: null };
}

/** Renew a stale saved connection without decrypting or replacing its key and
 * without contacting the provider. The current connection fixes the card's
 * provider/model; renderer-supplied alternatives cannot retarget renewal. */
export function renewConsent(request: ConductorRenewConsentRequest): Result<null> {
  const conn = keystore.readConnection();
  if (!conn) return { ok: false, message: CONNECT_NOT_AUTHORIZED };
  const expected = conductorConsentCard(conn.baseUrl, conn.model);
  if (!sameCard(expected, request.card) || request.consentConfirmed !== true || request.fileContentsConfirmed !== true) {
    return { ok: false, message: CONNECT_NOT_AUTHORIZED };
  }
  if (!keystore.updateAuthorizedDataScope(expected.data)) {
    return { ok: false, message: CONNECT_NOT_AUTHORIZED };
  }
  return { ok: true, value: null };
}

export function disconnect(): void {
  keystore.clearConnection();
  proposals.clear();
  currentActions.clear();
  notifyTaskProposalChanged(null);
}

/** One sign-in attempt at a time, app-wide — the loopback listener and the
 * waiting card are both single-tenant by nature. */
let liveOAuth: OAuthAttempt | null = null;

const DEFAULT_OPENROUTER_AUTH_BASE = new URL(OPENROUTER_BASE_URL).origin;

/** "Sign in with OpenRouter" (task 131): the SAME consent gate as connect()
 * — re-derived card, exact field match, checked box — plus a fail-closed pin
 * that only the curated OpenRouter seat may use this channel. The PKCE dance
 * then runs entirely here in main: the browser opens OpenRouter's
 * authorization page, the loopback listener takes the redirect, the exchange
 * mints the key, and the key goes straight into the same encrypted keystore
 * slot a pasted key would. It never crosses IPC; the renderer learns only
 * "done" or a fixed refusal through `emit`.
 *
 * Test seams (both fail-closed to production values): CAIRN_OPENROUTER_AUTH_BASE
 * points the auth page and the exchange at a local fixture, and
 * CAIRN_OAUTH_NO_BROWSER=1 skips the real browser launch — the waiting card
 * shows the same URL as a fallback link either way. */
export async function beginOAuth(
  request: ConductorOAuthRequest,
  emit: (event: ConductorOAuthEvent) => void,
): Promise<Result<{ authUrl: string }>> {
  const expected = conductorConsentCard(request.card.baseUrl, request.card.model);
  if (!sameCard(expected, request.card) || request.consentConfirmed !== true || request.fileContentsConfirmed !== true) {
    return { ok: false, message: CONNECT_NOT_AUTHORIZED };
  }
  if (request.card.baseUrl !== OPENROUTER_BASE_URL) {
    return { ok: false, message: OAUTH_NOT_AUTHORIZED };
  }
  if (!keystore.encryptionAvailable()) {
    return { ok: false, message: ENCRYPTION_UNAVAILABLE };
  }
  // A second begin supersedes whatever attempt was still waiting.
  const previous = liveOAuth;
  liveOAuth = null;
  previous?.cancel();
  let attempt: OAuthAttempt;
  try {
    attempt = await beginOpenRouterOAuth({
      authBase: process.env.CAIRN_OPENROUTER_AUTH_BASE ?? DEFAULT_OPENROUTER_AUTH_BASE,
      listen: createLoopbackListener,
      fetchImpl: (url, init) => fetch(url, init),
    });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
  liveOAuth = attempt;
  if (process.env.CAIRN_OAUTH_NO_BROWSER !== "1") {
    // Best-effort: if the browser launch fails, the fallback link carries the flow.
    void shell.openExternal(attempt.authUrl).catch(() => {});
  }
  attempt.waitForKey()
    .then((key) => {
      if (liveOAuth !== attempt) return;
      liveOAuth = null;
      try {
        keystore.saveKey(request.card.baseUrl, request.card.model, key, expected.data);
        emit({ kind: "done" });
      } catch {
        emit({ kind: "failed", message: ENCRYPTION_UNAVAILABLE });
      }
    })
    .catch((err: unknown) => {
      if (liveOAuth !== attempt) return;
      liveOAuth = null;
      emit({ kind: "failed", message: err instanceof Error ? err.message : String(err) });
    });
  return { ok: true, value: { authUrl: attempt.authUrl } };
}

/** Renderer-initiated cancel: silent by design — the card that cancelled
 * already knows, so no event goes back out. Clearing the slot FIRST is what
 * keeps the attempt's own rejection from emitting a stale "failed". */
export function cancelOAuth(): void {
  const attempt = liveOAuth;
  liveOAuth = null;
  attempt?.cancel();
}

export function setModel(model: string): void {
  const conn = keystore.readConnection();
  if (!conn) {
    throw new Error("Connect to a provider before changing the model.");
  }
  if (!hasCurrentConsent(conn)) {
    throw new Error(CONSENT_REQUIRED);
  }
  if (!keystore.updateModel(model)) {
    throw new Error("Connect to a provider before changing the model.");
  }
}

export function conversations(dir: string): ConductorConversationSummary[] {
  return listConversations(dir);
}

export function turns(dir: string, id: string): ConductorTurn[] {
  if (!isConversationId(id)) return [];
  return readTurns(dir, id);
}

/** Main's current structured proposal for this exact conversation, if it has
 * not already been accepted for dispatch. Project conversation files are not
 * consulted here. */
export function proposal(dir: string, conversationId: string): TaskBlock | null {
  if (!isConversationId(conversationId)) return null;
  const current = proposals.get(actionKey(dir));
  return current?.conversationId === conversationId ? current.block : null;
}

/** Main's inert structured action for an exact conversation. Conversation
 * files are never consulted, so a renderer remount can recover it but a full
 * app relaunch cannot recreate authority from project-owned history. */
export function action(dir: string, conversationId: string): ConductorAction | null {
  if (!isConversationId(conversationId)) return null;
  const current = currentActions.get(actionKey(dir));
  return current?.conversationId === conversationId ? actionView(current) : null;
}

/**
 * Main-private dispatch authority for Task 3. The renderer can name an action
 * id, but only the exact still-current authenticated task action can yield the
 * frozen intent that Core will receive. Project conversation files are never
 * consulted and the intent never crosses IPC.
 */
export function currentTaskProposal(
  dir: string,
  conversationId: string,
  proposalId: string,
): { intent: TaskIntent; unresolvedRisks: number } | null {
  if (!isConversationId(conversationId) || !ACTION_UUID.test(proposalId)) return null;
  const current = currentActions.get(actionKey(dir));
  if (!current || current.kind !== "task" || current.conversationId !== conversationId || current.actionId !== proposalId) {
    return null;
  }
  return { intent: current.intent, unresolvedRisks: current.risks.length };
}

/**
 * Atomically spend one exact, risk-free authenticated task proposal. A stale,
 * replayed, corrected, or renderer-invented id changes nothing. Once consumed,
 * no later readiness or process failure restores conversation authority.
 */
export function consumeCurrentTaskProposal(
  dir: string,
  conversationId: string,
  proposalId: string,
): { intent: TaskIntent } | null {
  const current = currentTaskProposal(dir, conversationId, proposalId);
  if (current === null || current.unresolvedRisks !== 0) return null;
  const key = actionKey(dir);
  const authoritative = currentActions.get(key);
  if (!authoritative || authoritative.kind !== "task" || authoritative.intent !== current.intent) return null;
  currentActions.delete(key);
  proposals.delete(key);
  notifyTaskProposalChanged(dir);
  return { intent: current.intent };
}

/** Retire only the exact proposal main emitted and the owner is now sending.
 * A refused, stale, or renderer-invented request leaves the real proposal in
 * place. */
export function consumeProposal(
  dir: string,
  conversationId: string,
  outcome: string,
  details: string,
): TaskBlock | null {
  if (!isConversationId(conversationId)) return null;
  const key = actionKey(dir);
  const current = proposals.get(key);
  if (current?.conversationId !== conversationId) return null;
  if (current.block.outcome !== outcome || current.block.details !== details) return null;
  proposals.delete(key);
  return current.block;
}

/** Put back a trusted proposal whose attempted run never started. Never
 * overwrite a newer proposal that may already have become current. */
export function restoreProposal(dir: string, conversationId: string, block: TaskBlock): void {
  if (!isConversationId(conversationId)) return;
  const key = actionKey(dir);
  if (!proposals.has(key)) proposals.set(key, { conversationId, block });
}

/** Bounded visible state for renderer reattachment. The provider request,
 * credentials, raw events, and every other project's stream remain private to
 * the main process. */
export function current(dir: string): ConductorStreamSnapshot | null {
  const live = controllers.get(actionKey(dir));
  if (!live) return null;
  return {
    dir,
    conversationId: live.conversationId,
    kind: live.kind,
    startedAt: live.startedAt,
    text: live.text,
    ...(live.settlementKind === undefined ? {} : { settlementKind: live.settlementKind }),
  };
}

/** Aborts the in-flight stream for `dir`, if any. The stream's own catch
 * block persists the partial turn and emits the stopped delta. */
export function stop(dir: string): void {
  controllers.get(actionKey(dir))?.controller.abort();
}

/** Starts (or continues) a conversation for `dir`. Returns immediately with
 * the conversation id; the reply streams afterward over `onDelta`. */
export function send(
  requestValue: unknown,
  onDelta: (delta: ConductorDelta) => void,
): Result<{ conversationId: string }> {
  const request = checkedSendRequest(requestValue);
  if (request === null) return { ok: false, message: INVALID_SEND };
  const { dir, conversationId, text } = request;
  if (!text.trim()) return { ok: false, message: EMPTY_SEND };
  // Quitting is checked FIRST, and for the same reason `commentary` checks it:
  // inside the 8-second grace window the process is about to end, so a stream
  // started here is paid for, killed part-way, and never persisted or seen. The
  // owner asked for this one, so unlike a comment it is refused out loud rather
  // than skipped silently — and their message is not written to the
  // conversation, so nothing sits in the transcript looking sent (Task 071).
  // Quitting wins over serial-run-active when both are true, the same order
  // `runRefusal` uses for a run.
  if (isQuitDraining()) {
    return { ok: false, message: "QUIT_IN_PROGRESS: Cairn is stopping the current task and quitting. Send this after relaunch — the conversation is saved." };
  }
  if (taskRunningForProject(dir)) {
    return { ok: false, message: "SERIAL_RUN_ACTIVE: A task is already running for this project. Wait for it to finish before messaging Cairn." };
  }
  // The refusal names the stream that is actually in flight. A reply the owner
  // started is on screen with a Stop control under it; a comment the envelope
  // started has neither, so telling the owner to stop it would point at nothing.
  const key = actionKey(dir);
  const live = controllers.get(key);
  if (live) {
    return { ok: false, message: live.kind === "commentary"
      ? "Cairn is finishing a short comment on the result card. Try again in a moment."
      : "Cairn is already answering for this project. Wait for that reply, or stop it first." };
  }
  const conn = keystore.readConnection();
  if (!conn) {
    return { ok: false, message: "Connect to a provider before messaging Cairn." };
  }
  // Refuse BEFORE creating a conversation or persisting the owner's turn. A
  // stale saved key is preserved for renewal, but authorizes no model call.
  if (!hasCurrentConsent(conn)) {
    return { ok: false, message: CONSENT_REQUIRED };
  }

  const contextResult = actionReplyContext(dir, conversationId, request.actionReply);
  if (!contextResult.ok) return contextResult;

  // Task 181: prepare the safe replacement while the exact old action is
  // still current. If Core cannot carry the selected concern within the
  // existing intent bounds, refuse before append so the old card and its
  // one-time authority remain available. The provider may still supply a
  // valid fresh action; this value is used when its reply has no safe one.
  let setAsideReplacement: SetAsideReplacement | undefined;
  if (request.actionReply?.kind === "set-risk-aside") {
    const current = currentActions.get(key);
    if (conversationId === null || current?.kind !== "task") {
      return { ok: false, message: STALE_ACTION_REPLY };
    }
    try {
      const authenticatedSources = readHistorySnapshot(dir, conversationId).authenticatedSources;
      const replacement = buildSetAsideReplacement(
        current,
        request.actionReply.riskId,
        authenticatedSources,
      );
      if (replacement === null) return { ok: false, message: SET_ASIDE_REPLACEMENT_UNAVAILABLE };
      setAsideReplacement = replacement;
    } catch {
      return { ok: false, message: SET_ASIDE_REPLACEMENT_UNAVAILABLE };
    }
  }

  const id = conversationId ?? newConversationId(dir);
  const inputId = randomUUID();
  ensureCairnExcluded(dir);
  try {
    appendOwnerTurn(dir, id, {
      role: "owner",
      inputId,
      text,
      ts: new Date().toISOString(),
      replyContext: contextResult.value,
    });
  } catch (error) {
    if (!(error instanceof ConversationAppendUncertainError)) throw error;
    // The write syscall began, so even a failed immediate read cannot prove
    // that this one-time reply is reusable. Retire it, spend nothing, and keep
    // the owner's optimistic text visible with an explicitly uncertain status.
    currentActions.delete(key);
    notifyTaskProposalChanged(dir);
    if (conversationId === null) proposals.delete(key);
    let recovered = false;
    try {
      recovered = readHistorySnapshot(dir, id).entries.some((entry) =>
        entry.authenticatedOwner
        && entry.inputId === inputId
        && entry.turn.role === "owner"
        && entry.turn.text === text);
    } catch {
      // The distinct uncertainty message below makes no persistence claim.
    }
    onDelta({
      dir,
      conversationId: id,
      kind: "error",
      message: recovered ? OWNER_TURN_POSTWRITE_VERIFICATION_FAILED : OWNER_TURN_PERSISTENCE_UNCERTAIN,
      turnKind: "reply",
    });
    return { ok: true, value: { conversationId: id } };
  }
  // A successful project append is the one-way lifecycle boundary. Even if
  // the immediate custody readback below fails closed, this reply was stored
  // and the same action may never be targeted a second time.
  currentActions.delete(key);
  notifyTaskProposalChanged(dir);
  // The legacy renderer deliberately retains a proposal across same-
  // conversation free-text chip replies until Task 3 migrates it. Starting a
  // different conversation must still retire the previous conversation's
  // proposal immediately after this owner turn is safely appended.
  if (conversationId === null) proposals.delete(key);
  // Task 3 will migrate the renderer from legacy proposals to authenticated
  // actions. Until then, keep the legacy proposal alive across the free-text
  // answer that resolves one of its chips: the existing renderer owns that
  // resolution state and consumes the proposal only at dispatch. The new
  // authenticated action above is still retired for every successful owner
  // append, so this compatibility bridge grants no new action authority.
  let historySnapshot: ConductorHistorySnapshot | null = null;
  try {
    historySnapshot = readHistorySnapshot(dir, id);
  } catch {
    // Handled by the same saved-but-not-sent result below.
  }
  const accepted = historySnapshot?.entries.some((entry) =>
    entry.authenticatedOwner
    && entry.inputId === inputId
    && entry.turn.role === "owner"
    && entry.turn.text === text);
  if (!accepted || historySnapshot === null) {
    onDelta({ dir, conversationId: id, kind: "error", message: OWNER_TURN_READBACK_FAILED, turnKind: "reply" });
    return { ok: true, value: { conversationId: id } };
  }
  // Marker or pre-write append refusal leaves the action current. Every
  // successful append — and every post-write uncertain one — retires it before
  // provider work, and no later error restores it.
  const controller = new AbortController();
  controllers.set(key, {
    controller,
    kind: "reply",
    conversationId: id,
    startedAt: new Date().toISOString(),
    text: "",
    ...(request.actionReply === undefined ? {} : { settlementKind: request.actionReply.kind }),
  });
  void streamTurn(dir, id, conn, controller, onDelta, "reply", historySnapshot, setAsideReplacement);

  return { ok: true, value: { conversationId: id } };
}

/**
 * One short comment from the conductor on the card the envelope just posted.
 *
 * This is the only call Cairn makes that the OWNER did not ask for, so every
 * guard here points the same way. Nothing about the card depends on it: the
 * card is written and its delta already sent before this is called, so whatever
 * happens here, the card is exactly what it is. (It is not instantaneous —
 * like `send()`, it runs synchronously as far as the first await, which
 * includes `assembleBriefing`'s git calls. Nothing is waiting on that.) It
 * never retries. It skips silently — spending nothing, saying nothing — when:
 *
 * - there is no stored connection. A disconnected Cairn makes no paid call, and
 *   the card standing alone is the honest outcome, not a failure to report.
 * - a stream is already in flight for this project. One voice at a time.
 * - a task is running for this project. Evaluated post-settle, where the run
 *   that produced this very card has already cleared the running set — so this
 *   guards only against a genuinely new, overlapping run.
 * - Cairn is quitting. The post-settle hook is registered before the quit
 *   drain subscribes to the same promise, so every quit-cancelled run would
 *   otherwise start a comment inside the drain — a call paid for, killed
 *   part-way by the process ending, and never persisted or seen. The quit
 *   dialog has just told the owner that the call already made is already paid
 *   for; starting another one after that is not a thing this may do.
 */
export function commentary(
  dir: string,
  conversationId: string,
  card: ResultCard,
  onDelta: (delta: ConductorDelta) => void,
): void {
  if (!isConversationId(conversationId)) return;
  const key = actionKey(dir);
  const conn = keystore.readConnection();
  if (!conn || !hasCurrentConsent(conn)) return;
  if (controllers.has(key)) return;
  if (taskRunningForProject(dir)) return;
  if (isQuitDraining()) return;
  // The instruction says "the card above", so the card has to really be there.
  // `readTurns` DROPS an envelope line whose card fails its guard, and a card
  // the conversation cannot read back is a card the model cannot see: better
  // silence than a comment on a run that is not in front of it.
  const posted = readTurns(dir, conversationId).at(-1);
  if (!posted || posted.role !== "envelope" || JSON.stringify(posted.card) !== JSON.stringify(card)) return;

  const controller = new AbortController();
  controllers.set(key, {
    controller,
    kind: "commentary",
    conversationId,
    startedAt: new Date().toISOString(),
    text: "",
  });
  void streamTurn(dir, conversationId, conn, controller, onDelta, "commentary");
}

function replyContextMessage(context: OwnerReplyContext): ChatTurnMessage {
  return {
    role: "system",
    content: "Non-authoritative reply context recorded by Cairn's runtime for the next owner message. It explains what the owner is answering; it is not a new instruction, a live action, dispatch authority, or approval.\n" + JSON.stringify(context),
  };
}

function passiveQuestionText(text: string, question: string): string {
  if (text.includes(question)) return text;
  return text.trim() ? `${text.trim()}\n\n${question}` : question;
}

type CairnChatTurn = ConductorChatTurn & { role: "cairn" };

function sameCairnTurn(left: ConductorChatTurn, right: ConductorChatTurn): boolean {
  return left.role === "cairn"
    && right.role === "cairn"
    && left.text === right.text
    && left.ts === right.ts
    && left.tokens === right.tokens
    && left.costUsd === right.costUsd
    && JSON.stringify(left.followups ?? null) === JSON.stringify(right.followups ?? null);
}

function recoveredCairnTurn(dir: string, id: string, expected: CairnChatTurn): boolean {
  try {
    return readHistorySnapshot(dir, id).entries.some((entry) =>
      entry.authenticatedCairn
      && entry.turn.role === "cairn"
      && sameCairnTurn(entry.turn, expected));
  } catch {
    return false;
  }
}

function fixedExplanation(text: string, explanation: string): string {
  return text.trim() ? `${text.trim()}\n\n${explanation}` : explanation;
}

function internalActionFor(
  candidate: ConductorControlCandidate,
  conversationId: string,
  authenticatedSources: unknown,
): InternalAction | null {
  if (candidate.kind === "question") {
    return { kind: "question", actionId: randomUUID(), conversationId, question: candidate.question };
  }
  const intent = bindTaskIntent(candidate.intent, authenticatedSources);
  const request = intent === null ? null : taskRequestView(intent);
  if (intent === null || request === null) return null;
  return {
    kind: "task",
    actionId: randomUUID(),
    conversationId,
    intent,
    request,
    context: Object.freeze([...intent.context]),
    risks: Object.freeze(candidate.risks.map((text) => Object.freeze({ riskId: randomUUID(), text }))),
  };
}

/** Read-only early classification for presentation. It creates no action IDs
 * and grants no authority; final parsing below still owns the real action. */
function actionableTaskCandidate(
  candidate: ConductorControlCandidate | null,
  authenticatedSources: unknown,
  replacement?: SetAsideReplacement,
): boolean {
  if (candidate?.kind !== "task") return false;
  const intent = bindTaskIntent(candidate.intent, authenticatedSources);
  const request = intent === null ? null : taskRequestView(intent);
  if (intent === null || request === null) return false;
  return replacement === undefined || preservesSetAsideReplacement({
    request,
    context: intent.context,
    risks: candidate.risks.map((text) => ({ text })),
  }, replacement);
}

function internalActionFromSetAside(
  replacement: SetAsideReplacement,
  conversationId: string,
): Extract<InternalAction, { kind: "task" }> {
  return {
    kind: "task",
    actionId: randomUUID(),
    conversationId,
    intent: replacement.intent,
    request: replacement.request,
    context: replacement.context,
    // A replacement action gets replacement risk identities too. An old chip
    // can never target a risk that merely survived into the fresh review.
    risks: Object.freeze(replacement.remainingRisks
      .map((risk) => Object.freeze({ riskId: randomUUID(), text: risk.text }))),
  };
}

/** The one streaming body, shared by both turns Cairn takes: the owner's reply
 * and the envelope's commentary. Everything they differ about is `kind`. */
async function streamTurn(
  dir: string,
  id: string,
  conn: StoredConnection,
  controller: AbortController,
  onDelta: (delta: ConductorDelta) => void,
  kind: TurnKind,
  retainedHistory?: ConductorHistorySnapshot,
  setAsideReplacement?: SetAsideReplacement,
): Promise<void> {
  let full = "";
  let publicFull = "";
  let tokens: number | undefined;
  let costUsd: number | undefined;
  let completedTurn: CairnChatTurn | null = null;
  let proposalPreview = false;
  try {
    const historySnapshot = retainedHistory ?? readHistorySnapshot(dir, id);
    const latestOwnerEntry = [...historySnapshot.entries].reverse()
      .find((entry) => entry.turn.role === "owner" && entry.authenticatedOwner);
    const latestOwnerText = latestOwnerEntry?.turn.role === "owner" ? latestOwnerEntry.turn.text : "";
    // Task 127's custom-seat note goes right after the briefing, before any
    // history: it is a code-assembled connection fact (model id + host only,
    // both already visible to the provider), never the owner's words and
    // never a secret. Curated seats add nothing (`null`).
    const seatNote = connectionNoteFor(conn.baseUrl, conn.model);
    const messages: ChatTurnMessage[] = [
      { role: "system", content: CONSTITUTION },
      { role: "system", content: assembleBriefing(dir, undefined, latestOwnerText) },
      ...(seatNote ? [{ role: "system", content: seatNote } satisfies ChatTurnMessage] : []),
      // A result card enters the prompt as SYSTEM context, labeled for what it
      // is: Cairn's runtime wrote it, the conversation model did not, and the
      // model must not mistake it for its own earlier reply. `cardBriefing`
      // carries the report's own separation — verified facts under one label,
      // the worker's claims under another — so the model can never read a
      // claim as something Cairn verified.
      ...historySnapshot.entries.flatMap(({ turn, replyContext, authenticatedOwner, authenticatedCairn, authenticatedEnvelope }): ChatTurnMessage[] => {
        if (turn.role === "envelope") return authenticatedEnvelope
          ? [{ role: "system", content: cardBriefing(turn.card) }]
          : [];
        if (turn.role === "owner") {
          if (!authenticatedOwner) return [];
          return [
            ...(replyContext === null ? [] : [replyContextMessage(replyContext)]),
            { role: "user", content: turn.text },
          ];
        }
        return authenticatedCairn ? [{ role: "assistant", content: turn.text }] : [];
      }),
      // The envelope's instruction goes LAST, after the card it is about, so
      // "the card above" names the message immediately above it.
      ...(kind === "commentary" ? [{ role: "system", content: COMMENTARY_INSTRUCTION } satisfies ChatTurnMessage] : []),
    ];
    // Checked here, before any network call, so an oversized conversation fails
    // instantly and for its real reason instead of surfacing later as an opaque
    // provider error. For a reply, the owner's turn is already persisted by
    // `send()`, so the record stays truthful either way and the owner is told.
    // A commentary turn nobody asked for tells nobody: it simply does not
    // happen, and the card is unaffected.
    if (promptTooLarge(messages)) {
      if (kind === "reply") onDelta({ dir, conversationId: id, kind: "error", message: PROMPT_TOO_LARGE_MESSAGE, turnKind: kind });
      // A commentary that never starts still releases the renderer's
      // indicator (Task 153): a quiet error event, matching the silent drop
      // in the catch below. No message, no bubble, no partial turn.
      else onDelta({ dir, conversationId: id, kind: "error", turnKind: kind });
      return;
    }
    const slot: SlotWithKey = { baseUrl: conn.baseUrl, model: conn.model, apiKey: keystore.decryptedKey(conn) };

    for await (const event of streamChat(slot, messages, fetch, controller.signal)) {
      if (event.kind === "delta" && event.text) {
        full += event.text;
        const streamedCandidate = kind === "reply" ? extractConductorControl(full).candidate : null;
        const acknowledgement = kind !== "reply"
          ? null
          : setAsideReplacement !== undefined
            ? SET_ASIDE_PENDING_ACKNOWLEDGEMENT
            : actionableTaskCandidate(streamedCandidate, historySnapshot.authenticatedSources)
              ? PROPOSAL_ACKNOWLEDGEMENT
              : null;
        if (acknowledgement !== null) {
          if (!proposalPreview) {
            proposalPreview = true;
            publicFull = acknowledgement;
            const live = controllers.get(actionKey(dir));
            if (live?.controller === controller) live.text = publicFull;
            onDelta({ dir, conversationId: id, kind: "replace", text: publicFull, turnKind: kind });
          }
          continue;
        }
        if (proposalPreview) continue;
        const nextPublic = followupSafeStreamingText(controlSafeStreamingText(full));
        const publicDelta = nextPublic.startsWith(publicFull) ? nextPublic.slice(publicFull.length) : "";
        if (nextPublic.startsWith(publicFull)) publicFull = nextPublic;
        const live = controllers.get(actionKey(dir));
        if (live?.controller === controller) live.text = publicFull;
        if (publicDelta) onDelta({ dir, conversationId: id, kind: "delta", text: publicDelta, turnKind: kind });
      } else if (event.kind === "usage") {
        tokens = (event.promptTokens ?? 0) + (event.completionTokens ?? 0);
        costUsd = event.costUsd;
      }
    }

    const { block, candidate } = extractConductorControl(full);
    // Task 157: the suggestions ride the commentary turn only. A reply that
    // emits the fence anyway has it stripped and dropped — symmetric with the
    // commentary task-block drop below: neither voice may grow a control the
    // other turn's owner never asked for.
    const { followups: found, text: withoutFollowups } = extractFollowups(full);
    const { text: withoutPrivateControls } = extractConductorControl(withoutFollowups);
    const followups = kind === "commentary" ? found : null;
    const parsedAction = kind === "reply" && candidate !== null
      ? internalActionFor(candidate, id, historySnapshot.authenticatedSources)
      : null;
    // A set-aside reply means "keep the task". A conductor-supplied task wins
    // only when it preserves the exact request, every remaining risk, and the
    // full main-prepared context prefix (including the selected concern).
    // Otherwise main's deterministic replacement is the safe visible truth.
    const candidateAction = setAsideReplacement === undefined
      ? parsedAction
      : parsedAction?.kind === "task" && preservesSetAsideReplacement(parsedAction, setAsideReplacement)
        ? parsedAction
        : null;
    const fallbackAction = kind === "reply" && candidateAction === null && setAsideReplacement !== undefined
      ? internalActionFromSetAside(setAsideReplacement, id)
      : null;
    const nextAction = candidateAction ?? fallbackAction;
    const fallbackUsed = fallbackAction !== null;
    let text = withoutPrivateControls;
    // Once a valid task action exists, the card owns every task detail. Model
    // prose is untrusted and may ignore its copy budget, so the settled and
    // persisted proposal always gets one short acknowledgement owned by main.
    if (kind === "reply" && nextAction?.kind === "task") {
      text = setAsideReplacement === undefined ? PROPOSAL_ACKNOWLEDGEMENT : SET_ASIDE_ACKNOWLEDGEMENT;
    } else if (kind === "reply" && candidate?.kind === "question" && !fallbackUsed) {
      text = passiveQuestionText(text, candidate.question);
    } else if (kind === "reply" && candidate?.kind === "task" && nextAction === null) {
      text = fixedExplanation(text, UNBOUND_TASK);
    }
    const cairnTurn: CairnChatTurn = {
      role: "cairn",
      text,
      ts: new Date().toISOString(),
      ...(tokens !== undefined ? { tokens } : {}),
      ...(costUsd !== undefined ? { costUsd } : {}),
      ...(followups !== null ? { followups } : {}),
    };
    completedTurn = cairnTurn;
    appendCairnTurn(dir, id, cairnTurn);
    if (kind === "reply" && nextAction !== null) {
      currentActions.set(actionKey(dir), nextAction);
      // A new authenticated action replaces any legacy card still bridged for
      // the current renderer; the two authorities may never coexist.
      proposals.delete(actionKey(dir));
      notifyTaskProposalChanged(dir);
    }
    // The parser above and this service are the trusted origin of dispatch
    // controls. Keep the latest well-formed reply proposal available across a
    // Chat remount; ordinary prose leaves the existing proposal in place, just
    // like the live renderer path. Commentary may never create one.
    if (kind === "reply" && block !== null && !fallbackUsed) {
      proposals.set(actionKey(dir), { conversationId: id, block });
    }
    // "No cairn-task block" is enforced here as well as asked for above: a
    // model that emits one anyway has its fence stripped from the text like
    // any other, and the proposal is dropped rather than put on screen as a
    // card the owner never asked a question to get.
    onDelta({
      dir,
      conversationId: id,
      kind: "done",
      turn: cairnTurn,
      taskBlock: kind === "reply" && !fallbackUsed ? block : null,
      ...(kind === "reply" ? { action: nextAction === null ? null : actionView(nextAction) } : {}),
      followups,
      turnKind: kind,
    });
  } catch (err) {
    if (kind === "commentary") {
      // The envelope started this call, not the owner. A comment that failed is
      // logged and dropped: no partial turn, no retry, and no error bubble for
      // a question that was never asked. The card already said what happened.
      // The one event (Task 153): a message-less error, so a renderer showing
      // the comment mid-stream releases its indicator instead of holding it
      // forever. Nothing is persisted and nothing is surfaced as an error.
      logError("conductor:commentary", err);
      onDelta({ dir, conversationId: id, kind: "error", turnKind: kind });
    } else if (controller.signal.aborted) {
      const cairnTurn: CairnChatTurn = { role: "cairn", text: `${publicFull}\n\n(stopped early)`, ts: new Date().toISOString() };
      try {
        appendCairnTurn(dir, id, cairnTurn);
        // Carry the exact persisted turn so a renderer reattaching concurrently
        // can deduplicate it by identity instead of fabricating a second turn
        // with a different timestamp.
        onDelta({ dir, conversationId: id, kind: "error", turn: cairnTurn, message: "Stopped.", turnKind: kind });
      } catch (persistError) {
        logError("conductor:stopped-partial", persistError);
        const recovered = persistError instanceof ConversationAppendUncertainError
          && recoveredCairnTurn(dir, id, cairnTurn);
        // Persistence is fallible, but the renderer must always receive one
        // terminal event and release its streaming state.
        onDelta({
          dir,
          conversationId: id,
          kind: "error",
          ...(recovered ? { turn: cairnTurn } : {}),
          message: recovered
            ? "Stopped. Cairn saved the partial reply, but final append verification failed."
            : persistError instanceof ConversationAppendUncertainError
              ? "Stopped. Cairn could not confirm whether the partial reply finished saving."
              : "Stopped. Cairn could not save the partial reply.",
          turnKind: kind,
        });
      }
    } else if (err instanceof ConversationAppendUncertainError && completedTurn !== null) {
      const recovered = recoveredCairnTurn(dir, id, completedTurn);
      onDelta({
        dir,
        conversationId: id,
        kind: "error",
        ...(recovered ? { turn: completedTurn } : {}),
        message: recovered ? CAIRN_TURN_POSTWRITE_VERIFICATION_FAILED : CAIRN_TURN_PERSISTENCE_UNCERTAIN,
        turnKind: kind,
      });
    } else if (err instanceof ConductorHttpError) {
      onDelta({ dir, conversationId: id, kind: "error", message: err.ownerMessage, turnKind: kind });
    } else {
      logError("conductor:send", err);
      onDelta({ dir, conversationId: id, kind: "error", message: "Cairn had a problem answering. Trying again in a moment usually works.", turnKind: kind });
    }
  } finally {
    controllers.delete(actionKey(dir));
  }
}
