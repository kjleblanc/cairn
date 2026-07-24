import type {
  ConductorConnectRequest,
  ConductorConsentCard,
  ConductorConversationSummary,
  ConductorDelta,
  ConductorStatus,
  ConductorTurn,
  Result,
} from "../../shared/ipc.js";
import { isTaskRunning } from "../tasks.js";
import { logError } from "../log.js";
import { ConductorHttpError, promptTooLarge, streamChat, type ChatTurnMessage, type SlotWithKey } from "./client.js";
import { CONSTITUTION } from "./constitution.js";
import { assembleBriefing } from "./context.js";
import * as keystore from "./keystore.js";
import type { StoredConnection } from "./keystore.js";
import { appendTurn, ensureCairnExcluded, listConversations, newConversationId, readTurns } from "./store.js";
import { extractTaskBlock } from "./taskblock.js";

const CONNECT_NOT_AUTHORIZED = "CONDUCTOR_CONNECT_NOT_AUTHORIZED";
const ENCRYPTION_UNAVAILABLE = "This computer cannot store the key securely, so Cairn did not save it.";
const PROMPT_TOO_LARGE_MESSAGE =
  "This conversation has grown past what Cairn can safely send. Start a new conversation — the project records keep what matters.";

/** One AbortController per project dir, so a stray second send can't stomp
 * on a stream already in flight and `stop` has something to abort. */
const controllers = new Map<string, AbortController>();

/** The owner-facing disclosure Cairn shows before it may act on the
 * conversation without per-message approval. Main re-derives this from the
 * renderer's baseUrl+model and requires an exact match before connecting —
 * the renderer's copy is never trusted on its own. */
export function conductorConsentCard(baseUrl: string, model: string): ConductorConsentCard {
  return {
    provider: new URL(baseUrl).host,
    baseUrl,
    model,
    data: "Your messages, this project's task records (PROJECT, the work log, recent briefs and reports), a summary of recent saved changes (the branch name and latest commit titles), and project file names. Never file contents. Never credentials. Cairn keeps conversation memory in a .cairn folder inside your project, kept out of git.",
    cost: "Pay-as-you-go on your provider account. Conversation runs without per-message approval while connected. Disconnect at any time to delete the stored key.",
  };
}

function sameCard(a: ConductorConsentCard, b: ConductorConsentCard): boolean {
  return a.provider === b.provider && a.baseUrl === b.baseUrl && a.model === b.model && a.data === b.data && a.cost === b.cost;
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

/** Aborts the in-flight stream for `dir`, if any. The stream's own catch
 * block persists the partial turn and emits the stopped delta. */
export function stop(dir: string): void {
  controllers.get(dir)?.abort();
}

/** Starts (or continues) a conversation for `dir`. Returns immediately with
 * the conversation id; the reply streams afterward over `onDelta`. */
export function send(
  dir: string,
  conversationId: string | null,
  text: string,
  onDelta: (delta: ConductorDelta) => void,
): Result<{ conversationId: string }> {
  if (isTaskRunning(dir)) {
    return { ok: false, message: "SERIAL_RUN_ACTIVE: A task is already running for this project. Wait for it to finish before messaging Cairn." };
  }
  if (controllers.has(dir)) {
    return { ok: false, message: "Cairn is already answering for this project. Wait for that reply, or stop it first." };
  }
  const conn = keystore.readConnection();
  if (!conn) {
    return { ok: false, message: "Connect to a provider before messaging Cairn." };
  }

  const id = conversationId ?? newConversationId(dir);
  ensureCairnExcluded(dir);
  appendTurn(dir, id, { role: "owner", text, ts: new Date().toISOString() });

  const controller = new AbortController();
  controllers.set(dir, controller);
  void runStream(dir, id, conn, controller, onDelta);

  return { ok: true, value: { conversationId: id } };
}

async function runStream(
  dir: string,
  id: string,
  conn: StoredConnection,
  controller: AbortController,
  onDelta: (delta: ConductorDelta) => void,
): Promise<void> {
  let full = "";
  let tokens: number | undefined;
  let costUsd: number | undefined;
  try {
    const history = readTurns(dir, id);
    const messages: ChatTurnMessage[] = [
      { role: "system", content: CONSTITUTION },
      { role: "system", content: assembleBriefing(dir) },
      ...history.map((turn): ChatTurnMessage => ({ role: turn.role === "owner" ? "user" : "assistant", content: turn.text })),
    ];
    // The owner's turn is already persisted by `send()` above, so the record
    // stays truthful either way; checked here, before any network call, so
    // an oversized conversation fails instantly and for its real reason
    // instead of surfacing later as an opaque provider error.
    if (promptTooLarge(messages)) {
      onDelta({ dir, conversationId: id, kind: "error", message: PROMPT_TOO_LARGE_MESSAGE });
      return;
    }
    const slot: SlotWithKey = { baseUrl: conn.baseUrl, model: conn.model, apiKey: keystore.decryptedKey(conn) };

    for await (const event of streamChat(slot, messages, fetch, controller.signal)) {
      if (event.kind === "delta" && event.text) {
        full += event.text;
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
    onDelta({ dir, conversationId: id, kind: "done", turn: cairnTurn, taskBlock: block });
  } catch (err) {
    if (controller.signal.aborted) {
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
