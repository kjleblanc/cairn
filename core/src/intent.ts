import { createHash } from "node:crypto";
import { types as nodeTypes } from "node:util";

export const TASK_INTENT_VERSION = "cairn-task-intent/v1" as const;
export const TASK_INTENT_CANDIDATE_CHAR_LIMIT = 12_000;
export const LONG_DIRECT_REQUEST_INTERPRETATION = "Complete the owner’s exact direct request shown below";

const OUTCOME_TEXT_CAP = 300;
const REQUIREMENT_TEXT_CAP = 500;
const REQUIREMENT_COUNT_CAP = 8;
const CONTEXT_COUNT_CAP = 3;
const CONTEXT_TOTAL_CAP = 1_000;
const OWNER_SOURCE_CAP = 2_000;
const INTENT_TEXT_TOTAL_CAP = 6_000;
const AUTHENTICATED_SOURCE_TEXT_CAP = 200_000;
const AUTHENTICATED_SOURCE_TOTAL_CAP = 200_000;
// Every authenticated source must contain at least one meaningful code unit,
// so the provider-history character limit is also the only reachable count
// limit. Do not reject an otherwise valid history merely because it has many
// short owner turns.
const AUTHENTICATED_SOURCE_COUNT_CAP = AUTHENTICATED_SOURCE_TOTAL_CAP;

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const FORBIDDEN_VISIBLE_CONTROLS = /[\u0000\u202a-\u202e\u2066-\u2069]/u;

export type RequirementSource =
  | "owner-stated"
  | "owner-unsure"
  | "cairn-chosen";

export type CandidateRequirement =
  | {
      readonly source: "owner-stated" | "owner-unsure";
      readonly text: string;
      readonly ownerQuote: string;
    }
  | {
      readonly source: "cairn-chosen";
      readonly text: string;
      readonly ownerQuote: null;
    };

export type TaskIntentCandidate = {
  readonly version: typeof TASK_INTENT_VERSION;
  readonly outcome: CandidateRequirement;
  readonly requirements: readonly CandidateRequirement[];
  readonly context: readonly string[];
};

/** A caller-authenticated owner input, ordered oldest to newest when supplied
 * to a binding function. IDs are canonical lowercase UUIDv4 values. */
export type TaskIntentSourceInput = {
  readonly kind: "conversation" | "direct";
  readonly inputId: string;
  readonly text: string;
};

export type OwnerSourceSpan = {
  readonly kind: "conversation" | "direct";
  readonly inputId: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
};

export type AttributedRequirement =
  | {
      readonly source: "owner-stated" | "owner-unsure";
      readonly text: string;
      readonly owner: OwnerSourceSpan;
    }
  | {
      readonly source: "cairn-chosen";
      readonly text: string;
      readonly owner: null;
    };

export type TaskIntent = {
  readonly version: typeof TASK_INTENT_VERSION;
  readonly outcome: AttributedRequirement;
  readonly requirements: readonly AttributedRequirement[];
  readonly context: readonly string[];
};

export type TaskRequestRow = {
  readonly source: RequirementSource;
  readonly text: string;
  readonly ownerText: string | null;
};

export type TaskRequestView = {
  readonly outcome: TaskRequestRow;
  readonly requirements: readonly TaskRequestRow[];
};

type InspectedRecord = Readonly<Record<string, unknown>>;

const candidateBrand = new WeakSet<object>();
const intentBrand = new WeakSet<object>();

function isProxy(value: object): boolean {
  try {
    return nodeTypes.isProxy(value);
  } catch {
    return true;
  }
}

/** Inspect an exact record without evaluating a caller-owned property. */
function inspectRecord(value: unknown, expected: readonly string[]): InspectedRecord | null {
  try {
    if (value === null || typeof value !== "object" || isProxy(value)) return null;
    if (Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== expected.length || keys.some((key) => typeof key !== "string" || !expected.includes(key))) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const inspected: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of expected) {
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      inspected[key] = descriptor.value;
    }
    return inspected;
  } catch {
    return null;
  }
}

/** Inspect a dense ordinary array without iteration or indexed property reads. */
function inspectArray(value: unknown, cap: number): readonly unknown[] | null {
  try {
    if (value === null || typeof value !== "object" || isProxy(value)) return null;
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const lengthDescriptor = descriptors["length"];
    if (!lengthDescriptor || lengthDescriptor.enumerable || lengthDescriptor.get || lengthDescriptor.set || !("value" in lengthDescriptor)) return null;
    const length = lengthDescriptor.value;
    if (!Number.isSafeInteger(length) || length < 0 || length > cap) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== length + 1 || keys.some((key) => typeof key !== "string")) return null;
    const inspected: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      inspected.push(descriptor.value);
    }
    if (keys.some((key) => key !== "length" && !/^(0|[1-9][0-9]*)$/.test(key as string))) return null;
    return inspected;
  } catch {
    return null;
  }
}

function hasWellFormedUtf16(value: string): boolean {
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

function safeText(value: unknown, cap: number, meaningful = true): value is string {
  return typeof value === "string" &&
    value.length <= cap &&
    (!meaningful || value.trim().length > 0) &&
    !FORBIDDEN_VISIBLE_CONTROLS.test(value) &&
    hasWellFormedUtf16(value);
}

function validInputId(value: unknown): value is string {
  return typeof value === "string" && UUID_V4.test(value);
}

function parseCandidateRow(value: unknown, textCap: number): CandidateRequirement | null {
  const record = inspectRecord(value, ["source", "text", "ownerQuote"]);
  if (!record || !safeText(record.text, textCap)) return null;
  if (record.source === "cairn-chosen") {
    if (record.ownerQuote !== null) return null;
    return Object.freeze({ source: "cairn-chosen", text: record.text, ownerQuote: null });
  }
  if (record.source !== "owner-stated" && record.source !== "owner-unsure") return null;
  if (!safeText(record.ownerQuote, OWNER_SOURCE_CAP)) return null;
  return Object.freeze({ source: record.source, text: record.text, ownerQuote: record.ownerQuote });
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function canonicalCandidateRow(row: CandidateRequirement): string {
  return row.source === "cairn-chosen"
    ? `{"source":${quote(row.source)},"text":${quote(row.text)},"ownerQuote":null}`
    : `{"source":${quote(row.source)},"text":${quote(row.text)},"ownerQuote":${quote(row.ownerQuote)}}`;
}

function candidateTextTotal(outcome: CandidateRequirement, requirements: readonly CandidateRequirement[], context: readonly string[]): number {
  let total = outcome.text.length + (outcome.source === "cairn-chosen" ? 0 : outcome.ownerQuote.length);
  for (const row of requirements) total += row.text.length + (row.source === "cairn-chosen" ? 0 : row.ownerQuote.length);
  for (const note of context) total += note.length;
  return total;
}

function freezeCandidate(
  outcome: CandidateRequirement,
  requirements: readonly CandidateRequirement[],
  context: readonly string[],
): TaskIntentCandidate {
  const frozen = Object.freeze({
    version: TASK_INTENT_VERSION,
    outcome,
    requirements: Object.freeze([...requirements]),
    context: Object.freeze([...context]),
  });
  candidateBrand.add(frozen);
  return frozen;
}

/** Validate the inner `intent` value from a candidate envelope. Model fence
 * bodies must first use parseTaskIntentCandidateEnvelopeJson so the cap applies
 * to the complete raw `{ intent, risks }` body before JSON decoding. */
export function parseTaskIntentCandidate(value: unknown): TaskIntentCandidate | null {
  try {
    const record = inspectRecord(value, ["version", "outcome", "requirements", "context"]);
    if (!record || record.version !== TASK_INTENT_VERSION) return null;
    const outcome = parseCandidateRow(record.outcome, OUTCOME_TEXT_CAP);
    const requirementValues = inspectArray(record.requirements, REQUIREMENT_COUNT_CAP);
    const contextValues = inspectArray(record.context, CONTEXT_COUNT_CAP);
    if (!outcome || !requirementValues || !contextValues) return null;

    const requirements: CandidateRequirement[] = [];
    for (const value of requirementValues) {
      const requirement = parseCandidateRow(value, REQUIREMENT_TEXT_CAP);
      if (!requirement) return null;
      requirements.push(requirement);
    }
    const context: string[] = [];
    let contextTotal = 0;
    for (const value of contextValues) {
      if (!safeText(value, CONTEXT_TOTAL_CAP)) return null;
      contextTotal += value.length;
      if (contextTotal > CONTEXT_TOTAL_CAP) return null;
      context.push(value);
    }
    if (candidateTextTotal(outcome, requirements, context) > INTENT_TEXT_TOTAL_CAP) return null;
    const seen = new Set<string>();
    for (const row of [outcome, ...requirements]) {
      const key = canonicalCandidateRow(row);
      if (seen.has(key)) return null;
      seen.add(key);
    }
    return freezeCandidate(outcome, requirements, context);
  } catch {
    return null;
  }
}

/** Decode one complete raw `cairn-task` candidate fence body. The cap is on the
 * exact UTF-16 input before JSON whitespace, escaping, or duplicate spelling
 * can disappear. The caller must exact-validate the decoded `{ intent, risks }`
 * envelope, then pass its inner `intent` value to parseTaskIntentCandidate. */
export function parseTaskIntentCandidateEnvelopeJson(raw: unknown): unknown | null {
  if (typeof raw !== "string" || raw.length > TASK_INTENT_CANDIDATE_CHAR_LIMIT) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function parseSources(value: unknown): readonly TaskIntentSourceInput[] | null {
  const entries = inspectArray(value, AUTHENTICATED_SOURCE_COUNT_CAP);
  if (!entries) return null;
  const sources: TaskIntentSourceInput[] = [];
  const identities = new Set<string>();
  let total = 0;
  for (const entry of entries) {
    const record = inspectRecord(entry, ["kind", "inputId", "text"]);
    if (!record || (record.kind !== "conversation" && record.kind !== "direct")) return null;
    if (!validInputId(record.inputId) || !safeText(record.text, AUTHENTICATED_SOURCE_TEXT_CAP)) return null;
    total += record.text.length;
    if (total > AUTHENTICATED_SOURCE_TOTAL_CAP) return null;
    const identity = `${record.kind}\u0000${record.inputId}`;
    if (identities.has(identity)) return null;
    identities.add(identity);
    sources.push(Object.freeze({ kind: record.kind, inputId: record.inputId, text: record.text }));
  }
  return Object.freeze(sources);
}

function canonicalSpanForQuote(ownerQuote: string, sources: readonly TaskIntentSourceInput[]): OwnerSourceSpan | null {
  for (let index = sources.length - 1; index >= 0; index -= 1) {
    const source = sources[index];
    const start = source.kind === "direct"
      ? source.text === ownerQuote ? 0 : -1
      : source.text.indexOf(ownerQuote);
    if (start < 0) continue;
    const end = start + ownerQuote.length;
    return Object.freeze({
      kind: source.kind,
      inputId: source.inputId,
      start,
      end,
      text: source.text.slice(start, end),
    });
  }
  return null;
}

function bindRow(row: CandidateRequirement, sources: readonly TaskIntentSourceInput[]): AttributedRequirement | null {
  if (row.source === "cairn-chosen") return Object.freeze({ source: row.source, text: row.text, owner: null });
  const owner = canonicalSpanForQuote(row.ownerQuote, sources);
  return owner ? Object.freeze({ source: row.source, text: row.text, owner }) : null;
}

function canonicalOwner(owner: OwnerSourceSpan): string {
  return `{"kind":${quote(owner.kind)},"inputId":${quote(owner.inputId)},"start":${JSON.stringify(owner.start)},"end":${JSON.stringify(owner.end)},"text":${quote(owner.text)}}`;
}

function canonicalRow(row: AttributedRequirement): string {
  return row.source === "cairn-chosen"
    ? `{"source":${quote(row.source)},"text":${quote(row.text)},"owner":null}`
    : `{"source":${quote(row.source)},"text":${quote(row.text)},"owner":${canonicalOwner(row.owner)}}`;
}

function boundTextTotal(outcome: AttributedRequirement, requirements: readonly AttributedRequirement[], context: readonly string[]): number {
  let total = outcome.text.length + (outcome.owner?.text.length ?? 0);
  for (const row of requirements) total += row.text.length + (row.owner?.text.length ?? 0);
  for (const note of context) total += note.length;
  return total;
}

function finishIntent(
  outcome: AttributedRequirement,
  requirements: readonly AttributedRequirement[],
  context: readonly string[],
): TaskIntent | null {
  if (boundTextTotal(outcome, requirements, context) > INTENT_TEXT_TOTAL_CAP) return null;
  const seen = new Set<string>();
  for (const row of [outcome, ...requirements]) {
    const key = canonicalRow(row);
    if (seen.has(key)) return null;
    seen.add(key);
  }
  const frozen = Object.freeze({
    version: TASK_INTENT_VERSION,
    outcome,
    requirements: Object.freeze([...requirements]),
    context: Object.freeze([...context]),
  });
  intentBrand.add(frozen);
  return frozen;
}

/** Bind candidate quotations to authenticated inputs ordered oldest to newest.
 * The latest matching input and its first exact UTF-16 occurrence win. */
export function bindTaskIntent(candidate: unknown, authenticatedSources: unknown): TaskIntent | null {
  try {
    const parsedCandidate = candidate !== null && typeof candidate === "object" && candidateBrand.has(candidate)
      ? candidate as TaskIntentCandidate
      : parseTaskIntentCandidate(candidate);
    const sources = parseSources(authenticatedSources);
    if (!parsedCandidate || !sources) return null;
    const outcome = bindRow(parsedCandidate.outcome, sources);
    if (!outcome) return null;
    const requirements: AttributedRequirement[] = [];
    for (const row of parsedCandidate.requirements) {
      const bound = bindRow(row, sources);
      if (!bound) return null;
      requirements.push(bound);
    }
    return finishIntent(outcome, requirements, parsedCandidate.context);
  } catch {
    return null;
  }
}

function parseOwnerSpan(value: unknown): OwnerSourceSpan | null {
  const record = inspectRecord(value, ["kind", "inputId", "start", "end", "text"]);
  if (!record || (record.kind !== "conversation" && record.kind !== "direct")) return null;
  if (!validInputId(record.inputId) || !safeText(record.text, OWNER_SOURCE_CAP)) return null;
  if (!Number.isSafeInteger(record.start) || !Number.isSafeInteger(record.end)) return null;
  if (Object.is(record.start, -0) || Object.is(record.end, -0)) return null;
  if ((record.start as number) < 0 || (record.end as number) <= (record.start as number)) return null;
  if ((record.end as number) - (record.start as number) !== record.text.length) return null;
  return Object.freeze({
    kind: record.kind,
    inputId: record.inputId,
    start: record.start as number,
    end: record.end as number,
    text: record.text,
  });
}

function parseBoundRow(value: unknown, textCap: number): AttributedRequirement | null {
  const record = inspectRecord(value, ["source", "text", "owner"]);
  if (!record || !safeText(record.text, textCap)) return null;
  if (record.source === "cairn-chosen") {
    if (record.owner !== null) return null;
    return Object.freeze({ source: "cairn-chosen", text: record.text, owner: null });
  }
  if (record.source !== "owner-stated" && record.source !== "owner-unsure") return null;
  const owner = parseOwnerSpan(record.owner);
  if (!owner) return null;
  return Object.freeze({ source: record.source, text: record.text, owner });
}

function sameOwnerSpan(left: OwnerSourceSpan, right: OwnerSourceSpan): boolean {
  return left.kind === right.kind &&
    left.inputId === right.inputId &&
    left.start === right.start &&
    left.end === right.end &&
    left.text === right.text;
}

/** Re-authenticate a serialized structural intent against the full source text.
 * A newly copied and branded intent is returned; unvalidated clones carry no
 * authority in canonicalization, hashing, or projection helpers. */
export function validateTaskIntent(value: unknown, authenticatedSources: unknown): TaskIntent | null {
  try {
    const record = inspectRecord(value, ["version", "outcome", "requirements", "context"]);
    if (!record || record.version !== TASK_INTENT_VERSION) return null;
    const outcome = parseBoundRow(record.outcome, OUTCOME_TEXT_CAP);
    const requirementValues = inspectArray(record.requirements, REQUIREMENT_COUNT_CAP);
    const contextValues = inspectArray(record.context, CONTEXT_COUNT_CAP);
    if (!outcome || !requirementValues || !contextValues) return null;
    const requirements: AttributedRequirement[] = [];
    for (const value of requirementValues) {
      const requirement = parseBoundRow(value, REQUIREMENT_TEXT_CAP);
      if (!requirement) return null;
      requirements.push(requirement);
    }
    const context: string[] = [];
    let contextTotal = 0;
    for (const value of contextValues) {
      if (!safeText(value, CONTEXT_TOTAL_CAP)) return null;
      contextTotal += value.length;
      if (contextTotal > CONTEXT_TOTAL_CAP) return null;
      context.push(value);
    }
    const sources = parseSources(authenticatedSources);
    if (!sources) return null;
    for (const row of [outcome, ...requirements]) {
      if (row.source === "cairn-chosen") continue;
      const canonical = canonicalSpanForQuote(row.owner.text, sources);
      if (!canonical || !sameOwnerSpan(row.owner, canonical)) return null;
    }
    return finishIntent(outcome, requirements, context);
  } catch {
    return null;
  }
}

function nonWhitespaceCharacters(value: string): number {
  let count = 0;
  for (const character of value) if (!/\s/u.test(character)) count += 1;
  return count;
}

/** Build the one-row direct App/CLI form without trimming its authority. */
export function createDirectTaskIntent(rawOutcome: unknown, inputId: unknown): TaskIntent | null {
  if (!safeText(rawOutcome, OWNER_SOURCE_CAP) || !validInputId(inputId) || nonWhitespaceCharacters(rawOutcome) < 5) return null;
  const trimmed = rawOutcome.trim();
  const interpreted = trimmed.length <= OUTCOME_TEXT_CAP ? trimmed : LONG_DIRECT_REQUEST_INTERPRETATION;
  const parsed = parseTaskIntentCandidate({
    version: TASK_INTENT_VERSION,
    outcome: { source: "owner-stated", text: interpreted, ownerQuote: rawOutcome },
    requirements: [],
    context: [],
  });
  return parsed ? bindTaskIntent(parsed, [{ kind: "direct", inputId, text: rawOutcome }]) : null;
}

/** Fixed-order authority serialization. Only module-validated frozen intents
 * are accepted; manual structural casts return null. */
export function canonicalTaskIntent(intent: unknown): string | null {
  if (intent === null || typeof intent !== "object" || !intentBrand.has(intent)) return null;
  const value = intent as TaskIntent;
  return `{"version":${quote(value.version)},"outcome":${canonicalRow(value.outcome)},"requirements":[${value.requirements.map(canonicalRow).join(",")}],"context":[${value.context.map(quote).join(",")}]}`;
}

export function taskRequestSha256(intent: unknown): string | null {
  const canonical = canonicalTaskIntent(intent);
  return canonical === null ? null : createHash("sha256").update(canonical, "utf8").digest("hex");
}

function requestRow(row: AttributedRequirement): TaskRequestRow {
  return Object.freeze({
    source: row.source,
    text: row.text,
    ownerText: row.owner?.text ?? null,
  });
}

/** Output-only projection: no source IDs, offsets, context, or version. */
export function taskRequestView(intent: unknown): TaskRequestView | null {
  if (intent === null || typeof intent !== "object" || !intentBrand.has(intent)) return null;
  const value = intent as TaskIntent;
  return Object.freeze({
    outcome: requestRow(value.outcome),
    requirements: Object.freeze(value.requirements.map(requestRow)),
  });
}
