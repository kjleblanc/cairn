import { createHash } from "node:crypto";
import { join } from "node:path";
import { types as nodeTypes } from "node:util";
import {
  BUILDER_CAPABILITY_REVIEW_LABELS,
  BUILDER_PROPOSAL_REVIEW_VERSION,
  type BuilderCapabilityReviewCategoryV1,
  type BuilderProposalReviewV1,
} from "../../shared/builder-proposal-review.js";
import type { ConductorBuilderReviewTurn } from "../../shared/ipc.js";
import { inspectProjectRoot, type ProjectSnapshot } from "../connections/project-authority.js";
import { appendVerifiedLine, externalMarkerContainer, readStrictVerifiedLines } from "./custody.js";
import { assertConversationId } from "./conversation-id.js";
import { canonicalProjectKey } from "./turnauth.js";

export const BUILDER_REVIEW_TURN_VERSION = "cairn-builder-review-turn/v1" as const;
const BUILDER_REVIEW_MARKER_DOMAIN = "cairn-builder-review-marker/v1";
const BUILDER_REVIEW_PROJECT_BINDING_DOMAIN = "cairn-builder-review-project/v1";
const UUID_V4 = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const ASCII_PATH = /^[\x20-\x7e]+$/u;
const FORBIDDEN_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/u;
const FORBIDDEN_PATH = /[\\:<>"|?*\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/u;
const PROTECTED_SEGMENTS = new Set([".git", ".cairn", ".agents", ".codex"].map((value) => value.toUpperCase()));
const HOST_CONTROL_SEGMENTS = new Set([".github", ".gitlab", ".circleci"].map((value) => value.toUpperCase()));
const DEPENDENCY_SEGMENTS = new Set([
  "node_modules", "vendor", ".venv", "venv", "bower_components", "pods",
].map((value) => value.toUpperCase()));
const GENERATED_SEGMENTS = new Set([
  "dist", "build", "out", "coverage", ".next", ".nuxt", ".cache", "target",
].map((value) => value.toUpperCase()));
const CONTROL_OR_DEPENDENCY_FILES = new Set([
  ".gitattributes", ".gitignore", ".gitmodules",
  "package.json", "package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb",
  "pyproject.toml", "poetry.lock", "pipfile", "pipfile.lock", "requirements.txt",
  "cargo.toml", "cargo.lock", "go.mod", "go.sum", "pom.xml", "composer.json", "composer.lock",
  "gemfile", "gemfile.lock", "dockerfile", "docker-compose.yml", "docker-compose.yaml",
  ".npmrc", ".yarnrc", ".yarnrc.yml", "pnpm-workspace.yaml", "lerna.json",
  "vercel.json", "netlify.toml", "wrangler.toml", "procfile", "fly.toml", "render.yaml",
  ".gitlab-ci.yml", "azure-pipelines.yml", "bitbucket-pipelines.yml", "cloudbuild.yaml",
  "serverless.yml", "serverless.yaml",
  "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts", "gradle.properties",
  "go.work", "go.work.sum", "deno.json", "deno.jsonc", "uv.lock", "environment.yml", "environment.yaml",
].map((value) => value.toUpperCase()));
const CONTROL_OR_DEPENDENCY_FILE_PATTERN = /^(?:requirements(?:[-_.].*)?\.txt|.+\.(?:csproj|fsproj|vbproj|sln))$/iu;
const WINDOWS_DEVICE_SEGMENT = /^(?:con|prn|aux|nul|conin\$|conout\$|com(?:[1-9\u00b9\u00b2\u00b3])|lpt(?:[1-9\u00b9\u00b2\u00b3]))(?:\..*)?$/iu;
const INSTALL_SCRIPT_SEGMENT = /^(?:(?:pre|post)?install|setup|bootstrap)(?:[._-].*)?$/iu;
const CREDENTIAL_SEGMENT = /^(?:\.env(?:\..*)?|keys?|secrets?|credentials?|tokens?|id_(?:rsa|ed25519)(?:\.pub)?|.*(?:secret|token|credential|private[-_.]?key|service[-_.]?account).*|.*\.(?:pem|key|p12|pfx))$/iu;

let markerDir: string | null = null;
const projectBindings = new WeakSet<object>();

export function setBuilderReviewMarkerDir(dir: string | null): void {
  markerDir = dir;
}

export function isBuilderReviewDisplayTurnId(value: unknown): value is string {
  return typeof value === "string" && UUID_V4.test(value);
}

/** Read only the opaque identity from a parsed builder-looking line. This is
 * deliberately looser than full validation so an extra-key/tampered physical
 * duplicate makes the genuine id ambiguous instead of being ignored. */
export function builderReviewDisplayTurnIdCandidate(value: unknown): string | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const role = descriptors.role;
    const id = descriptors.displayTurnId;
    if (!role || !id || !role.enumerable || !id.enumerable || role.get || role.set || id.get || id.set
      || !("value" in role) || !("value" in id) || role.value !== "builder-review"
      || !isBuilderReviewDisplayTurnId(id.value)) return null;
    return id.value;
  } catch {
    return null;
  }
}

function isProxy(value: object): boolean {
  try { return nodeTypes.isProxy(value); } catch { return true; }
}

/** Detach caller/project data without evaluating accessors or Proxy traps. */
function record(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const own = Reflect.ownKeys(value);
    if (own.length !== keys.length || own.some((key, index) => key !== keys[index])) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

function denseArray(value: unknown, cap: number): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const length = Object.getOwnPropertyDescriptor(value, "length")?.value;
    if (!Number.isSafeInteger(length) || length < 0 || length > cap) return null;
    const own = Reflect.ownKeys(value);
    if (own.length !== length + 1 || own.at(-1) !== "length") return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const output: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      if (own[index] !== String(index)) return null;
      const descriptor = descriptors[String(index)];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      output.push(descriptor.value);
    }
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
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

function text(value: unknown, cap: number, meaningful: boolean): value is string {
  return typeof value === "string" && value.length <= cap
    && (!meaningful || value.trim().length > 0)
    && !FORBIDDEN_TEXT.test(value) && wellFormedUtf16(value);
}

function sha256(value: unknown): value is string {
  return typeof value === "string" && SHA256.test(value);
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export type BuilderReviewProjectBinding = Readonly<{
  snapshot: ProjectSnapshot;
  projectHash: string;
}>;

/** Capture the same canonical root identity Task 224's future trusted
 * selector must bind. Filesystem identity is observed twice by
 * `inspectProjectRoot`; the protocol hash matches Core candidate custody. */
export function captureBuilderReviewProject(root: string): BuilderReviewProjectBinding | null {
  const snapshot = inspectProjectRoot(root);
  if (snapshot === null) return null;
  const projectHash = createHash("sha256")
    .update(BUILDER_REVIEW_PROJECT_BINDING_DOMAIN).update("\0")
    .update(snapshot.canonicalRootDigest).update("\0")
    .update(snapshot.filesystemIdentityDigest)
    .digest("hex");
  const binding = Object.freeze({ snapshot, projectHash });
  projectBindings.add(binding);
  return binding;
}

export function builderReviewProjectStillExact(root: string, binding: BuilderReviewProjectBinding): boolean {
  if (binding === null || typeof binding !== "object" || !projectBindings.has(binding)) return false;
  const current = captureBuilderReviewProject(root);
  return current !== null
    && current.snapshot.canonicalRoot === binding.snapshot.canonicalRoot
    && current.snapshot.deviceId === binding.snapshot.deviceId
    && current.snapshot.fileId === binding.snapshot.fileId
    && current.projectHash === binding.projectHash;
}

function uuid(value: unknown): value is string {
  return typeof value === "string" && UUID_V4.test(value);
}

function path(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 1_024
    || value !== value.normalize("NFC") || value.startsWith("/") || value.endsWith("/")
    || !ASCII_PATH.test(value) || FORBIDDEN_PATH.test(value) || !wellFormedUtf16(value)) return false;
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === ".."
    || segment.endsWith(".") || segment.endsWith(" "))) return false;
  const folded = segments.map((segment) => segment.toUpperCase());
  return !folded.some((segment) => HOST_CONTROL_SEGMENTS.has(segment)
    || PROTECTED_SEGMENTS.has(segment) || DEPENDENCY_SEGMENTS.has(segment)
    || GENERATED_SEGMENTS.has(segment) || CONTROL_OR_DEPENDENCY_FILES.has(segment)
    || WINDOWS_DEVICE_SEGMENT.test(segment) || CONTROL_OR_DEPENDENCY_FILE_PATTERN.test(segment)
    || INSTALL_SCRIPT_SEGMENT.test(segment) || CREDENTIAL_SEGMENT.test(segment));
}

function freezeReview(value: unknown): BuilderProposalReviewV1 | null {
  const identityKeys = ["version", "taskNumber", "runId", "turnId", "contextSha256", "responseSha256"] as const;
  const valueKind = record(value, [...identityKeys, "kind", "summary", "replacements"])
    ?? record(value, [...identityKeys, "kind", "category", "categoryLabel", "suggestedTargetLabel", "suggestedTarget", "what", "why", "expectedEffect", "dataExposure", "costBasis", "recovery"]);
  if (!valueKind || valueKind.version !== BUILDER_PROPOSAL_REVIEW_VERSION
    || !Number.isSafeInteger(valueKind.taskNumber) || (valueKind.taskNumber as number) < 1 || (valueKind.taskNumber as number) > 999_999
    || !uuid(valueKind.runId) || !uuid(valueKind.turnId) || valueKind.runId === valueKind.turnId
    || !sha256(valueKind.contextSha256) || !sha256(valueKind.responseSha256)) return null;

  const identity = {
    version: BUILDER_PROPOSAL_REVIEW_VERSION,
    taskNumber: valueKind.taskNumber as number,
    runId: valueKind.runId,
    turnId: valueKind.turnId,
    contextSha256: valueKind.contextSha256,
    responseSha256: valueKind.responseSha256,
  } as const;

  if (valueKind.kind === "replacement-proposal") {
    if (!text(valueKind.summary, 1_000, true)) return null;
    const inputRows = denseArray(valueKind.replacements, 8);
    if (!inputRows || inputRows.length === 0) return null;
    const rows = [];
    const seen = new Set<string>();
    let previousFoldedPath: string | null = null;
    let totalBefore = 0;
    let totalAfter = 0;
    for (const input of inputRows) {
      const row = record(input, ["projectRelativePath", "beforeSha256", "beforeText", "afterSha256", "afterText"]);
      const foldedPath = typeof row?.projectRelativePath === "string" ? row.projectRelativePath.toUpperCase() : "";
      if (!row || !path(row.projectRelativePath) || seen.has(foldedPath)
        || (previousFoldedPath !== null && foldedPath <= previousFoldedPath)
        || !sha256(row.beforeSha256) || !text(row.beforeText, 8_000, false)
        || sha256Text(row.beforeText) !== row.beforeSha256
        || !sha256(row.afterSha256) || !text(row.afterText, 8_000, false)
        || sha256Text(row.afterText) !== row.afterSha256 || row.afterText === row.beforeText) return null;
      seen.add(foldedPath);
      previousFoldedPath = foldedPath;
      totalBefore += row.beforeText.length;
      totalAfter += row.afterText.length;
      if (totalBefore > 32_000 || totalAfter > 32_000) return null;
      rows.push(Object.freeze({
        projectRelativePath: row.projectRelativePath,
        beforeSha256: row.beforeSha256,
        beforeText: row.beforeText,
        afterSha256: row.afterSha256,
        afterText: row.afterText,
      }));
    }
    return Object.freeze({ ...identity, kind: "replacement-proposal", summary: valueKind.summary, replacements: Object.freeze(rows) });
  }

  if (valueKind.kind !== "capability-request" || typeof valueKind.category !== "string"
    || !Object.prototype.hasOwnProperty.call(BUILDER_CAPABILITY_REVIEW_LABELS, valueKind.category)) return null;
  const category = valueKind.category as BuilderCapabilityReviewCategoryV1;
  const categoryLabel = BUILDER_CAPABILITY_REVIEW_LABELS[category];
  if (typeof categoryLabel !== "string" || valueKind.categoryLabel !== categoryLabel || valueKind.suggestedTargetLabel !== "Untrusted suggestion"
    || !text(valueKind.suggestedTarget, 1_000, true) || !text(valueKind.what, 1_000, true)
    || !text(valueKind.why, 1_000, true) || !text(valueKind.expectedEffect, 1_000, true)
    || !text(valueKind.dataExposure, 1_000, true) || !text(valueKind.costBasis, 1_000, true)
    || !text(valueKind.recovery, 1_000, true)) return null;
  return Object.freeze({
    ...identity,
    kind: "capability-request",
    category,
    categoryLabel,
    suggestedTargetLabel: "Untrusted suggestion",
    suggestedTarget: valueKind.suggestedTarget,
    what: valueKind.what,
    why: valueKind.why,
    expectedEffect: valueKind.expectedEffect,
    dataExposure: valueKind.dataExposure,
    costBasis: valueKind.costBasis,
    recovery: valueKind.recovery,
  });
}

export function parseBuilderProposalReview(value: unknown): BuilderProposalReviewV1 | null {
  try { return freezeReview(value); } catch { return null; }
}

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

export function builderProposalReviewDigest(reviewValue: unknown): string | null {
  const review = parseBuilderProposalReview(reviewValue);
  return review === null ? null : createHash("sha256").update(canonical(review)).digest("hex");
}

export function parseBuilderReviewTurn(value: unknown): ConductorBuilderReviewTurn | null {
  const turn = record(value, ["role", "version", "displayTurnId", "review", "ts"]);
  if (!turn || turn.role !== "builder-review" || turn.version !== BUILDER_REVIEW_TURN_VERSION
    || !isBuilderReviewDisplayTurnId(turn.displayTurnId) || typeof turn.ts !== "string" || !ISO_TIMESTAMP.test(turn.ts)
    || !Number.isFinite(Date.parse(turn.ts)) || new Date(turn.ts).toISOString() !== turn.ts) return null;
  const parsedReview = parseBuilderProposalReview(turn.review);
  if (parsedReview === null) return null;
  return Object.freeze({
    role: "builder-review",
    version: BUILDER_REVIEW_TURN_VERSION,
    displayTurnId: turn.displayTurnId,
    review: parsedReview,
    ts: turn.ts,
  });
}

function builderReviewTurnDigestForProject(
  project: ProjectSnapshot,
  conversationId: string,
  turnValue: unknown,
): string | null {
  try {
    assertConversationId(conversationId);
    const turn = parseBuilderReviewTurn(turnValue);
    if (turn === null) return null;
    const projectionDigest = builderProposalReviewDigest(turn.review);
    if (projectionDigest === null) return null;
    return createHash("sha256").update(canonical([
      BUILDER_REVIEW_MARKER_DOMAIN,
      BUILDER_REVIEW_TURN_VERSION,
      project.canonicalRoot.replace(/\\/g, "/"),
      project.canonicalRootDigest,
      project.filesystemIdentityDigest,
      conversationId,
      turn.displayTurnId,
      turn.ts,
      projectionDigest,
      turn.review,
    ])).digest("hex");
  } catch {
    return null;
  }
}

export function builderReviewTurnDigest(dir: string, conversationId: string, turnValue: unknown): string | null {
  const project = inspectProjectRoot(dir);
  return project === null ? null : builderReviewTurnDigestForProject(project, conversationId, turnValue);
}

function markerFile(dir: string, create: boolean, canonicalKey = canonicalProjectKey(dir)): string | null {
  const container = externalMarkerContainer(markerDir, dir, "builder-review-markers", create);
  if (container === null) return null;
  const project = createHash("sha256").update(canonicalKey).digest("hex");
  return join(container, `${project}.txt`);
}

/** Record exact display custody before project-writable JSONL is touched. */
export function recordBuilderReviewMarker(
  dir: string,
  conversationId: string,
  turnValue: unknown,
  project: BuilderReviewProjectBinding,
): string {
  const digest = projectBindings.has(project as object)
    ? builderReviewTurnDigestForProject(project.snapshot, conversationId, turnValue)
    : null;
  if (digest === null) throw new Error("BUILDER_REVIEW_TURN_INVALID: Cairn refused malformed Builder display data.");
  if (!builderReviewProjectStillExact(dir, project)) {
    throw new Error("BUILDER_REVIEW_PROJECT_CHANGED: Builder review target identity changed before custody.");
  }
  let file: string | null;
  const stableCanonicalProjectKey = project.snapshot.canonicalRoot.replace(/\\/g, "/");
  try { file = markerFile(dir, true, stableCanonicalProjectKey); } catch {
    throw new Error("BUILDER_REVIEW_MARKER_CUSTODY_UNSAFE: Builder review custody must stay outside the selected project.");
  }
  if (file === null) throw new Error("BUILDER_REVIEW_MARKER_STORE_UNAVAILABLE: Cairn cannot authenticate this Builder review.");
  try {
    appendVerifiedLine(file, digest, SHA256);
    const lines = readStrictVerifiedLines(file, SHA256);
    if (lines.at(-1) !== digest || lines.filter((candidate) => candidate === digest).length !== 1
      || !builderReviewProjectStillExact(dir, project)) throw new Error("verify");
  } catch {
    throw new Error("BUILDER_REVIEW_MARKER_VERIFY_FAILED: Cairn could not verify Builder review custody.");
  }
  return digest;
}

export function builderReviewMarkerSequence(dir: string): readonly string[] {
  try { return readStrictVerifiedLines(markerFile(dir, false), SHA256); } catch { return Object.freeze([]); }
}
