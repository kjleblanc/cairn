import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, constants, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { types as nodeTypes } from "node:util";
import { isEvidenceRunId, TASK_SPEC_RESULT_PROJECTION_VERSION } from "../../shared/ipc.js";
import type { ConductorChatTurn, ConductorTurn, ResultCard } from "../../shared/ipc.js";
import { parseTaskReviewProjection } from "../../shared/task-review.js";
import type { TaskIntentSourceInput } from "@cairn/core";
import { cardDigest, cardDigestCandidates, cardMarkers, recordCardMarker } from "./cardauth.js";
import { sanitizeFollowups } from "./followups.js";
import { assertConversationId, isConversationId } from "./conversation-id.js";
import {
  cairnTurnDigest,
  cairnTurnMarkers,
  canonicalProjectPath,
  isOwnerTurnId,
  recordCairnTurnMarker,
  recordTranscriptEventMarker,
  recordTurnMarker,
  reserveConversationId,
  transcriptEventSequence,
  turnDigest,
  turnMarkerSequence,
  validateOwnerReplyContext,
  type OwnerReplyContext,
} from "./turnauth.js";

const IGNORE_LINE = "/.cairn/";
const ATTRIBUTION_SOURCE_CAP = 200_000;
const CONVERSATION_BYTE_CAP = 8 * 1024 * 1024;
const FORBIDDEN_ATTRIBUTION_CONTROLS = /[\u0000\u202a-\u202e\u2066-\u2069]/u;
const REQUEST_OUTCOME_CAP = 300;
const REQUEST_REQUIREMENT_CAP = 500;
const REQUEST_OWNER_TEXT_CAP = 2_000;
const REQUEST_REQUIREMENT_COUNT_CAP = 8;
const REQUEST_VISIBLE_TOTAL_CAP = 6_000;
const TASK_SPEC_ROW_CAP = 12;
const TASK_SPEC_ATTESTATION_CAP = 12;
const TASK_SPEC_CHANGE_CAP = 50;
const SHA256 = /^[a-f0-9]{64}$/;

/** Once an append syscall starts, a later error cannot honestly prove that no
 * bytes reached disk. Callers that gate one-time authority must distinguish
 * that state from a pre-write refusal. */
export class ConversationAppendUncertainError extends Error {
  readonly mayHavePersisted = true;

  constructor(cause: unknown) {
    super("CONDUCTOR_HISTORY_APPEND_UNCERTAIN: Cairn could not prove whether the conversation append completed.", { cause });
    this.name = "ConversationAppendUncertainError";
  }
}

export function conversationsDir(root: string): string {
  return join(canonicalProjectPath(root), ".cairn", "conversations");
}

function inside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..\\`) && !rel.startsWith("../") && !isAbsolute(rel));
}

function sameIdentity(left: { dev: bigint; ino: bigint }, right: { dev: bigint; ino: bigint }): boolean {
  return left.dev === right.dev && left.ino !== 0n && right.ino !== 0n && left.ino === right.ino;
}

/** Walk only Cairn's two fixed project-owned directories. Missing segments
 * are created one at a time; existing links/junctions never get followed. */
function safeConversationsDir(root: string, create: boolean): string | null {
  try {
    const project = realpathSync.native(canonicalProjectPath(root));
    if (!lstatSync(project).isDirectory()) throw new Error("unsafe");
    let current = project;
    for (const segment of [".cairn", "conversations"] as const) {
      const candidate = join(current, segment);
      if (!existsSync(candidate)) {
        if (!create) return null;
        mkdirSync(candidate, { mode: 0o700 });
      }
      const stat = lstatSync(candidate);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("unsafe");
      const real = realpathSync.native(candidate);
      if (!inside(project, real)) throw new Error("unsafe");
      current = real;
    }
    return current;
  } catch (error) {
    if (!create && error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new Error("CONDUCTOR_HISTORY_UNSAFE: Cairn refused a linked or changed conversation path.");
  }
}

type SafeConversation = { descriptor: number; path: string; directory: string };

function openConversation(root: string, id: string, create: boolean): SafeConversation | null {
  assertConversationId(id);
  const directory = safeConversationsDir(root, create);
  if (directory === null) return null;
  const path = join(directory, `${id}.jsonl`);
  const existed = existsSync(path);
  if (!existed && !create) return null;
  let descriptor: number | null = null;
  try {
    if (existed) {
      const before = lstatSync(path, { bigint: true });
      if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
        || !inside(directory, realpathSync.native(path))) throw new Error("unsafe");
    }
    const flags = create
      ? constants.O_RDWR | constants.O_APPEND | constants.O_CREAT | (!existed ? constants.O_EXCL : 0) | (constants.O_NOFOLLOW ?? 0)
      : constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0);
    descriptor = openSync(path, flags, 0o600);
    const opened = fstatSync(descriptor, { bigint: true });
    const current = lstatSync(path, { bigint: true });
    const checkedDirectory = safeConversationsDir(root, false);
    if (checkedDirectory !== directory || !opened.isFile() || !current.isFile() || current.isSymbolicLink()
      || opened.nlink !== 1n || current.nlink !== 1n || !sameIdentity(opened, current)
      || !inside(directory, realpathSync.native(path)) || opened.size > BigInt(CONVERSATION_BYTE_CAP)) {
      throw new Error("unsafe");
    }
    return { descriptor, path, directory };
  } catch {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* refusal is already final */ }
    }
    throw new Error("CONDUCTOR_HISTORY_UNSAFE: Cairn refused a linked or changed conversation path.");
  }
}

/** Append through the exact descriptor whose path and link identity were
 * checked. A crash-partial tail is isolated before the complete new line. */
function appendJsonLine(root: string, id: string, value: unknown): void {
  const opened = openConversation(root, id, true);
  if (opened === null) throw new Error("CONDUCTOR_HISTORY_UNSAFE");
  const { descriptor } = opened;
  let failure: unknown = null;
  let writeStarted = false;
  try {
    const before = fstatSync(descriptor, { bigint: true });
    let separator = "";
    if (before.size > 0n) {
      const tail = Buffer.allocUnsafe(1);
      if (readSync(descriptor, tail, 0, 1, Number(before.size - 1n)) !== 1 || tail[0] !== 0x0a) separator = "\n";
    }
    const bytes = Buffer.from(`${separator}${JSON.stringify(value)}\n`, "utf8");
    if (before.size + BigInt(bytes.length) > BigInt(CONVERSATION_BYTE_CAP)) {
      throw new Error("CONDUCTOR_HISTORY_FULL: Start a new conversation before sending more.");
    }
    writeStarted = true;
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    const faultText = process.env.CAIRN_E2E === "1" ? process.env.CAIRN_TEST_APPEND_AFTER_FSYNC_TEXT : undefined;
    const record = value !== null && typeof value === "object" ? value as Record<string, unknown> : null;
    if (faultText !== undefined && (record?.role === "owner" || record?.role === "cairn") && record.text === faultText) {
      throw new Error("CAIRN_TEST_APPEND_AFTER_FSYNC");
    }
    const after = fstatSync(descriptor, { bigint: true });
    if (!sameIdentity(before, after) || after.nlink !== 1n || after.size !== before.size + BigInt(bytes.length)) {
      throw new Error("CONDUCTOR_HISTORY_UNSAFE: Cairn could not verify the conversation append.");
    }
  } catch (error) {
    failure = error;
  }
  try {
    closeSync(descriptor);
  } catch (error) {
    if (failure === null) failure = error;
  }
  if (failure !== null) {
    if (writeStarted) throw new ConversationAppendUncertainError(failure);
    throw failure;
  }
}

function readConversationText(root: string, id: string): string | null {
  const opened = openConversation(root, id, false);
  if (opened === null) return null;
  const { descriptor } = opened;
  try {
    const before = fstatSync(descriptor, { bigint: true });
    if (before.size > BigInt(CONVERSATION_BYTE_CAP)) throw new Error("CONDUCTOR_HISTORY_UNSAFE");
    const size = Number(before.size);
    const bytes = Buffer.allocUnsafe(size);
    let offset = 0;
    while (offset < size) {
      const count = readSync(descriptor, bytes, offset, size - offset, offset);
      if (count <= 0) throw new Error("CONDUCTOR_HISTORY_UNSAFE");
      offset += count;
    }
    const after = fstatSync(descriptor, { bigint: true });
    if (!sameIdentity(before, after) || after.nlink !== 1n || after.size !== before.size) {
      throw new Error("CONDUCTOR_HISTORY_UNSAFE");
    }
    return bytes.toString("utf8");
  } finally {
    closeSync(descriptor);
  }
}

function conversationNames(root: string): string[] {
  const directory = safeConversationsDir(root, false);
  if (directory === null) return [];
  const before = lstatSync(directory, { bigint: true });
  const names = readdirSync(directory);
  const after = lstatSync(directory, { bigint: true });
  if (!sameIdentity(before, after) || safeConversationsDir(root, false) !== directory) {
    throw new Error("CONDUCTOR_HISTORY_UNSAFE: Cairn refused a changed conversation directory.");
  }
  return names;
}

function attributionSourceText(value: string): boolean {
  if (value.length > ATTRIBUTION_SOURCE_CAP || !value.trim() || FORBIDDEN_ATTRIBUTION_CONTROLS.test(value)) return false;
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

/** The project's own `.git-common-dir` (identical across worktrees), or null
 * when `root` is not inside a git repository at all. */
function gitCommonDir(root: string): string | null {
  const projectRoot = canonicalProjectPath(root);
  try {
    const output = execFileSync("git", ["rev-parse", "--git-common-dir"], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!output) return null;
    return isAbsolute(output) ? output : join(projectRoot, output);
  } catch {
    return null;
  }
}

/** Keeps `.cairn/` out of the project's history without ever touching a
 * tracked file: the exclusion lives in `.git/info/exclude`, which is
 * per-clone, untracked, and shared across worktrees via `--git-common-dir`.
 * A project with no git repository is left untouched entirely — no
 * `.gitignore` is ever created as a fallback. Returns whether the line was
 * newly added (append-once, same as the retired `.gitignore` behavior). */
export function ensureCairnExcluded(root: string): boolean {
  const gitDir = gitCommonDir(root);
  if (!gitDir) return false;
  const excludePath = join(gitDir, "info", "exclude");
  const existing = existsSync(excludePath) ? readFileSync(excludePath, "utf8") : "";
  if (existing.split(/\r?\n/).includes(IGNORE_LINE)) return false;
  mkdirSync(join(gitDir, "info"), { recursive: true });
  const prefix = existing.length === 0 || existing.endsWith("\n") ? existing : `${existing}\n`;
  writeFileSync(excludePath, `${prefix}${IGNORE_LINE}\n`, "utf8");
  return true;
}

export function newConversationId(root: string): string {
  let max = 0;
  for (const name of conversationNames(root)) {
    const match = /^(\d{3})\.jsonl$/.exec(name)?.[1];
    if (isConversationId(match)) max = Math.max(max, Number(match));
  }
  // Never reuse a gap: external owner/card markers deliberately outlive a
  // deleted project JSONL, so recycling its id could make old genuine lines
  // valid in a different conversation. A project-written high id can only
  // cause this local feature to refuse; it cannot redirect a path or call.
  if (max >= 999) throw new Error("CONDUCTOR_CONVERSATION_LIMIT: This project has reached conversation 999.");
  return reserveConversationId(root, max) ?? String(max + 1).padStart(3, "0");
}

/**
 * Appends one turn. An envelope turn is VOUCHED FOR first: its marker is
 * recorded outside the project (see `cardauth.ts`) before the line itself is
 * written, so a card that reaches the file is always one `readTurns` will
 * accept. If the marker cannot be recorded this throws and nothing is written
 * — a card whose authorship Cairn cannot later prove is not a card it posts.
 */
export function appendTurn(root: string, id: string, turn: ConductorTurn): void {
  assertConversationId(id);
  if (turn.role === "envelope") {
    if (!isResultCard(turn.card)) {
      throw new Error("INVALID_RESULT_CARD: Cairn refused to persist a malformed result card.");
    }
    recordCardMarker(root, id, turn.ts, turn.card);
    recordTranscriptEventMarker(root, "envelope", cardDigest(root, id, turn.ts, turn.card));
  }
  appendJsonLine(root, id, turn);
}

export interface AuthenticatedOwnerTurn {
  role: "owner";
  inputId: string;
  text: string;
  ts: string;
  replyContext: OwnerReplyContext | null;
}

/** Production owner sends use this path exclusively. Custody is recorded
 * outside the project before the JSONL line; an orphan marker is inert, while
 * a line without its marker can never become attribution evidence. */
export function appendOwnerTurn(root: string, id: string, turn: AuthenticatedOwnerTurn): void {
  assertConversationId(id);
  if (turn.role !== "owner" || !isOwnerTurnId(turn.inputId) || typeof turn.ts !== "string" || !turn.ts || typeof turn.text !== "string") {
    throw new Error("INVALID_OWNER_TURN: Cairn refused malformed owner input.");
  }
  if (!turn.text.trim()) throw new Error("EMPTY_OWNER_TURN: Type a message before sending.");
  const replyContext = turn.replyContext === null ? null : validateOwnerReplyContext(turn.replyContext);
  if (turn.replyContext !== null && replyContext === null) {
    throw new Error("INVALID_OWNER_REPLY_CONTEXT: Cairn refused an invalid action reply.");
  }
  const stored: AuthenticatedOwnerTurn = {
    role: "owner",
    inputId: turn.inputId,
    text: turn.text,
    ts: turn.ts,
    replyContext,
  };
  recordTurnMarker(root, id, stored.inputId, stored.ts, stored.text, stored.replyContext);
  appendJsonLine(root, id, stored);
}

function sanitizedCairnTurn(value: unknown, strictFollowups = false): ConductorChatTurn | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const chat = value as Partial<ConductorChatTurn>;
  if (chat.role !== "cairn" || typeof chat.text !== "string" || typeof chat.ts !== "string") return null;
  const cleaned = "followups" in chat ? sanitizeFollowups(chat.followups) : null;
  if (strictFollowups && "followups" in chat && cleaned === null) return null;
  return Object.freeze({
    role: "cairn",
    text: chat.text,
    ts: chat.ts,
    ...(typeof chat.tokens === "number" && Number.isFinite(chat.tokens) ? { tokens: chat.tokens } : {}),
    ...(typeof chat.costUsd === "number" && Number.isFinite(chat.costUsd) ? { costUsd: chat.costUsd } : {}),
    ...(cleaned !== null ? { followups: cleaned } : {}),
  });
}

/** Production Cairn replies, including commentary and stopped partials, use
 * external custody before entering the worker-writable transcript. */
export function appendCairnTurn(root: string, id: string, turn: ConductorChatTurn): void {
  assertConversationId(id);
  const publicTurn = sanitizedCairnTurn(turn, true);
  if (publicTurn === null) throw new Error("INVALID_CAIRN_TURN: Cairn refused to persist a malformed reply.");
  const stored = Object.freeze({ ...publicTurn, turnId: randomUUID() });
  recordCairnTurnMarker(root, id, stored);
  appendJsonLine(root, id, stored);
}

/**
 * An envelope line is kept only when it really carries a result card: an
 * object whose `kind` is "result", with a known disposition and a real
 * `filesChanged` array. Anything else is DROPPED, never coerced into a card —
 * a half-written or hand-edited line must not become a result the owner reads
 * as Cairn's own verification.
 *
 * Shape is half the question. WHO WROTE IT is the other half, and it is asked
 * separately in `readTurns` — this guard would pass a worker's own perfectly
 * shaped forgery, which is exactly the hole the marker check closes.
 */
function exactDataRecord(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
    const inspected: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
      inspected[key] = descriptor.value;
    }
    return inspected;
  } catch {
    return null;
  }
}

function denseDataArray(value: unknown, cap: number): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || nodeTypes.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > cap) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== value.length + 1 || !ownKeys.includes("length")) return null;
    const inspected: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
      inspected.push(descriptor.value);
    }
    return inspected;
  } catch {
    return null;
  }
}

function safeRequestText(value: unknown, cap: number): value is string {
  if (typeof value !== "string" || value.length > cap || !value.trim() || FORBIDDEN_ATTRIBUTION_CONTROLS.test(value)) return false;
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

function acceptedRequestRow(value: unknown, textCap: number): { readonly size: number; readonly key: string } | null {
  const row = exactDataRecord(value, ["source", "text", "ownerText"]);
  if (!row || !safeRequestText(row.text, textCap)) return null;
  if (row.source === "cairn-chosen") {
    if (row.ownerText !== null) return null;
    return { size: row.text.length, key: JSON.stringify([row.source, row.text, null]) };
  }
  if (row.source !== "owner-stated" && row.source !== "owner-unsure") return null;
  if (!safeRequestText(row.ownerText, REQUEST_OWNER_TEXT_CAP)) return null;
  return {
    size: row.text.length + row.ownerText.length,
    key: JSON.stringify([row.source, row.text, row.ownerText]),
  };
}

function validAcceptedRequestView(value: unknown): boolean {
  const view = exactDataRecord(value, ["outcome", "requirements"]);
  if (!view) return false;
  const requirements = denseDataArray(view.requirements, REQUEST_REQUIREMENT_COUNT_CAP);
  if (!requirements) return false;
  const outcome = acceptedRequestRow(view.outcome, REQUEST_OUTCOME_CAP);
  if (outcome === null) return false;
  const seen = new Set<string>([outcome.key]);
  let total = outcome.size;
  for (const requirement of requirements) {
    const row = acceptedRequestRow(requirement, REQUEST_REQUIREMENT_CAP);
    if (row === null || seen.has(row.key)) return false;
    seen.add(row.key);
    total += row.size;
    if (total > REQUEST_VISIBLE_TOTAL_CAP) return false;
  }
  return total <= REQUEST_VISIBLE_TOTAL_CAP;
}

function safeTaskSpecText(value: unknown, cap: number, meaningful = false): value is string {
  if (typeof value !== "string" || value.length > cap
    || (meaningful && value.trim().length === 0) || FORBIDDEN_ATTRIBUTION_CONTROLS.test(value)) return false;
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

function validTaskSpecResultProjection(value: unknown, card: Partial<ResultCard>): boolean {
  const projection = exactDataRecord(value, [
    "adapterAttestations", "advisoryPreferences", "criticReady", "envelopeResult",
    "evidencePlanSha256", "requestSha256", "requiredPromises", "taskSpecSha256",
    "version", "workerClaims",
  ]);
  if (!projection || projection.version !== TASK_SPEC_RESULT_PROJECTION_VERSION
    || projection.criticReady !== false || typeof projection.requestSha256 !== "string"
    || !SHA256.test(projection.requestSha256) || typeof projection.taskSpecSha256 !== "string"
    || !SHA256.test(projection.taskSpecSha256) || typeof projection.evidencePlanSha256 !== "string"
    || !SHA256.test(projection.evidencePlanSha256)) {
    return false;
  }
  const requestSha256 = projection.requestSha256 as string;
  const taskSpecSha256 = projection.taskSpecSha256 as string;
  const evidencePlanSha256 = projection.evidencePlanSha256 as string;

  const required = denseDataArray(projection.requiredPromises, TASK_SPEC_ROW_CAP);
  const advisory = denseDataArray(projection.advisoryPreferences, TASK_SPEC_ROW_CAP);
  if (!required || required.length === 0 || !advisory) return false;
  const criterionIds: string[] = [];
  for (let index = 0; index < required.length; index += 1) {
    const row = exactDataRecord(required[index], ["id", "promise"]);
    if (!row || row.id !== `c${index + 1}` || !safeTaskSpecText(row.promise, 1_000, true)) return false;
    criterionIds.push(row.id);
  }
  const preferenceIds: string[] = [];
  for (let index = 0; index < advisory.length; index += 1) {
    const row = exactDataRecord(advisory[index], ["desiredDirection", "dimension", "id"]);
    if (!row || row.id !== `p${index + 1}` || !safeTaskSpecText(row.dimension, 1_000, true)
      || !safeTaskSpecText(row.desiredDirection, 1_000, true)) return false;
    preferenceIds.push(row.id);
  }

  const attestations = denseDataArray(projection.adapterAttestations, TASK_SPEC_ATTESTATION_CAP);
  if (!attestations) return false;
  const seenCriteria = new Set<string>();
  const seenSequences = new Set<number>();
  const seenCommandHashes = new Set<string>();
  for (const value of attestations) {
    const attestation = exactDataRecord(value, [
      "commandSha256", "criterionId", "evidencePlanSha256", "exitCode", "sequence",
      "taskSpecSha256", "version",
    ]);
    if (!attestation || attestation.version !== "cairn-adapter-command-attestation/v1"
      || attestation.taskSpecSha256 !== taskSpecSha256 || attestation.evidencePlanSha256 !== evidencePlanSha256
      || typeof attestation.criterionId !== "string" || !criterionIds.includes(attestation.criterionId)
      || seenCriteria.has(attestation.criterionId) || typeof attestation.commandSha256 !== "string"
      || !SHA256.test(attestation.commandSha256) || seenCommandHashes.has(attestation.commandSha256)
      || !Number.isSafeInteger(attestation.sequence)
      || (attestation.sequence as number) < 0 || (attestation.sequence as number) >= 64
      || seenSequences.has(attestation.sequence as number) || !Number.isSafeInteger(attestation.exitCode)
      || Object.is(attestation.exitCode, -0) || (attestation.exitCode as number) < -1
      || (attestation.exitCode as number) > 255) return false;
    seenCriteria.add(attestation.criterionId);
    seenSequences.add(attestation.sequence as number);
    seenCommandHashes.add(attestation.commandSha256);
  }

  let workerClaimDisposition: "DONE" | "STOPPED" | null = null;
  if (projection.workerClaims !== null) {
    const claims = exactDataRecord(projection.workerClaims, [
      "changes", "criteria", "disposition", "howToTry", "limitations", "milestone",
      "preferences", "summary", "taskSpecSha256", "version",
    ]);
    if (!claims || claims.version !== "cairn-task-spec-worker-claims/v1"
      || claims.taskSpecSha256 !== taskSpecSha256
      || (claims.disposition !== "DONE" && claims.disposition !== "STOPPED")
      || (claims.milestone !== "YES" && claims.milestone !== "NO" && claims.milestone !== "UNCLEAR")
      || !safeTaskSpecText(claims.summary, 300, true) || !safeTaskSpecText(claims.howToTry, 2_000, true)
      || !safeTaskSpecText(claims.limitations, 2_000)) return false;
    const changes = denseDataArray(claims.changes, TASK_SPEC_CHANGE_CAP);
    const criteria = denseDataArray(claims.criteria, TASK_SPEC_ROW_CAP);
    const preferences = denseDataArray(claims.preferences, TASK_SPEC_ROW_CAP);
    if (!changes || changes.some((change) => !safeTaskSpecText(change, 500))
      || !criteria || criteria.length !== criterionIds.length
      || !preferences || preferences.length !== preferenceIds.length) return false;
    for (let index = 0; index < criteria.length; index += 1) {
      const claim = exactDataRecord(criteria[index], ["id", "result"]);
      if (!claim || claim.id !== criterionIds[index] || !safeTaskSpecText(claim.result, 500)) return false;
    }
    for (let index = 0; index < preferences.length; index += 1) {
      const claim = exactDataRecord(preferences[index], ["id", "result"]);
      if (!claim || claim.id !== preferenceIds[index] || !safeTaskSpecText(claim.result, 500)) return false;
    }
    workerClaimDisposition = claims.disposition;
  }

  const envelope = exactDataRecord(projection.envelopeResult, [
    "disposition", "requestSha256", "stopReason", "taskNumber", "taskSpecSha256", "version",
  ]);
  if (!envelope || envelope.version !== "cairn-envelope-result/v1"
    || envelope.requestSha256 !== requestSha256 || envelope.taskSpecSha256 !== taskSpecSha256
    || !Number.isSafeInteger(envelope.taskNumber) || (envelope.taskNumber as number) < 1
    || (envelope.disposition !== "DONE" && envelope.disposition !== "STOPPED")
    || (envelope.disposition === "DONE"
      ? envelope.stopReason !== null
      : !safeTaskSpecText(envelope.stopReason, 128, true))
    || envelope.taskNumber !== card.taskNumber || envelope.disposition !== card.disposition
    || envelope.stopReason !== card.stopReason || card.claims !== null) return false;
  if (envelope.disposition === "DONE"
    && (workerClaimDisposition !== "DONE"
      || attestations.length !== criterionIds.length
      || criterionIds.some((criterionId) => !seenCriteria.has(criterionId))
      || criterionIds.some((_, index) => !seenSequences.has(index)))) return false;
  return true;
}

function sameAcceptedRequest(
  left: NonNullable<ResultCard["acceptedRequest"]>,
  right: NonNullable<ResultCard["acceptedRequest"]>,
): boolean {
  const sameRow = (a: typeof left.outcome, b: typeof right.outcome): boolean =>
    a.source === b.source && a.text === b.text && a.ownerText === b.ownerText;
  return sameRow(left.outcome, right.outcome) && left.requirements.length === right.requirements.length
    && left.requirements.every((row, index) => {
      const other = right.requirements[index];
      return other !== undefined && sameRow(row, other);
    });
}

function validTaskReviewProjection(value: unknown, card: Partial<ResultCard>): boolean {
  const projection = parseTaskReviewProjection(value);
  if (projection === null || card.acceptedRequest === undefined || card.acceptedRequest === null
    || !sameAcceptedRequest(projection.plan.request, card.acceptedRequest)) return false;
  if (projection.criteria.some((criterion) => criterion.ownerChecks.some((check) => check.action !== null))) return false;
  const result = card.taskSpecResult;
  if (result === undefined) return true;
  return projection.plan.criteria.length === result.requiredPromises.length
    && projection.plan.criteria.every((criterion, index) => {
      const required = result.requiredPromises[index];
      return required !== undefined && required.id === criterion.id && required.promise === criterion.promise;
    })
    && projection.plan.preferences.length === result.advisoryPreferences.length
    && projection.plan.preferences.every((preference, index) => {
      const advisory = result.advisoryPreferences[index];
      return advisory !== undefined && advisory.id === preference.id && advisory.dimension === preference.dimension
        && advisory.desiredDirection === preference.desiredDirection;
    });
}

function isResultCard(value: unknown): value is ResultCard {
  try {
    if (typeof value !== "object" || value === null || nodeTypes.isProxy(value)) return false;
    const card = value as Partial<ResultCard>;
    const acceptedRequest = Object.getOwnPropertyDescriptor(value, "acceptedRequest");
    if (acceptedRequest && (!("value" in acceptedRequest) || !acceptedRequest.enumerable
      || (acceptedRequest.value !== null && !validAcceptedRequestView(acceptedRequest.value)))) return false;
    const taskSpecResult = Object.getOwnPropertyDescriptor(value, "taskSpecResult");
    if (taskSpecResult && (!("value" in taskSpecResult) || !taskSpecResult.enumerable
      || !validTaskSpecResultProjection(taskSpecResult.value, card))) return false;
    const taskReview = Object.getOwnPropertyDescriptor(value, "taskReview");
    if (taskReview && (!("value" in taskReview) || !taskReview.enumerable
      || !validTaskReviewProjection(taskReview.value, card))) return false;
    return card.kind === "result"
      && (card.disposition === "DONE" || card.disposition === "STOPPED" || card.disposition === "ERROR")
      && Array.isArray(card.filesChanged)
      && (!Object.prototype.hasOwnProperty.call(card, "evidenceRunId")
        || card.evidenceRunId === null
        || isEvidenceRunId(card.evidenceRunId));
  } catch {
    return false;
  }
}

export interface ConductorHistoryEntry {
  readonly turn: ConductorTurn;
  readonly replyContext: OwnerReplyContext | null;
  /** Main-only custody identity. `readTurns` projects this field away. */
  readonly inputId: string | null;
  /** True only for an owner line whose full marker matched and whose UUID and
   * external marker order were unique. Project-authored legacy lines stay
   * visible through `turn` but may not become provider/user history. */
  readonly authenticatedOwner: boolean;
  /** Only externally vouched main-produced Cairn turns may re-enter a model
   * prompt. Unmarked legacy/forged prose remains visible locally. */
  readonly authenticatedCairn: boolean;
  /** Result cards keep their existing display-authorship rule. This stronger
   * flag additionally proves their position in the cross-role transcript and
   * is required before a card may re-enter a provider prompt. */
  readonly authenticatedEnvelope: boolean;
}

export interface ConductorHistorySnapshot {
  readonly entries: readonly ConductorHistoryEntry[];
  readonly turns: readonly ConductorTurn[];
  readonly authenticatedSources: readonly TaskIntentSourceInput[];
}

/** One immutable read supplies both provider history and attribution sources.
 * Re-reading after a model call could authenticate a line the provider never
 * saw, so callers retain this exact snapshot through parsing. */
export function readHistorySnapshot(root: string, id: string): ConductorHistorySnapshot {
  assertConversationId(id);
  const historyText = readConversationText(root, id);
  if (historyText === null) return Object.freeze({ entries: Object.freeze([]), turns: Object.freeze([]), authenticatedSources: Object.freeze([]) });
  const entries: ConductorHistoryEntry[] = [];
  const sourceCandidates: TaskIntentSourceInput[] = [];
  // Read once for the whole file: every envelope line is checked against this
  // set, and an empty set (no marker store, no file, an unreadable one) drops
  // every card rather than trusting any.
  const markers = cardMarkers(root);
  const cairnMarkers = cairnTurnMarkers(root);
  const ownerMarkerSequence = turnMarkerSequence(root);
  const ownerMarkerPositions = new Map(ownerMarkerSequence.map((digest, index) => [digest, index]));
  const transcriptSequence = transcriptEventSequence(root);
  const transcriptPositions = new Map(transcriptSequence.map((event, index) => [event, index]));
  const seenOwnerIds = new Set<string>();
  let lastOwnerMarkerPosition = -1;
  let lastTranscriptPosition = -1;
  // Digests already shown from this file. Authorship stops a card being
  // MANUFACTURED; it cannot stop one being COPIED, because a byte-identical
  // copy of a genuine line is genuine by every test authorship can apply — and
  // a card shown twice misstates how many times Cairn verified something.
  // De-duplicating here has no false positives: runs are serialised per project
  // directory and `ts` is millisecond-resolution ISO, so Cairn can never
  // legitimately write two envelope lines with the same digest in one
  // conversation. Two cards that differ in any field, or in the millisecond
  // they were written, both stand.
  const shown = new Set<string>();
  const shownCairn = new Set<string>();
  for (const line of historyText.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line) as ConductorTurn;
      if (typeof value.ts !== "string") continue;
      if (value.role === "owner" && typeof value.text === "string") {
        // Reconstruct the public turn rather than returning project-owned JSON.
        // inputId, replyContext, and arbitrary forged extras never cross IPC.
        const turn = Object.freeze({ role: "owner" as const, text: value.text, ts: value.ts });
        let replyContext: OwnerReplyContext | null = null;
        let authenticatedOwner = false;
        const stored = value as unknown as Record<string, unknown>;
        const inputId = stored.inputId;
        const rawContext = Object.prototype.hasOwnProperty.call(stored, "replyContext") ? stored.replyContext : null;
        const checkedContext = rawContext === null ? null : validateOwnerReplyContext(rawContext);
        if (isOwnerTurnId(inputId) && (rawContext === null || checkedContext !== null)) {
          const digest = turnDigest(root, id, inputId, value.ts, value.text, checkedContext);
          const markerPosition = ownerMarkerPositions.get(digest);
          const transcriptPosition = transcriptPositions.get(`owner:${digest}`);
          const unique = !seenOwnerIds.has(inputId);
          const ordered = markerPosition !== undefined && markerPosition > lastOwnerMarkerPosition;
          const transcriptOrdered = transcriptPosition !== undefined && transcriptPosition > lastTranscriptPosition;
          if (markerPosition !== undefined && unique && ordered && transcriptOrdered) {
            seenOwnerIds.add(inputId);
            lastOwnerMarkerPosition = markerPosition;
            lastTranscriptPosition = transcriptPosition;
            replyContext = checkedContext;
            authenticatedOwner = true;
            if (attributionSourceText(value.text)) {
              sourceCandidates.push(Object.freeze({ kind: "conversation", inputId, text: value.text }));
            }
          }
        }
        entries.push(Object.freeze({ turn, replyContext, inputId: authenticatedOwner ? inputId as string : null, authenticatedOwner, authenticatedCairn: false, authenticatedEnvelope: false }));
      } else if (value.role === "cairn" && typeof value.text === "string") {
        // A commentary's suggestions (Task 157) are re-validated on read with
        // the same fail-closed rule as at persist time: this file lives
        // inside the project a worker can write to, so a hand-edited
        // `followups` — wrong shape, oversized, multi-line — is dropped from
        // the turn rather than rendered as a chip that sends itself on a tap.
        // The turn itself always survives; only the field is fail-closed.
        const parsedTurn = sanitizedCairnTurn(value);
        if (parsedTurn === null) continue;
        const turnId = (value as unknown as Record<string, unknown>).turnId;
        const digest = isOwnerTurnId(turnId)
          ? cairnTurnDigest(root, id, { ...parsedTurn, turnId })
          : null;
        const transcriptPosition = digest === null ? undefined : transcriptPositions.get(`cairn:${digest}`);
        const authenticatedCairn = digest !== null
          && cairnMarkers.has(digest)
          && !shownCairn.has(digest)
          && transcriptPosition !== undefined
          && transcriptPosition > lastTranscriptPosition;
        if (authenticatedCairn && digest !== null && transcriptPosition !== undefined) {
          shownCairn.add(digest);
          lastTranscriptPosition = transcriptPosition;
        }
        // Project-written or copied prose stays readable, but only a genuinely
        // ordered main turn may expose one-click follow-up controls.
        const turn = authenticatedCairn || !("followups" in parsedTurn)
          ? parsedTurn
          : Object.freeze({
            role: "cairn" as const,
            text: parsedTurn.text,
            ts: parsedTurn.ts,
            ...(parsedTurn.tokens !== undefined ? { tokens: parsedTurn.tokens } : {}),
            ...(parsedTurn.costUsd !== undefined ? { costUsd: parsedTurn.costUsd } : {}),
          });
        entries.push(Object.freeze({ turn, replyContext: null, inputId: null, authenticatedOwner: false, authenticatedCairn, authenticatedEnvelope: false }));
      } else if (value.role === "envelope" && isResultCard(value.card)) {
        // Shape AND authorship. What the owner reads as Cairn's own
        // verification has to be something Cairn actually wrote: this line
        // lives inside the project root a worker can write to, and only the
        // marker — which lives outside it — can tell the two apart.
        const digest = cardDigest(root, id, value.ts, value.card);
        const markerMatched = cardDigestCandidates(root, id, value.ts, value.card).some((candidate) => markers.has(candidate));
        if (!markerMatched || shown.has(digest)) continue;
        shown.add(digest);
        const transcriptPosition = transcriptPositions.get(`envelope:${digest}`);
        const authenticatedEnvelope = transcriptPosition !== undefined && transcriptPosition > lastTranscriptPosition;
        if (authenticatedEnvelope) lastTranscriptPosition = transcriptPosition;
        const turn = Object.freeze({ role: "envelope" as const, card: value.card, ts: value.ts });
        entries.push(Object.freeze({ turn, replyContext: null, inputId: null, authenticatedOwner: false, authenticatedCairn: false, authenticatedEnvelope }));
      }
    } catch {
      // A corrupt line is skipped; the rest of the memory survives.
    }
  }
  const frozenEntries = Object.freeze(entries);
  // Core deliberately caps authenticated source text. Prefer the newest exact
  // owner turns and omit ineligible/over-budget ones so one old hostile or huge
  // line cannot poison every later, otherwise valid attribution candidate.
  const sources: TaskIntentSourceInput[] = [];
  let sourceTotal = 0;
  for (let index = sourceCandidates.length - 1; index >= 0; index -= 1) {
    const source = sourceCandidates[index];
    if (sourceTotal + source.text.length > ATTRIBUTION_SOURCE_CAP) continue;
    sourceTotal += source.text.length;
    sources.push(source);
  }
  sources.reverse();
  return Object.freeze({
    entries: frozenEntries,
    turns: Object.freeze(frozenEntries.map((entry) => entry.turn)),
    authenticatedSources: Object.freeze(sources),
  });
}

export function readTurns(root: string, id: string): ConductorTurn[] {
  return [...readHistorySnapshot(root, id).turns];
}

export function listConversations(root: string): Array<{ id: string; startedTs: string; preview: string }> {
  let names: string[] = [];
  try {
    names = conversationNames(root);
  } catch {
    return [];
  }
  return names
    .map((name) => /^(\d{3})\.jsonl$/.exec(name)?.[1])
    .filter(isConversationId)
    .sort()
    .map((id) => {
      const turns = readTurns(root, id);
      // The preview names what was SAID. A conversation can now begin with a
      // result card (a run dispatched, then resumed later), which has no text
      // at all — so the preview is the first thing owner or Cairn said, and
      // "Result card" only when neither ever spoke.
      const spoken = turns.find((turn) => turn.role === "owner" || turn.role === "cairn");
      const preview = spoken && spoken.role !== "envelope"
        ? spoken.text.slice(0, 80)
        : turns.length > 0 ? "Result card" : "";
      return { id, startedTs: turns[0]?.ts ?? "", preview };
    });
}
