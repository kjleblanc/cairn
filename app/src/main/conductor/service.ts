import { shell } from "electron";
import type {
  ConductorConnectRequest,
  ConductorConsentCard,
  ConductorConversationSummary,
  ConductorDelta,
  ConductorOAuthEvent,
  ConductorOAuthRequest,
  ConductorStatus,
  ConductorStreamSnapshot,
  ConductorTurn,
  Result,
  ResultCard,
} from "../../shared/ipc.js";
import { OPENROUTER_BASE_URL } from "../../shared/bodies.js";
import { isQuitDraining, isTaskRunning } from "../rungate.js";
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
import { appendTurn, ensureCairnExcluded, listConversations, newConversationId, readTurns } from "./store.js";
import { extractTaskBlock } from "./taskblock.js";

const CONNECT_NOT_AUTHORIZED = "CONDUCTOR_CONNECT_NOT_AUTHORIZED";
const OAUTH_NOT_AUTHORIZED = "CONDUCTOR_OAUTH_NOT_AUTHORIZED";
const ENCRYPTION_UNAVAILABLE = "This computer cannot store the key securely, so Cairn did not save it.";
const PROMPT_TOO_LARGE_MESSAGE =
  "This conversation has grown past what Cairn can safely send. Start a new conversation — the project records keep what matters.";

/**
 * What a turn is FOR. The streaming body is one and the same; this decides
 * three things about it.
 *
 * A "reply" answers the owner. They asked, so a proposed task is welcome and a
 * failure is theirs to see and retry.
 *
 * "commentary" is the ENVELOPE's own paid call, on a card the owner asked
 * nothing about. It proposes nothing — a comment on finished work is not a
 * pitch for more — and if it fails, the card stands alone rather than growing
 * an error bubble and a "Try again" for a question no one asked.
 */
type TurnKind = "reply" | "commentary";

/**
 * The envelope's whole request of the conductor, verbatim.
 *
 * The card itself is already in the prompt: it rides the history as SYSTEM
 * context through `cardBriefing`, which keeps the report's own separation —
 * what Cairn's runtime verified under one label, what the worker claims under
 * another. So this says only what to do with it: comment once, in plain words,
 * on the records rather than on impressions, and propose nothing.
 */
const COMMENTARY_INSTRUCTION = "The envelope just posted the result card above. Add one short plain-language comment for the owner. State result facts only from the card or the records in your briefing, and name your source. Do not propose a task.";

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
};

const controllers = new Map<string, LiveStream>();

/** The owner-facing disclosure Cairn shows before it may act on the
 * conversation without per-message approval. Main re-derives this from the
 * renderer's baseUrl+model and requires an exact match before connecting —
 * the renderer's copy is never trusted on its own. The sentences live in
 * `consent.ts`, pure, so the unit suite pins them without booting the app. */
export function conductorConsentCard(baseUrl: string, model: string): ConductorConsentCard {
  return consentCardFor(baseUrl, model);
}

function sameCard(a: ConductorConsentCard, b: ConductorConsentCard): boolean {
  return a.provider === b.provider && a.baseUrl === b.baseUrl && a.model === b.model && a.data === b.data && a.cost === b.cost && a.checkbox === b.checkbox;
}

export function status(): ConductorStatus {
  const conn = keystore.readConnection();
  return {
    connected: conn !== null,
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
  if (!sameCard(expected, request.card) || request.consentConfirmed !== true) {
    return { ok: false, message: CONNECT_NOT_AUTHORIZED };
  }
  if (!keystore.encryptionAvailable()) {
    return { ok: false, message: ENCRYPTION_UNAVAILABLE };
  }
  keystore.saveKey(request.card.baseUrl, request.card.model, request.apiKey);
  return { ok: true, value: null };
}

export function disconnect(): void {
  keystore.clearConnection();
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
  if (!sameCard(expected, request.card) || request.consentConfirmed !== true) {
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
        keystore.saveKey(request.card.baseUrl, request.card.model, key);
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
  if (!keystore.updateModel(model)) {
    throw new Error("Connect to a provider before changing the model.");
  }
}

export function conversations(dir: string): ConductorConversationSummary[] {
  return listConversations(dir);
}

export function turns(dir: string, id: string): ConductorTurn[] {
  return readTurns(dir, id);
}

/** Bounded visible state for renderer reattachment. The provider request,
 * credentials, raw events, and every other project's stream remain private to
 * the main process. */
export function current(dir: string): ConductorStreamSnapshot | null {
  const live = controllers.get(dir);
  if (!live) return null;
  return {
    dir,
    conversationId: live.conversationId,
    kind: live.kind,
    startedAt: live.startedAt,
    text: live.text,
  };
}

/** Aborts the in-flight stream for `dir`, if any. The stream's own catch
 * block persists the partial turn and emits the stopped delta. */
export function stop(dir: string): void {
  controllers.get(dir)?.controller.abort();
}

/** Starts (or continues) a conversation for `dir`. Returns immediately with
 * the conversation id; the reply streams afterward over `onDelta`. */
export function send(
  dir: string,
  conversationId: string | null,
  text: string,
  onDelta: (delta: ConductorDelta) => void,
): Result<{ conversationId: string }> {
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
  if (isTaskRunning(dir)) {
    return { ok: false, message: "SERIAL_RUN_ACTIVE: A task is already running for this project. Wait for it to finish before messaging Cairn." };
  }
  // The refusal names the stream that is actually in flight. A reply the owner
  // started is on screen with a Stop control under it; a comment the envelope
  // started has neither, so telling the owner to stop it would point at nothing.
  const live = controllers.get(dir);
  if (live) {
    return { ok: false, message: live.kind === "commentary"
      ? "Cairn is finishing a short comment on the result card. Try again in a moment."
      : "Cairn is already answering for this project. Wait for that reply, or stop it first." };
  }
  const conn = keystore.readConnection();
  if (!conn) {
    return { ok: false, message: "Connect to a provider before messaging Cairn." };
  }

  const id = conversationId ?? newConversationId(dir);
  ensureCairnExcluded(dir);
  appendTurn(dir, id, { role: "owner", text, ts: new Date().toISOString() });

  const controller = new AbortController();
  controllers.set(dir, {
    controller,
    kind: "reply",
    conversationId: id,
    startedAt: new Date().toISOString(),
    text: "",
  });
  void streamTurn(dir, id, conn, controller, onDelta, "reply");

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
  const conn = keystore.readConnection();
  if (!conn) return;
  if (controllers.has(dir)) return;
  if (isTaskRunning(dir)) return;
  if (isQuitDraining()) return;
  // The instruction says "the card above", so the card has to really be there.
  // `readTurns` DROPS an envelope line whose card fails its guard, and a card
  // the conversation cannot read back is a card the model cannot see: better
  // silence than a comment on a run that is not in front of it.
  const posted = readTurns(dir, conversationId).at(-1);
  if (!posted || posted.role !== "envelope" || JSON.stringify(posted.card) !== JSON.stringify(card)) return;

  const controller = new AbortController();
  controllers.set(dir, {
    controller,
    kind: "commentary",
    conversationId,
    startedAt: new Date().toISOString(),
    text: "",
  });
  void streamTurn(dir, conversationId, conn, controller, onDelta, "commentary");
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
): Promise<void> {
  let full = "";
  let tokens: number | undefined;
  let costUsd: number | undefined;
  try {
    const history = readTurns(dir, id);
    // Task 127's custom-seat note goes right after the briefing, before any
    // history: it is a code-assembled connection fact (model id + host only,
    // both already visible to the provider), never the owner's words and
    // never a secret. Curated seats add nothing (`null`).
    const seatNote = connectionNoteFor(conn.baseUrl, conn.model);
    const messages: ChatTurnMessage[] = [
      { role: "system", content: CONSTITUTION },
      { role: "system", content: assembleBriefing(dir) },
      ...(seatNote ? [{ role: "system", content: seatNote } satisfies ChatTurnMessage] : []),
      // A result card enters the prompt as SYSTEM context, labeled for what it
      // is: Cairn's runtime wrote it, the conversation model did not, and the
      // model must not mistake it for its own earlier reply. `cardBriefing`
      // carries the report's own separation — verified facts under one label,
      // the worker's claims under another — so the model can never read a
      // claim as something Cairn verified.
      ...history.map((turn): ChatTurnMessage => (turn.role === "envelope"
        ? { role: "system", content: cardBriefing(turn.card) }
        : { role: turn.role === "owner" ? "user" : "assistant", content: turn.text })),
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
      if (kind === "reply") onDelta({ dir, conversationId: id, kind: "error", message: PROMPT_TOO_LARGE_MESSAGE });
      return;
    }
    const slot: SlotWithKey = { baseUrl: conn.baseUrl, model: conn.model, apiKey: keystore.decryptedKey(conn) };

    for await (const event of streamChat(slot, messages, fetch, controller.signal)) {
      if (event.kind === "delta" && event.text) {
        full += event.text;
        const live = controllers.get(dir);
        if (live?.controller === controller) live.text = full;
        onDelta({ dir, conversationId: id, kind: "delta", text: event.text });
      } else if (event.kind === "usage") {
        tokens = (event.promptTokens ?? 0) + (event.completionTokens ?? 0);
        costUsd = event.costUsd;
      }
    }

    const { block, text } = extractTaskBlock(full);
    const cairnTurn: ConductorTurn = {
      role: "cairn",
      text,
      ts: new Date().toISOString(),
      ...(tokens !== undefined ? { tokens } : {}),
      ...(costUsd !== undefined ? { costUsd } : {}),
    };
    appendTurn(dir, id, cairnTurn);
    // "Do not propose a task" is enforced here as well as asked for above: a
    // model that emits a block anyway has its fence stripped from the text like
    // any other, and the proposal is dropped rather than put on screen as a
    // card the owner never asked a question to get.
    onDelta({ dir, conversationId: id, kind: "done", turn: cairnTurn, taskBlock: kind === "reply" ? block : null });
  } catch (err) {
    if (kind === "commentary") {
      // The envelope started this call, not the owner. A comment that failed is
      // logged and dropped: no partial turn, no retry, and no error bubble for
      // a question that was never asked. The card already said what happened.
      logError("conductor:commentary", err);
    } else if (controller.signal.aborted) {
      const cairnTurn: ConductorTurn = { role: "cairn", text: `${full}\n\n(stopped early)`, ts: new Date().toISOString() };
      appendTurn(dir, id, cairnTurn);
      onDelta({ dir, conversationId: id, kind: "error", message: "Stopped." });
    } else if (err instanceof ConductorHttpError) {
      onDelta({ dir, conversationId: id, kind: "error", message: err.ownerMessage });
    } else {
      logError("conductor:send", err);
      onDelta({ dir, conversationId: id, kind: "error", message: "Cairn had a problem answering. Trying again in a moment usually works." });
    }
  } finally {
    controllers.delete(dir);
  }
}
