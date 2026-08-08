import { types as nodeTypes } from "node:util";
import {
  QUALITY_LIMITS,
  QUALITY_PLAN_VERSION,
  bindTaskSpec,
  canonicalTaskIntent,
  taskSpecReviewView,
  type CriterionBasisV1,
  type IntentBasisV1,
  type QualityPlanCandidateV1,
  type TaskIntent,
  type TaskSpecV1,
} from "@cairn/core";
import type { TaskSpecProposalPreviewV1 } from "../../shared/quality-preview.js";

const QUALITY_PROPOSAL_VERSION = "cairn-quality-proposal/v1" as const;
const CRITIC_REASONS = Object.freeze({
  required: "The owner's exact request requires a critic.",
  optional: "No required critic was requested.",
  off: "The owner's exact request turns the critic off.",
});
const FORBIDDEN_VISIBLE_CONTROLS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u;
const SUBJECTIVE_QUALITY = /\b(?:perfect|premium|best|wow|beautiful|stunning|amazing|delightful|professional|polished|high[- ]quality|world[- ]class|user[- ]friendly|intuitive|better|nice|great|good|cool|awesome|appealing|attractive|pleasing|visually\s+(?:pleasing|striking)|aesthetic(?:ally)?|sleek|slick|lovely|gorgeous|fancy|impressive|excellent|exceptional|outstanding|elegant|sophisticated|seamless|smooth|properly|optimal|future[- ]proof|production[- ]ready)\b/iu;
const SPEED_QUALITY = /\b(?:fast|quick|snappy|performant|performance|latency)\b/iu;
const ACCESSIBILITY_QUALITY = /\b(?:accessible|accessibility)\b/iu;
const RESPONSIVE_QUALITY = /\bresponsive\b/iu;
const IMPROVEMENT_QUALITY = /\b(?:improve[ds]?|enhance[ds]?)\b/iu;
const OTHER_UNBOUNDED_STANDARD = /\b(?:secure|reliable|scalable|easy|clean|modern|robust|consistent|optimi[sz]e[ds]?)\b/iu;
const SPEED_STANDARD = /(?:\b(?:under|within|at\s+most|no\s+more\s+than|less\s+than)\s+\d+(?:\.\d+)?\s*(?:ms|milliseconds?|s|seconds?)\b|\b\d+(?:\.\d+)?\s*(?:ms|milliseconds?|s|seconds?)\s+(?:maximum|max|limit|budget)\b)/iu;
const ACCESSIBILITY_STANDARD = /\b(?:wcag(?:\s+\d+(?:\.\d+)?)?(?:\s+(?:a|aa|aaa))?|aria|axe(?:\s+scan)?|keyboard[- ]only|screen[- ]reader)\b/iu;
const LAYOUT_STANDARD = /(?:\b(?:viewport|breakpoint)\b|\b\d+(?:\.\d+)?\s*(?:px|rem|em)\b)/iu;
const EXPLICIT_TRANSFORMATION = /(?:\bby\s+(?:adding|removing|renaming|changing|setting|moving|showing|hiding|reducing|increasing|limiting|replacing)\b|\bfrom\b[^.!?\r\n]{1,80}\bto\b)/iu;
const REFERENCE_TARGET = "(?:https?:\\/\\/\\S+|www\\.\\S+|(?:the\\s+)?(?:design|site|app|page|reference)|(?:the\\s+|an?\\s+|attached\\s+)?(?:screenshot|mockup|wireframe|image)|Figma|Linear|Stripe|Notion|Airbnb|Apple|Google)";
const UNAVAILABLE_REFERENCE_PATTERNS = [
  /\b(?:attached|provided|shared)\b[^.!?\r\n]{0,80}\b(?:design|screenshot|mockup|wireframe|image|reference|file)\b/iu,
  /\b(?:design|screenshot|mockup|wireframe|image|reference|file)\b[^.!?\r\n]{0,80}\b(?:attached|provided|shared)\b/iu,
  new RegExp(`\\b(?:look|feel|behave|work|make\\s+(?:it|this|that|the\\s+[\\p{L}\\p{N}_-]+))\\s+like\\s+${REFERENCE_TARGET}`, "iu"),
  new RegExp(`\\b(?:match|copy|clone|replicate|resemble|emulate|mirror)\\s+${REFERENCE_TARGET}`, "iu"),
  /\b(?:match|copy|clone|replicate|resemble|emulate)\s+(?:(?:the|an?)\s+)?(?:attached\s+)?(?:screenshot|mockup|wireframe|image)\b/iu,
  /\b(?:recreate|reproduce|implement)\s+(?:(?:this|that|the|an?)\s+)?(?:attached\s+)?(?:screenshot|mockup|wireframe|image|design)\b/iu,
  new RegExp(`\\b(?:inspired\\s+by|style\\s+of)\\s+${REFERENCE_TARGET}`, "iu"),
  /\buse\s+(?:the\s+)?(?:Figma|Linear|Stripe|Notion|Airbnb|Apple|Google)\s+(?:mockup|design|site|app|page|screenshot|wireframe|image)\b/iu,
  /\buse\s+(?:the\s+|an?\s+|attached\s+)?(?:screenshot|mockup|wireframe|image)\s+as\s+(?:the\s+)?(?:reference|standard|target)\b/iu,
  /\b(?:use|follow|build\s+from)\s+(?:(?:the|an?)\s+)?(?:attached\s+)?(?:screenshot|mockup|wireframe|image)\b/iu,
  /\b(?:use|follow|build\s+from)\s+(?:the\s+)?(?:Figma|Linear|Stripe|Notion|Airbnb|Apple|Google)\s+(?:mockup|design|site|app|page|screenshot|wireframe|image)\b/iu,
  /\bsame\s+as\s+(?:before|current|existing|the\s+reference|Figma|Linear|Stripe|Notion|Airbnb|Apple|Google|https?:\/\/\S+)/iu,
] as const;
const OPEN_ENDED_DIRECT = /(?:\b(?:do|make)\s+(?:something|anything|whatever)\b|\b(?:fix|improve|enhance)\s+(?:it|this|that)\b|\bmake\s+(?:it|this|that)\s+work\b|\b(?:you\s+decide|use\s+your\s+judg(?:e)?ment|surprise\s+me|whatever\s+you\s+think|as\s+needed|somehow)\b|\betc\.?\s*$)/iu;
const CRITIC_PRODUCT_CONTEXT = /\b(?:add|fix|change|update|build|test|display|show|render|rename|document)\b[^.!?\r\n]{0,80}\bcritic\s+(?:parser|policy|route|dashboard|screen|panel|button|label|copy|test|code|module|output|finding|result|mode)\b/iu;
const CRITIC_REQUIRED = [
  /\b(?:use|run|call|invoke)\s+(?:the\s+)?critic\b/iu,
  /\b(?:require|requires|required|need|needs)\s+(?:a\s+|the\s+)?critic\b/iu,
  /\b(?:the\s+)?critic\s+(?:is\s+)?required\b/iu,
  /\b(?:the\s+)?critic\s+(?:must|should|needs?\s+to)\s+(?:run|review|inspect|check|evaluate)\b/iu,
  /\b(?:have|let)\s+(?:the\s+)?critic\s+(?:review|inspect|check|evaluate)\b/iu,
] as const;
const CRITIC_OFF = [
  /\b(?:do\s+not|don't|skip)\s+(?:use|run|call|invoke)\s+(?:the\s+)?critic\b/iu,
  /\b(?:disable|turn\s+off)\s+(?:the\s+)?critic\b/iu,
  /\b(?:the\s+)?critic\s+(?:is\s+)?(?:off|disabled|not\s+required)\b/iu,
  /\b(?:the\s+)?critic\s+(?:must|should)\s+not\s+run\b/iu,
  /\b(?:do\s+not|don't)\s+need\s+(?:a\s+|the\s+)?critic\b/iu,
  /\b(?:use|run|call|invoke)\s+no\s+critic\b/iu,
  /\bwith\s+(?:no|without\s+a|without\s+the)\s+critic\b/iu,
  /^\s*(?:no|without\s+(?:a\s+|the\s+)?)critic[.!]?\s*$/iu,
] as const;

const GROUNDING_STOPWORDS = new Set([
  "a", "add", "after", "an", "and", "answer", "answers", "approved", "are", "as", "at", "be", "been", "being", "before", "behavior", "build", "by", "cairn", "change",
  "cannot", "changed", "check", "checked", "complete", "completed", "condition", "create", "current", "delete", "dimension", "direction", "do", "does", "done", "each", "evidence", "exact", "existing", "feature", "fix", "for",
  "from", "has", "have", "in", "into", "is", "it", "its", "keep", "local", "make", "must", "no", "not",
  "of", "on", "or", "outcome", "owner", "path", "preference", "present", "promise", "prove", "proves", "remains", "remove", "replace", "request", "requested", "result", "satisfy", "satisfies", "satisfying", "set", "should", "show", "shows", "supported",
  "something", "still", "stuff", "task", "that", "the", "their", "thing", "this", "to", "unchanged", "update", "use", "used", "usable", "visible", "was", "when",
  "while", "with", "work", "working", "works", "unavailable", "unresolved",
]);

type ProposalBasisV1 =
  | Readonly<{ kind: "outcome" }>
  | Readonly<{ kind: "requirement"; position: number }>;

type ProposalEvidenceV1 = Readonly<{
  mode: "adapter-attestation" | "artifact-inspection" | "comparison" | "owner-observation";
  proves: string;
  precondition: string | null;
}>;

export type ConductorQualityProposalV1 = Readonly<{
  version: typeof QUALITY_PROPOSAL_VERSION;
  supportedPath: Readonly<{ statement: string; basis: readonly ProposalBasisV1[] }>;
  critic: Readonly<{
    mode: "required" | "optional" | "off";
    reason: string;
    basis: readonly ProposalBasisV1[];
  }>;
  checks: readonly Readonly<{
    promise: string;
    basis: readonly ProposalBasisV1[];
    supportsPath: boolean;
    judge: "cairn" | "critic" | "owner";
    failure: string;
    evidence: ProposalEvidenceV1;
  }>[];
  preferences: readonly Readonly<{
    dimension: string;
    desiredDirection: string;
    basis: readonly ProposalBasisV1[];
  }>[];
  referenceRequests: readonly [];
  unknowns: readonly Readonly<{ text: string; basis: readonly ProposalBasisV1[] }>[];
}>;

type InspectedRecord = Readonly<Record<string, unknown>>;

const proposalCanonical = new WeakMap<object, string>();

function isProxy(value: object): boolean {
  try {
    return nodeTypes.isProxy(value);
  } catch {
    return true;
  }
}

function inspectRecord(value: unknown, expected: readonly string[]): InspectedRecord | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== expected.length || keys.some((key) => typeof key !== "string" || !expected.includes(key))) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of expected) {
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

function inspectArray(value: unknown, cap: number): readonly unknown[] | null {
  try {
    if (value === null || typeof value !== "object" || !Array.isArray(value) || isProxy(value)) return null;
    if (Object.getPrototypeOf(value) !== Array.prototype) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const lengthDescriptor = descriptors.length;
    if (!lengthDescriptor || lengthDescriptor.enumerable || lengthDescriptor.get || lengthDescriptor.set
      || !("value" in lengthDescriptor) || !Number.isSafeInteger(lengthDescriptor.value)
      || lengthDescriptor.value < 0 || lengthDescriptor.value > cap) return null;
    const length = lengthDescriptor.value as number;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== length + 1 || keys.some((key) => typeof key !== "string")) return null;
    const output: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      output.push(descriptor.value);
    }
    if (keys.some((key) => key !== "length" && !/^(0|[1-9][0-9]*)$/.test(key as string))) return null;
    return output;
  } catch {
    return null;
  }
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

function safeText(value: unknown, cap = QUALITY_LIMITS.ordinaryTextCharacters): string | null {
  if (typeof value !== "string" || value.length > cap || value.trim().length === 0
    || FORBIDDEN_VISIBLE_CONTROLS.test(value) || !wellFormedUtf16(value)) return null;
  return value.trim();
}

function safeProposalText(value: unknown, bounded = true): string | null {
  const text = safeText(value);
  if (!text || hasGlobalCriticPower(text)) return null;
  return bounded && isUninspectable(text) ? null : text;
}

function withoutQuotedText(value: string): string {
  return value.replace(/"[^"\r\n]*"|'[^'\r\n]*'|`[^`\r\n]*`|“[^”\r\n]*”|‘[^’\r\n]*’/gu, " ");
}

function criticPolicyText(value: string): string {
  const withoutLiteralCopy = withoutQuotedText(value).replace(
    /\b(?:label|text|message|copy|button|heading|title|tooltip|screen|dialog|field|setting)\b[^.!?\r\n]{0,80}\b(?:says?|reads?|shows?|displays?|saying|reading|showing|displaying|wording|named|called)\b[^.!?\r\n]*/giu,
    " ",
  );
  return withoutLiteralCopy.replace(new RegExp(CRITIC_PRODUCT_CONTEXT.source, "giu"), " ");
}

function hasGlobalCriticPower(value: string): boolean {
  const policy = criticPolicyText(value);
  if (!/\bcritic\b/iu.test(policy)) return false;
  return /\b(?:approve|approval|sign[ -]?off|veto|global\s+verdict|final\s+verdict)\b/iu.test(policy)
    || /\b(?:final\s+say|last\s+word|go[ -]?ahead|green\s+light|sole\s+arbiter)\b/iu.test(policy)
    || /\bpass\s+(?:the\s+)?(?:task|work|result|build)\b/iu.test(policy)
    || /\b(?:accept|accepts|accepted)\s+(?:the\s+)?(?:task|work|result|build)\b/iu.test(policy)
    || /\b(?:decide|determine|declare)\b[^\r\n]{0,160}\b(?:done|complete(?:d)?|success(?:ful)?)\b/iu.test(policy)
    || /\b(?:whether\s+(?:we\s+)?(?:ship|release|finish|complete|deliver)|(?:ship|release|finish|complete|deliver)\s+only|only\s+(?:ship|release|finish|complete|succeed|deliver))\b/iu.test(policy);
}

function parseBasis(value: unknown): ProposalBasisV1 | null {
  const outcome = inspectRecord(value, ["kind"]);
  if (outcome?.kind === "outcome") return Object.freeze({ kind: "outcome" });
  const requirement = inspectRecord(value, ["kind", "position"]);
  if (requirement?.kind !== "requirement" || !Number.isSafeInteger(requirement.position)
    || (requirement.position as number) < 1 || (requirement.position as number) > 8) return null;
  return Object.freeze({ kind: "requirement", position: requirement.position as number });
}

function basisKey(value: ProposalBasisV1): string {
  return value.kind === "outcome" ? "outcome" : `requirement:${value.position}`;
}

function parseBases(value: unknown, allowEmpty = false): readonly ProposalBasisV1[] | null {
  const entries = inspectArray(value, QUALITY_LIMITS.basesPerRow);
  if (!entries || (!allowEmpty && entries.length === 0)) return null;
  const output: ProposalBasisV1[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const parsed = parseBasis(entry);
    if (!parsed || seen.has(basisKey(parsed))) return null;
    seen.add(basisKey(parsed));
    output.push(parsed);
  }
  return Object.freeze(output);
}

function parseEvidence(value: unknown): ProposalEvidenceV1 | null {
  const record = inspectRecord(value, ["mode", "proves", "precondition"]);
  if (!record || (record.mode !== "adapter-attestation" && record.mode !== "artifact-inspection"
    && record.mode !== "comparison" && record.mode !== "owner-observation")) return null;
  const proves = safeProposalText(record.proves);
  const precondition = record.precondition === null ? null : safeProposalText(record.precondition);
  if (!proves || (record.precondition !== null && !precondition)) return null;
  return Object.freeze({
    mode: record.mode,
    proves,
    precondition,
  });
}

function isUninspectable(value: string): boolean {
  const policy = withoutQuotedText(value);
  if (UNAVAILABLE_REFERENCE_PATTERNS.some((pattern) => pattern.test(policy))) return true;
  if (SUBJECTIVE_QUALITY.test(policy) || OTHER_UNBOUNDED_STANDARD.test(policy)) return true;
  if (SPEED_QUALITY.test(policy) && !SPEED_STANDARD.test(policy)) return true;
  if (ACCESSIBILITY_QUALITY.test(policy) && !ACCESSIBILITY_STANDARD.test(policy)) return true;
  if (RESPONSIVE_QUALITY.test(policy) && !SPEED_STANDARD.test(policy) && !LAYOUT_STANDARD.test(policy)) return true;
  if (IMPROVEMENT_QUALITY.test(policy) && !EXPLICIT_TRANSFORMATION.test(policy)) return true;
  return false;
}

function canonicalBasis(value: ProposalBasisV1): string {
  return value.kind === "outcome"
    ? '{"kind":"outcome"}'
    : `{"kind":"requirement","position":${value.position}}`;
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function canonicalProposal(value: ConductorQualityProposalV1): string {
  const bases = (values: readonly ProposalBasisV1[]) => `[${values.map(canonicalBasis).join(",")}]`;
  const checks = value.checks.map((check) => `{"promise":${quote(check.promise)},"basis":${bases(check.basis)},"supportsPath":${check.supportsPath},"judge":${quote(check.judge)},"failure":${quote(check.failure)},"evidence":{"mode":${quote(check.evidence.mode)},"proves":${quote(check.evidence.proves)},"precondition":${check.evidence.precondition === null ? "null" : quote(check.evidence.precondition)}}}`);
  const preferences = value.preferences.map((preference) => `{"dimension":${quote(preference.dimension)},"desiredDirection":${quote(preference.desiredDirection)},"basis":${bases(preference.basis)}}`);
  const unknowns = value.unknowns.map((unknown) => `{"text":${quote(unknown.text)},"basis":${bases(unknown.basis)}}`);
  return `{"version":${quote(value.version)},"supportedPath":{"statement":${quote(value.supportedPath.statement)},"basis":${bases(value.supportedPath.basis)}},"critic":{"mode":${quote(value.critic.mode)},"reason":${quote(value.critic.reason)},"basis":${bases(value.critic.basis)}},"checks":[${checks.join(",")}],"preferences":[${preferences.join(",")}],"referenceRequests":[],"unknowns":[${unknowns.join(",")}]}`;
}

/** Parse and detach content-only quality guidance from a conductor reply.
 * Source authority, ids, coverage, hashes and custody are intentionally not in
 * this grammar; main resolves those only after the intent itself is bound. */
export function parseConductorQualityProposal(value: unknown): ConductorQualityProposalV1 | null {
  try {
    const record = inspectRecord(value, [
      "version", "supportedPath", "critic", "checks", "preferences", "referenceRequests", "unknowns",
    ]);
    if (!record || record.version !== QUALITY_PROPOSAL_VERSION) return null;

    const supportedRecord = inspectRecord(record.supportedPath, ["statement", "basis"]);
    const supportedStatement = supportedRecord ? safeProposalText(supportedRecord.statement) : null;
    const supportedBasis = supportedRecord ? parseBases(supportedRecord.basis) : null;
    if (!supportedStatement || !supportedBasis) return null;

    const criticRecord = inspectRecord(record.critic, ["mode", "reason", "basis"]);
    if (!criticRecord || (criticRecord.mode !== "required" && criticRecord.mode !== "optional" && criticRecord.mode !== "off")) return null;
    const criticReason = safeProposalText(criticRecord.reason, false);
    const criticBasis = parseBases(criticRecord.basis, criticRecord.mode === "optional");
    if (!criticReason || !criticBasis || (criticRecord.mode === "optional" && criticBasis.length !== 0)
      || (criticRecord.mode !== "optional" && criticBasis.length === 0)) return null;

    const checkValues = inspectArray(record.checks, QUALITY_LIMITS.acceptanceChecks);
    if (!checkValues || checkValues.length === 0) return null;
    const checks: Array<ConductorQualityProposalV1["checks"][number]> = [];
    let textCharacters = supportedStatement.length + criticReason.length;
    for (const value of checkValues) {
      const check = inspectRecord(value, ["promise", "basis", "supportsPath", "judge", "failure", "evidence"]);
      if (!check || typeof check.supportsPath !== "boolean"
        || (check.judge !== "cairn" && check.judge !== "critic" && check.judge !== "owner")) return null;
      const promise = safeProposalText(check.promise);
      const basis = parseBases(check.basis);
      const failure = safeProposalText(check.failure);
      const evidence = parseEvidence(check.evidence);
      if (!promise || !basis || !failure || !evidence) return null;
      if ((check.judge === "critic" && evidence.mode !== "artifact-inspection")
        || (check.judge === "owner" && evidence.mode !== "owner-observation")
        || (check.judge === "cairn" && evidence.mode !== "adapter-attestation" && evidence.mode !== "artifact-inspection")) return null;
      textCharacters += promise.length + failure.length + evidence.proves.length
        + (evidence.precondition?.length ?? 0);
      checks.push(Object.freeze({
        promise,
        basis,
        supportsPath: check.supportsPath,
        judge: check.judge,
        failure,
        evidence,
      }));
    }

    const preferenceValues = inspectArray(record.preferences, QUALITY_LIMITS.qualityPreferences);
    if (!preferenceValues) return null;
    const preferences: Array<ConductorQualityProposalV1["preferences"][number]> = [];
    for (const value of preferenceValues) {
      const preference = inspectRecord(value, ["dimension", "desiredDirection", "basis"]);
      const dimension = preference ? safeProposalText(preference.dimension, false) : null;
      const desiredDirection = preference ? safeProposalText(preference.desiredDirection, false) : null;
      const basis = preference ? parseBases(preference.basis) : null;
      if (!dimension || !desiredDirection || !basis
        || UNAVAILABLE_REFERENCE_PATTERNS.some((pattern) => pattern.test(withoutQuotedText(`${dimension} ${desiredDirection}`)))) return null;
      textCharacters += dimension.length + desiredDirection.length;
      preferences.push(Object.freeze({ dimension, desiredDirection, basis }));
    }

    // Q3 has no frozen reference-capture authority. A model request is not a
    // snapshot, so any non-empty value rejects the complete task proposal.
    const referenceRequests = inspectArray(record.referenceRequests, 0);
    if (!referenceRequests) return null;

    const unknownValues = inspectArray(record.unknowns, QUALITY_LIMITS.unknowns);
    if (!unknownValues) return null;
    const unknowns: Array<ConductorQualityProposalV1["unknowns"][number]> = [];
    for (const value of unknownValues) {
      const unknown = inspectRecord(value, ["text", "basis"]);
      const text = unknown ? safeProposalText(unknown.text) : null;
      const basis = unknown ? parseBases(unknown.basis) : null;
      if (!text || !basis) return null;
      textCharacters += text.length;
      unknowns.push(Object.freeze({ text, basis }));
    }
    if (textCharacters > 12_000) return null;

    const parsed: ConductorQualityProposalV1 = Object.freeze({
      version: QUALITY_PROPOSAL_VERSION,
      supportedPath: Object.freeze({ statement: supportedStatement, basis: supportedBasis }),
      critic: Object.freeze({ mode: criticRecord.mode, reason: criticReason, basis: criticBasis }),
      checks: Object.freeze(checks),
      preferences: Object.freeze(preferences),
      referenceRequests: Object.freeze([]) as readonly [],
      unknowns: Object.freeze(unknowns),
    });
    proposalCanonical.set(parsed, canonicalProposal(parsed));
    return parsed;
  } catch {
    return null;
  }
}

export function sameConductorQualityProposal(left: unknown, right: unknown): boolean {
  if (left === null || typeof left !== "object" || right === null || typeof right !== "object") return false;
  const leftCanonical = proposalCanonical.get(left);
  const rightCanonical = proposalCanonical.get(right);
  return leftCanonical !== undefined && rightCanonical !== undefined && leftCanonical === rightCanonical;
}

function coreBasis(value: ProposalBasisV1): IntentBasisV1 {
  return value.kind === "outcome"
    ? Object.freeze({ kind: "intent-outcome" })
    : Object.freeze({ kind: "intent-requirement", index: value.position - 1 });
}

function coreBases(values: readonly ProposalBasisV1[]): readonly IntentBasisV1[] {
  return Object.freeze(values.map(coreBasis));
}

function rowForBasis(intent: TaskIntent, basis: ProposalBasisV1): TaskIntent["outcome"] | null {
  return basis.kind === "outcome" ? intent.outcome : intent.requirements[basis.position - 1] ?? null;
}

function meaningfulTokens(value: string): ReadonlySet<string> {
  const output = new Set<string>();
  const tokens = value.normalize("NFKC").toLocaleLowerCase("en-US").match(/[\p{L}\p{N}]+/gu) ?? [];
  for (const rawToken of tokens) {
    if (GROUNDING_STOPWORDS.has(rawToken)) continue;
    let token = rawToken;
    if (token.endsWith("ies") && token.length > 4) token = `${token.slice(0, -3)}y`;
    else if (token.endsWith("s") && token.length > 4 && !/(?:ss|us|is)$/u.test(token)) token = token.slice(0, -1);
    if (!GROUNDING_STOPWORDS.has(token)) output.add(token);
  }
  return output;
}

function sharesMeaningfulTerm(left: string, right: string): boolean {
  const leftTokens = meaningfulTokens(left);
  const rightTokens = meaningfulTokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return false;
  for (const token of leftTokens) if (rightTokens.has(token)) return true;
  return false;
}

function groundedInEveryBasis(intent: TaskIntent, bases: readonly ProposalBasisV1[], value: string): boolean {
  return bases.every((basis) => {
    const row = rowForBasis(intent, basis);
    if (!row) return false;
    const sourceText = row.source === "cairn-chosen" ? row.text : row.owner.text;
    return sharesMeaningfulTerm(sourceText, value);
  });
}

function exactOwnerPromise(intent: TaskIntent, basis: ProposalBasisV1): string | null {
  const row = rowForBasis(intent, basis);
  return row?.source === "owner-stated" ? row.owner.text.trim() : null;
}

function expectedFailureFor(promise: string): string {
  return `The result does not satisfy this exact request or its supported path: ${promise}`;
}

function expectedProofFor(promise: string): string {
  return `The approved check answers this exact request and its supported path: ${promise}`;
}

function explicitCriticMode(text: string): "required" | "off" | null | "ambiguous" {
  const policyText = criticPolicyText(text);
  if (!/\bcritic\b/iu.test(policyText)) return null;
  const off = CRITIC_OFF.some((pattern) => pattern.test(policyText));
  const withoutOffPhrases = CRITIC_OFF.reduce((remaining, pattern) => {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    return remaining.replace(new RegExp(pattern.source, flags), " ");
  }, policyText);
  const required = CRITIC_REQUIRED.some((pattern) => pattern.test(withoutOffPhrases));
  if (required && off) return "ambiguous";
  if (required) return "required";
  if (off) return "off";
  if (/\b(?:optional(?:ly)?\s+(?:use\s+)?(?:the\s+)?critic|(?:the\s+)?critic\s+(?:is\s+)?optional|(?:the\s+)?critic\s+(?:may|can|could)\s+(?:run|review|inspect|check|evaluate))\b/iu.test(policyText)) return null;
  return "ambiguous";
}

function expectedCriticMode(intent: TaskIntent): Readonly<{
  mode: "required" | "optional" | "off";
  bases: readonly ProposalBasisV1[];
}> | null {
  const found: Array<Readonly<{ mode: "required" | "off"; basis: ProposalBasisV1 }>> = [];
  const rows: Array<Readonly<{ text: string; basis: ProposalBasisV1 }>> = [];
  if (intent.outcome.source === "owner-stated") rows.push({ text: intent.outcome.owner.text, basis: Object.freeze({ kind: "outcome" }) });
  intent.requirements.forEach((row, index) => {
    if (row.source === "owner-stated") rows.push({ text: row.owner.text, basis: Object.freeze({ kind: "requirement", position: index + 1 }) });
  });
  for (const row of rows) {
    const mode = explicitCriticMode(row.text);
    if (mode === "ambiguous" || hasGlobalCriticPower(row.text)) return null;
    if (mode !== null) found.push({ mode, basis: row.basis });
  }
  const modes = new Set(found.map((entry) => entry.mode));
  if (modes.size > 1) return null;
  if (found.length === 0) return Object.freeze({ mode: "optional", bases: Object.freeze([]) });
  return Object.freeze({ mode: found[0].mode, bases: Object.freeze(found.map((entry) => entry.basis)) });
}

function sameBases(left: readonly ProposalBasisV1[], right: readonly ProposalBasisV1[]): boolean {
  return left.length === right.length && left.every((basis, index) => basisKey(basis) === basisKey(right[index]));
}

function requiredRowsInspectable(intent: TaskIntent): boolean {
  const rows = [intent.outcome, ...intent.requirements.filter((row) => row.source === "owner-stated")];
  return rows.every((row) => row.source === "owner-stated"
    && !isUninspectable(row.owner.text)
    && !OPEN_ENDED_DIRECT.test(withoutQuotedText(row.owner.text))
    && meaningfulTokens(row.owner.text).size > 0
    && !hasGlobalCriticPower(row.owner.text));
}

function previewFor(taskSpec: TaskSpecV1): TaskSpecProposalPreviewV1 | null {
  const review = taskSpecReviewView(taskSpec);
  if (!review) return null;
  const request = Object.freeze({
    outcome: Object.freeze({ ...review.intent.outcome }),
    requirements: Object.freeze(review.intent.requirements.map((row) => Object.freeze({ ...row }))),
  });
  return Object.freeze({
    version: "cairn-task-spec-proposal-preview/v1",
    request,
    supportedPath: Object.freeze({
      statement: review.supportedPath.statement,
      sources: Object.freeze([...review.supportedPath.basis]),
    }),
    critic: Object.freeze({
      mode: review.critic.mode,
      reason: review.critic.reason,
      sources: Object.freeze([...review.critic.basis]),
    }),
    criteria: Object.freeze(review.criteria.map((criterion) => Object.freeze({
      id: criterion.id,
      promise: criterion.promise,
      kind: criterion.kind,
      judge: criterion.judge,
      sources: Object.freeze([...criterion.basis]),
      failure: criterion.failureCondition.statement,
      evidence: Object.freeze({ ...criterion.evidenceStandard }),
    }))),
    preferences: Object.freeze(review.preferences.map((preference) => Object.freeze({
      id: preference.id,
      dimension: preference.dimension,
      desiredDirection: preference.desiredDirection,
      sources: Object.freeze([...preference.basis]),
    }))),
    references: Object.freeze(review.references.map((reference) => Object.freeze({
      title: reference.title,
      source: reference.source,
      dimensions: Object.freeze(reference.dimensions.map((dimension) => dimension.description)),
      antiCopyBoundary: reference.antiCopyBoundary,
    }))),
    unknowns: Object.freeze(review.unknowns.map((unknown) => Object.freeze({
      text: unknown.text,
      sources: Object.freeze([...unknown.basis]),
    }))),
    callBudget: Object.freeze({ ...review.callBudget }),
  });
}

function bundle(intent: TaskIntent, proposal: ConductorQualityProposalV1): Readonly<{
  taskSpec: TaskSpecV1;
  preview: TaskSpecProposalPreviewV1;
}> | null {
  const expectedMode = expectedCriticMode(intent);
  if (!expectedMode || proposal.critic.mode !== expectedMode.mode
    || proposal.critic.reason !== CRITIC_REASONS[expectedMode.mode]
    || !sameBases(proposal.critic.basis, expectedMode.bases)
    || !requiredRowsInspectable(intent)) return null;
  const requiredBasisKeys = new Set<string>(["outcome"]);
  intent.requirements.forEach((row, index) => {
    if (row.source === "owner-stated") requiredBasisKeys.add(`requirement:${index + 1}`);
  });
  const coveredBasisKeys = new Set<string>();
  for (const check of proposal.checks) {
    if (check.basis.length !== 1) return null;
    const key = basisKey(check.basis[0]);
    const exactPromise = exactOwnerPromise(intent, check.basis[0]);
    if (!requiredBasisKeys.has(key) || coveredBasisKeys.has(key) || exactPromise === null
      || check.promise !== exactPromise
      || check.failure !== expectedFailureFor(exactPromise)
      || check.evidence.proves !== expectedProofFor(exactPromise)
      || check.evidence.precondition !== null
      || check.judge !== "cairn"
      || check.evidence.mode !== "adapter-attestation") return null;
    coveredBasisKeys.add(key);
  }
  if (coveredBasisKeys.size !== requiredBasisKeys.size) return null;
  if (proposal.checks.filter((check) => check.supportsPath).length !== 1) return null;
  const supportedCheck = proposal.checks.find((check) => check.supportsPath);
  if (!supportedCheck || !sameBases(supportedCheck.basis, proposal.supportedPath.basis)
    || supportedCheck.promise !== proposal.supportedPath.statement) return null;
  for (const preference of proposal.preferences) {
    if (!groundedInEveryBasis(intent, preference.basis, `${preference.dimension} ${preference.desiredDirection}`)) return null;
  }
  for (const unknown of proposal.unknowns) {
    if (!groundedInEveryBasis(intent, unknown.basis, unknown.text)) return null;
  }

  const criteria = proposal.checks.map((check, index) => {
    const id = `c${index + 1}` as `c${number}`;
    const allowedArtifactIds = Object.freeze([`artifact-${id}-1`]);
    return Object.freeze({
      id,
      promise: check.promise,
      kind: check.supportsPath ? "non-regression" as const : "acceptance" as const,
      judge: check.judge,
      basis: coreBases(check.basis) as readonly CriterionBasisV1[],
      failureCondition: Object.freeze({ id: `failure-${id}`, statement: check.failure, allowedArtifactIds }),
      evidenceStandard: Object.freeze({
        mode: check.evidence.mode,
        proves: check.evidence.proves,
        precondition: check.evidence.precondition,
      }),
      comparison: null,
    });
  });
  const preferences = proposal.preferences.map((preference, index) => Object.freeze({
    id: `p${index + 1}` as `p${number}`,
    dimension: preference.dimension,
    desiredDirection: preference.desiredDirection,
    basis: coreBases(preference.basis) as readonly CriterionBasisV1[],
    comparison: null,
  }));
  const unknowns = proposal.unknowns.map((unknown) => Object.freeze({
    text: unknown.text,
    basis: coreBases(unknown.basis),
  }));
  const outcomeCriterionIds = Object.freeze(criteria
    .filter((_criterion, index) => proposal.checks[index].basis.some((basis) => basis.kind === "outcome"))
    .map((criterion) => criterion.id));
  const requirementCriteria = Object.freeze(intent.requirements.flatMap((row, requirementIndex) => {
    if (row.source !== "owner-stated") return [];
    const criterionIds = Object.freeze(criteria
      .filter((_criterion, checkIndex) => proposal.checks[checkIndex].basis
        .some((basis) => basis.kind === "requirement" && basis.position === requirementIndex + 1))
      .map((criterion) => criterion.id));
    return [Object.freeze({ requirementIndex, criterionIds })];
  }));
  const supportedPathCriterionId = criteria[proposal.checks.findIndex((check) => check.supportsPath)]?.id;
  if (!supportedPathCriterionId) return null;

  const criticBasis = proposal.critic.mode === "optional"
    ? Object.freeze([{ kind: "cairn-default" as const, reason: "not-requested" as const }])
    : coreBases(proposal.critic.basis) as readonly CriterionBasisV1[];
  const candidate: QualityPlanCandidateV1 = Object.freeze({
    version: QUALITY_PLAN_VERSION,
    target: Object.freeze({ kind: "local-task", basis: Object.freeze([{ kind: "intent-outcome" as const }]) }),
    supportedPath: Object.freeze({ statement: proposal.supportedPath.statement, basis: coreBases(proposal.supportedPath.basis) }),
    critic: Object.freeze({ mode: proposal.critic.mode, reason: proposal.critic.reason, basis: criticBasis }) as QualityPlanCandidateV1["critic"],
    candidateStates: Object.freeze([]),
    acceptanceChecks: Object.freeze(criteria),
    qualityPreferences: Object.freeze(preferences),
    references: Object.freeze([]),
    unknowns: Object.freeze(unknowns),
    coverage: Object.freeze({ outcomeCriterionIds, requirementCriteria, supportedPathCriterionId }),
  });
  const taskSpec = bindTaskSpec(intent, candidate);
  if (!taskSpec) return null;
  const preview = previewFor(taskSpec);
  return preview ? Object.freeze({ taskSpec, preview }) : null;
}

export function composeConversationTaskSpecProposal(
  intent: TaskIntent,
  proposal: ConductorQualityProposalV1,
): Readonly<{ taskSpec: TaskSpecV1; preview: TaskSpecProposalPreviewV1 }> | null {
  if (canonicalTaskIntent(intent) === null
    || proposal === null || typeof proposal !== "object" || !proposalCanonical.has(proposal)) return null;
  return bundle(intent, proposal);
}

export function composeDirectTaskSpecProposal(
  intent: TaskIntent,
): Readonly<{ taskSpec: TaskSpecV1; preview: TaskSpecProposalPreviewV1 }> | null {
  if (canonicalTaskIntent(intent) === null
    || intent.outcome.source !== "owner-stated" || intent.outcome.owner.kind !== "direct"
    || intent.requirements.length !== 0 || intent.context.length !== 0) return null;
  const exact = intent.outcome.owner.text.trim();
  if (exact.length > 850 || isUninspectable(exact) || OPEN_ENDED_DIRECT.test(withoutQuotedText(exact))
    || hasGlobalCriticPower(exact) || meaningfulTokens(exact).size === 0) return null;
  const mode = explicitCriticMode(exact);
  if (mode === "ambiguous") return null;
  const criticMode = mode ?? "optional";
  const basis = criticMode === "optional" ? [] : [{ kind: "outcome" as const }];
  const raw = {
    version: QUALITY_PROPOSAL_VERSION,
    supportedPath: {
      statement: exact,
      basis: [{ kind: "outcome" }],
    },
    critic: {
      mode: criticMode,
      reason: CRITIC_REASONS[criticMode],
      basis,
    },
    checks: [{
      promise: exact,
      basis: [{ kind: "outcome" }],
      supportsPath: true,
      judge: "cairn",
      failure: `The result does not satisfy this exact request or its supported path: ${exact}`,
      evidence: {
        mode: "adapter-attestation",
        proves: `The approved check answers this exact request and its supported path: ${exact}`,
        precondition: null,
      },
    }],
    preferences: [],
    referenceRequests: [],
    unknowns: [],
  };
  const proposal = parseConductorQualityProposal(raw);
  return proposal ? bundle(intent, proposal) : null;
}
