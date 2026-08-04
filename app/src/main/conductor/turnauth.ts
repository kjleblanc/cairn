import { createHash } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import type { TaskRequestRow, TaskRequestView } from "@cairn/core";
import { assertConversationId } from "./conversation-id.js";
import { appendVerifiedDigest, appendVerifiedLine, externalMarkerContainer, readDigestSequence, readStrictVerifiedLines, readVerifiedLines } from "./custody.js";

const OWNER_TURN_DOMAIN = "cairn-owner-turn/v1";
const CAIRN_TURN_DOMAIN = "cairn-conductor-turn/v1";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TRANSCRIPT_EVENT = /^(?:owner|cairn|envelope):[0-9a-f]{64}$/;
const FORBIDDEN_VISIBLE_CONTROLS = /[\u0000\u202a-\u202e\u2066-\u2069]/u;

let markerDir: string | null = null;

export type OwnerReplyContext =
  | Readonly<{ kind: "question"; response: "answer" | "defer"; question: string }>
  | Readonly<{ kind: "risk"; response: "set-aside"; risk: string }>
  | Readonly<{ kind: "task"; response: "correction"; request: TaskRequestView; context: readonly string[] }>;

/** Configure an owner-turn custody store outside every selected project. */
export function setTurnMarkerDir(dir: string | null): void {
  markerDir = dir;
}

export function isOwnerTurnId(value: unknown): value is string {
  return typeof value === "string" && UUID_V4.test(value);
}

export function canonicalProjectPath(dir: string): string {
  const lexical = resolve(dir);
  try {
    return realpathSync.native(lexical);
  } catch {
    // A missing path has no alias to collapse. Callers that write/read a real
    // project will reach this helper again after normal project validation.
    return lexical;
  }
}

export function canonicalProjectKey(dir: string): string {
  const real = canonicalProjectPath(dir);
  // `realpathSync.native` already collapses ordinary Windows case aliases to
  // the on-disk spelling. Preserve that spelling: Windows can opt individual
  // directories into case sensitivity, where lowercasing would merge two
  // genuinely different projects and their authority ledgers.
  return real.replace(/\\/g, "/");
}

function canonical(value: unknown): string {
  if (value === undefined || value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}

function exactRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) return null;
  return value as Record<string, unknown>;
}

function wellFormedUtf16(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function safeVisibleText(value: unknown, cap: number, singleLine = false): value is string {
  return typeof value === "string"
    && value.length <= cap
    && value.trim().length > 0
    && (!singleLine || !/[\r\n]/.test(value))
    && !FORBIDDEN_VISIBLE_CONTROLS.test(value)
    && wellFormedUtf16(value);
}

function requestRow(value: unknown, textCap: number): TaskRequestRow | null {
  const record = exactRecord(value, ["source", "text", "ownerText"]);
  if (!record || !safeVisibleText(record.text, textCap)) return null;
  if (record.source === "cairn-chosen") {
    if (record.ownerText !== null) return null;
    return Object.freeze({ source: record.source, text: record.text, ownerText: null });
  }
  if (record.source !== "owner-stated" && record.source !== "owner-unsure") return null;
  if (!safeVisibleText(record.ownerText, 2_000)) return null;
  return Object.freeze({ source: record.source, text: record.text, ownerText: record.ownerText });
}

function requestView(value: unknown): TaskRequestView | null {
  const record = exactRecord(value, ["outcome", "requirements"]);
  if (!record || !Array.isArray(record.requirements) || record.requirements.length > 8) return null;
  const outcome = requestRow(record.outcome, 300);
  if (!outcome) return null;
  const requirements: TaskRequestRow[] = [];
  for (const value of record.requirements) {
    const row = requestRow(value, 500);
    if (!row) return null;
    requirements.push(row);
  }
  return Object.freeze({ outcome, requirements: Object.freeze(requirements) });
}

/** Exact-validate and detach the only marker-bound context shapes main may
 * place beside an owner turn. These contain meaning, never live action IDs. */
export function validateOwnerReplyContext(value: unknown): OwnerReplyContext | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const kind = (value as Record<string, unknown>).kind;
    if (kind === "question") {
      const record = exactRecord(value, ["kind", "response", "question"]);
      if (!record || (record.response !== "answer" && record.response !== "defer")) return null;
      if (!safeVisibleText(record.question, 300, true)) return null;
      return Object.freeze({ kind, response: record.response, question: record.question.trim() });
    }
    if (kind === "risk") {
      const record = exactRecord(value, ["kind", "response", "risk"]);
      if (!record || record.response !== "set-aside" || !safeVisibleText(record.risk, 300, true)) return null;
      return Object.freeze({ kind, response: "set-aside", risk: record.risk.trim() });
    }
    if (kind === "task") {
      const record = exactRecord(value, ["kind", "response", "request", "context"]);
      if (!record || record.response !== "correction" || !Array.isArray(record.context) || record.context.length > 3) return null;
      const request = requestView(record.request);
      if (!request) return null;
      const context: string[] = [];
      let contextTotal = 0;
      for (const item of record.context) {
        if (!safeVisibleText(item, 1_000)) return null;
        contextTotal += item.length;
        if (contextTotal > 1_000) return null;
        context.push(item);
      }
      const total = canonical(request).length + contextTotal;
      if (total > 32_000) return null;
      return Object.freeze({ kind, response: "correction", request, context: Object.freeze(context) });
    }
    return null;
  } catch {
    return null;
  }
}

export function turnDigest(
  dir: string,
  conversationId: string,
  inputId: string,
  ts: string,
  text: string,
  replyContext: OwnerReplyContext | null,
): string {
  assertConversationId(conversationId);
  return createHash("sha256")
    .update(canonical([OWNER_TURN_DOMAIN, canonicalProjectKey(dir), conversationId, inputId, ts, text, replyContext]))
    .digest("hex");
}

function markerFile(dir: string, containerName: string, create: boolean): string | null {
  const container = externalMarkerContainer(markerDir, dir, containerName, create);
  if (container === null) return null;
  const name = createHash("sha256").update(canonicalProjectKey(dir)).digest("hex");
  return join(container, `${name}.txt`);
}

export type TranscriptEventKind = "owner" | "cairn" | "envelope";

/** One protected ordering ledger for every main-authenticated conversation
 * event. Role-specific marker files prove authorship; this sequence also
 * prevents project-owned JSONL from moving genuine owner, Cairn, or envelope
 * turns around one another before they re-enter a provider prompt. */
export function recordTranscriptEventMarker(dir: string, kind: TranscriptEventKind, digest: string): void {
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error("TRANSCRIPT_EVENT_INVALID");
  const file = markerFile(dir, "conversation-event-markers", true);
  if (file === null) throw new Error("TRANSCRIPT_EVENT_STORE_UNAVAILABLE");
  appendVerifiedLine(file, `${kind}:${digest}`, TRANSCRIPT_EVENT);
}

export function transcriptEventSequence(dir: string): readonly string[] {
  try {
    return readVerifiedLines(markerFile(dir, "conversation-event-markers", false), TRANSCRIPT_EVENT);
  } catch {
    return Object.freeze([]);
  }
}

/** Write custody before the project-owned conversation line. */
export function recordTurnMarker(
  dir: string,
  conversationId: string,
  inputId: string,
  ts: string,
  text: string,
  replyContext: OwnerReplyContext | null,
): void {
  if (!isOwnerTurnId(inputId) || typeof ts !== "string" || !ts || typeof text !== "string") {
    throw new Error("INVALID_OWNER_TURN_MARKER: Cairn refused malformed owner-turn custody data.");
  }
  assertConversationId(conversationId);
  const checkedContext = replyContext === null ? null : validateOwnerReplyContext(replyContext);
  if (replyContext !== null && checkedContext === null) {
    throw new Error("INVALID_OWNER_TURN_MARKER: Cairn refused malformed owner reply context.");
  }
  let file: string | null;
  try {
    file = markerFile(dir, "owner-turn-markers", true);
  } catch {
    throw new Error("TURN_MARKER_CUSTODY_UNSAFE: The owner-turn marker store must stay outside the selected project.");
  }
  if (file === null) {
    throw new Error("TURN_MARKER_STORE_UNAVAILABLE: Cairn cannot authenticate this owner turn.");
  }
  const digest = turnDigest(dir, conversationId, inputId, ts, text, checkedContext);
  // A process can die after writing only part of a line. Separate that stale
  // tail before adding the new digest, then prove this exact append is
  // independently readable before project-owned JSONL may be touched.
  try {
    appendVerifiedDigest(file, digest);
    recordTranscriptEventMarker(dir, "owner", digest);
  } catch {
    throw new Error("TURN_MARKER_VERIFY_FAILED: Cairn could not verify owner-turn custody.");
  }
}

/** Ordered marker evidence. Order is retained so project-owned JSONL cannot
 * reorder two genuine owner turns and invert which correction was latest. */
export function turnMarkerSequence(dir: string): readonly string[] {
  try {
    return readDigestSequence(markerFile(dir, "owner-turn-markers", false));
  } catch {
    return Object.freeze([]);
  }
}

export function turnMarkers(dir: string): ReadonlySet<string> {
  return new Set(turnMarkerSequence(dir));
}

export function cairnTurnDigest(dir: string, conversationId: string, turn: unknown): string {
  assertConversationId(conversationId);
  return createHash("sha256")
    .update(canonical([CAIRN_TURN_DOMAIN, canonicalProjectKey(dir), conversationId, turn]))
    .digest("hex");
}

/** Vouch for one exact main-produced Cairn reply before it enters the
 * project-writable transcript. */
export function recordCairnTurnMarker(dir: string, conversationId: string, turn: unknown): void {
  assertConversationId(conversationId);
  let file: string | null;
  try {
    file = markerFile(dir, "cairn-turn-markers", true);
  } catch {
    throw new Error("CAIRN_TURN_MARKER_CUSTODY_UNSAFE: Cairn reply custody must stay outside the selected project.");
  }
  if (file === null) throw new Error("CAIRN_TURN_MARKER_STORE_UNAVAILABLE: Cairn cannot authenticate its reply.");
  try {
    const digest = cairnTurnDigest(dir, conversationId, turn);
    appendVerifiedDigest(file, digest);
    recordTranscriptEventMarker(dir, "cairn", digest);
  } catch {
    throw new Error("CAIRN_TURN_MARKER_VERIFY_FAILED: Cairn could not verify reply custody.");
  }
}

export function cairnTurnMarkers(dir: string): ReadonlySet<string> {
  try {
    return new Set(readDigestSequence(markerFile(dir, "cairn-turn-markers", false)));
  } catch {
    return new Set();
  }
}

/** Reserve the next never-reused three-digit id in main-owned custody. The
 * project scan seeds an upgrade; after the first reservation, deleting JSONL
 * cannot lower this external high-water mark. Null means the marker root is
 * intentionally unconfigured (unit/legacy callers); production configures it. */
export function reserveConversationId(dir: string, observedMax: number): string | null {
  if (!Number.isInteger(observedMax) || observedMax < 0 || observedMax > 999) {
    throw new Error("CONDUCTOR_CONVERSATION_INVALID: Cairn refused an invalid conversation high-water mark.");
  }
  let file: string | null;
  try {
    file = markerFile(dir, "conversation-id-markers", true);
  } catch {
    throw new Error("CONDUCTOR_CONVERSATION_CUSTODY_UNSAFE: Conversation identity custody must stay outside the project.");
  }
  if (file === null) return null;
  const existed = existsSync(file);
  const lines = readStrictVerifiedLines(file, /^(?:00[1-9]|0[1-9]\d|[1-9]\d{2})$/);
  if (existed && lines.length === 0) throw new Error("CONDUCTOR_CONVERSATION_LEDGER_INVALID");
  let previous = 0;
  for (const line of lines) {
    const current = Number(line);
    if (current <= previous) throw new Error("CONDUCTOR_CONVERSATION_LEDGER_INVALID");
    previous = current;
  }
  const externalMax = lines.reduce((max, line) => Math.max(max, Number(line)), 0);
  const next = Math.max(observedMax, externalMax) + 1;
  if (next > 999) throw new Error("CONDUCTOR_CONVERSATION_LIMIT: This project has reached conversation 999.");
  const id = String(next).padStart(3, "0");
  appendVerifiedLine(file, id, /^(?:00[1-9]|0[1-9]\d|[1-9]\d{2})$/);
  return id;
}
