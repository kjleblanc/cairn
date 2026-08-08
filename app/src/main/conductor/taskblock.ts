import {
  parseTaskIntentCandidate,
  parseTaskIntentCandidateEnvelopeJson,
  type TaskIntentCandidate,
} from "@cairn/core";
import type { TaskBlock, TaskBlockConcern } from "../../shared/ipc.js";
import {
  parseConductorQualityProposal,
  type ConductorQualityProposalV1,
} from "./qualityproposal.js";

const FORBIDDEN_VISIBLE_CONTROLS = /[\u0000\u202a-\u202e\u2066-\u2069]/u;

export type ConductorControlCandidate =
  | Readonly<{ kind: "question"; question: string }>
  | Readonly<{ kind: "task"; intent: TaskIntentCandidate; risks: readonly string[] }>;

export interface ConductorControlResult {
  candidate: ConductorControlCandidate | null;
  /** Legacy proposal compatibility. Task 3 removes this path only when the
   * attributed intent can travel through dispatch without being downgraded. */
  block: TaskBlock | null;
  text: string;
}

/** The staged Q3 control is deliberately disjoint from the live v8 control.
 * Its quality value is bounded proposal content only; main still owns every
 * id, source resolution, hash, and frozen Task Spec. */
export type QualityConductorControlCandidate =
  | Readonly<{ kind: "question"; question: string }>
  | Readonly<{
      kind: "task";
      intent: TaskIntentCandidate;
      quality: ConductorQualityProposalV1;
      risks: readonly string[];
    }>;

export interface QualityConductorControlResult {
  candidate: QualityConductorControlCandidate | null;
  block: null;
  text: string;
}

export interface TaskBlockResult {
  block: TaskBlock | null;
  text: string;
}

type RawControlFence = {
  kind: "cairn-question" | "cairn-task";
  raw: string | null;
  start: number;
  end: number;
};

function controlFences(reply: string): RawControlFence[] {
  const found: RawControlFence[] = [];
  type Line = { start: number; end: number; after: number; text: string };
  const lines: Line[] = [];
  for (let start = 0; start < reply.length;) {
    const newline = reply.indexOf("\n", start);
    const end = newline === -1 ? reply.length : newline;
    lines.push({ start, end, after: newline === -1 ? reply.length : newline + 1, text: reply.slice(start, end) });
    start = newline === -1 ? reply.length : newline + 1;
  }

  let outer: { marker: "`" | "~"; length: number; exactClose: boolean } | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (outer !== null) {
      const close = /^( {0,3})(`+|~+)[ \t]*\r?$/.exec(line.text);
      const closesOuter = outer.exactClose
        ? /^```[ \t]*\r?$/.test(line.text)
        : close && close[2][0] === outer.marker && close[2].length >= outer.length;
      if (closesOuter) outer = null;
      continue;
    }

    // Follow-up controls are reserved by the same column-zero exact-close
    // grammar as the task/question controls this scanner owns. Otherwise a
    // Markdown pseudo-close can make the two protocol scanners disagree about
    // nesting and expose a task candidate from a malformed follow-up block.
    if (/^```cairn-followups[ \t]*\r?$/.test(line.text)) {
      outer = { marker: "`", length: 3, exactClose: true };
      continue;
    }

    const control = /^```(cairn-question|cairn-task)[ \t]*\r?$/.exec(line.text);
    if (control) {
      const kind = control[1] as RawControlFence["kind"];
      const bodyStart = line.after;
      let closingIndex = -1;
      for (let candidate = index + 1; candidate < lines.length; candidate += 1) {
        if (/^```[ \t]*\r?$/.test(lines[candidate].text)) {
          closingIndex = candidate;
          break;
        }
      }
      if (closingIndex === -1) {
        found.push({ kind, raw: null, start: line.start, end: reply.length });
        break;
      }
      const closing = lines[closingIndex];
      let raw = reply.slice(bodyStart, closing.start);
      if (raw.endsWith("\r\n")) raw = raw.slice(0, -2);
      else if (raw.endsWith("\n")) raw = raw.slice(0, -1);
      found.push({ kind, raw, start: line.start, end: closing.end });
      index = closingIndex;
      continue;
    }

    const opening = /^( {0,3})(`{3,}|~{3,}).*\r?$/.exec(line.text);
    if (opening) outer = { marker: opening[2][0] as "`" | "~", length: opening[2].length, exactClose: false };
  }
  return found;
}

function stripControls(reply: string, controls: readonly RawControlFence[]): string {
  let cursor = 0;
  let visible = "";
  for (const control of controls) {
    visible += reply.slice(cursor, control.start);
    cursor = control.end;
  }
  visible += reply.slice(cursor);
  return visible.trim();
}

const CONTROL_OPENING_PREFIXES = ["```cairn-question", "```cairn-task"] as const;

function couldBecomeControlOpening(line: string): boolean {
  return CONTROL_OPENING_PREFIXES.some((opening) =>
    opening.startsWith(line)
    || (line.startsWith(opening) && /^[ \t]*\r?$/.test(line.slice(opening.length))));
}

/** A monotonic public view for an in-progress provider reply. Exact complete
 * and unterminated controls are removed, while a trailing partial opener is
 * held until it either becomes ordinary text or a recognized control. */
export function controlSafeStreamingText(reply: string): string {
  const controls = controlFences(reply);
  let cursor = 0;
  let visible = "";
  for (const control of controls) {
    visible += reply.slice(cursor, control.start);
    cursor = control.end;
  }
  visible += reply.slice(cursor);
  const lineStart = visible.lastIndexOf("\n") + 1;
  const trailingLine = visible.slice(lineStart);
  return couldBecomeControlOpening(trailingLine) ? visible.slice(0, lineStart) : visible;
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

function safeControlText(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= 300
    && value.trim().length > 0
    && !/[\r\n]/.test(value)
    && !FORBIDDEN_VISIBLE_CONTROLS.test(value)
    && wellFormedUtf16(value);
}

function parseQuestion(raw: string): ConductorControlCandidate | null {
  if (raw.length > 1_000) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  const record = exactRecord(value, ["question"]);
  if (!record || !safeControlText(record.question)) return null;
  return Object.freeze({ kind: "question", question: record.question.trim() });
}

function parseAttributedTask(raw: string): ConductorControlCandidate | null {
  const value = parseTaskIntentCandidateEnvelopeJson(raw);
  const record = exactRecord(value, ["intent", "risks"]);
  if (!record || !Array.isArray(record.risks) || record.risks.length > 3) return null;
  const intent = parseTaskIntentCandidate(record.intent);
  if (!intent) return null;
  const risks: string[] = [];
  for (const value of record.risks) {
    const risk = exactRecord(value, ["text"]);
    if (!risk || !safeControlText(risk.text)) return null;
    risks.push(risk.text.trim());
  }
  return Object.freeze({ kind: "task", intent, risks: Object.freeze(risks) });
}

function parseQualityAttributedTask(raw: string): QualityConductorControlCandidate | null {
  // Reuse the intent envelope's complete raw-body limit and hostile JSON
  // boundary. The staged task is not allowed a larger private control merely
  // because it carries bounded quality content too.
  const value = parseTaskIntentCandidateEnvelopeJson(raw);
  const record = exactRecord(value, ["intent", "quality", "risks"]);
  if (!record || !Array.isArray(record.risks) || record.risks.length > 3) return null;
  const intent = parseTaskIntentCandidate(record.intent);
  const quality = parseConductorQualityProposal(record.quality);
  if (!intent || !quality) return null;
  const risks: string[] = [];
  for (const value of record.risks) {
    const risk = exactRecord(value, ["text"]);
    if (!risk || !safeControlText(risk.text)) return null;
    risks.push(risk.text.trim());
  }
  return Object.freeze({
    kind: "task",
    intent,
    quality,
    risks: Object.freeze(risks),
  });
}

/** Scan the whole reply, remove every delimited control fence, and create a
 * candidate only when exactly one such fence exists and validates. Malformed,
 * mixed, or duplicated controls therefore leave readable prose but no power. */
export function extractConductorControl(reply: string): ConductorControlResult {
  const controls = controlFences(reply);
  if (controls.length === 0) return { candidate: null, block: null, text: reply };
  const text = stripControls(reply, controls);
  if (controls.length !== 1 || controls[0].raw === null) return { candidate: null, block: null, text };
  const { kind, raw } = controls[0];
  if (kind === "cairn-question") {
    return { candidate: parseQuestion(raw), block: null, text };
  }
  const candidate = parseAttributedTask(raw);
  if (candidate !== null) return { candidate, block: null, text };
  return { candidate: null, block: parseBlock(raw), text };
}

/** Parse the staged Q3 protocol without changing the live v8 parser. It uses
 * the same fence scanner and stripping rules, but accepts only the exact
 * `{intent,quality,risks}` task envelope and never falls back to a legacy
 * TaskBlock. Normal routing does not call this export while activation is
 * empty. */
export function extractQualityConductorControl(reply: string): QualityConductorControlResult {
  const controls = controlFences(reply);
  if (controls.length === 0) return { candidate: null, block: null, text: reply };
  const text = stripControls(reply, controls);
  if (controls.length !== 1 || controls[0].raw === null) return { candidate: null, block: null, text };
  const { kind, raw } = controls[0];
  if (kind === "cairn-question") {
    const question = parseQuestion(raw);
    return {
      candidate: question?.kind === "question" ? question : null,
      block: null,
      text,
    };
  }
  return { candidate: parseQualityAttributedTask(raw), block: null, text };
}

/** Compatibility wrapper for the still-live v2 proposal path. */
export function extractTaskBlock(reply: string): TaskBlockResult {
  const { block, text } = extractConductorControl(reply);
  return { block, text };
}

function parseBlock(raw: string): TaskBlock | null {
  if (raw.length > 4000) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const allowed = new Set(["outcome", "concerns", "notes", "details"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.outcome !== "string") return null;
  const outcome = record.outcome.trim();
  if (!outcome || outcome.length > 300) return null;
  // The confirmed disclosure card concatenates outcome and details into one
  // string (see codexExecDisclosure); a multi-line outcome could otherwise
  // impersonate a details section within that concatenation. Fail closed.
  if (/[\r\n]/.test(outcome)) return null;
  const concernsRaw = record.concerns ?? [];
  if (!Array.isArray(concernsRaw) || concernsRaw.length > 3) return null;
  const concerns: TaskBlockConcern[] = [];
  for (const item of concernsRaw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    if (Object.keys(item).sort().join(",") !== "kind,text") return null;
    const kind = (item as Record<string, unknown>).kind;
    const text = (item as Record<string, unknown>).text;
    if (kind !== "question" && kind !== "risk") return null;
    if (typeof text !== "string" || !text.trim() || text.length > 300) return null;
    concerns.push({ kind, text: text.trim() });
  }
  const notesRaw = record.notes ?? "";
  if (typeof notesRaw !== "string" || notesRaw.length > 1000) return null;
  const detailsRaw = record.details ?? "";
  if (typeof detailsRaw !== "string" || detailsRaw.length > 2000) return null;
  return { outcome, concerns, notes: notesRaw.trim(), details: detailsRaw.trim() };
}
