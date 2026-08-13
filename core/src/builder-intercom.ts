import { createHash } from "node:crypto";
import { types as nodeTypes } from "node:util";

import {
  canonicalEvidencePlan,
  canonicalTaskSpec,
  evidencePlanSha256,
  taskSpecSha256,
  type EvidencePlanV1,
  type TaskSpecV1,
} from "./quality.js";

/**
 * The dark, provider-independent half of Cairn's Builder intercom.
 *
 * Everything in this module is inert data. It owns no filesystem, process,
 * network, credential, approval, or callback. A valid response is still only
 * a proposal; a later Main-owned component must independently inspect current
 * state and compose any executable plan.
 */
export const BUILDER_TURN_CONTEXT_VERSION = "cairn-builder-turn-context/v1" as const;
export const BUILDER_TURN_RESPONSE_VERSION = "cairn-builder-turn-response/v1" as const;
export const BUILDER_SELECTOR_PROVENANCE_VERSION = "cairn-builder-context-selector/v1" as const;

export const BUILDER_INTERCOM_LIMITS = Object.freeze({
  selectedTrackedText: 8,
  replacements: 8,
  textCharactersPerRow: 8_000,
  totalTextCharacters: 32_000,
  projectRelativePathCharacters: 1_024,
  plainLanguageCharacters: 1_000,
} as const);

export const BUILDER_CAPABILITY_REQUEST_CATEGORIES = Object.freeze([
  "additional-tracked-text",
  "external-reference",
  "dependency-change",
  "external-service-action",
  "owner-clarification",
] as const);

export type BuilderCapabilityRequestCategoryV1 =
  typeof BUILDER_CAPABILITY_REQUEST_CATEGORIES[number];

export type BuilderSelectedTrackedTextV1 = Readonly<{
  id: string;
  projectRelativePath: string;
  sha256: string;
  content: string;
  truncated: false;
  provenance: BuilderSelectedTextProvenanceV1;
}>;

/** Builder selection adds topology facts that the critic's read-only packet
 * did not need. A later patch planner must still recheck all three from the
 * live filesystem; these fields only make the inert proposal's input claim
 * complete and unambiguous. */
export type BuilderSelectedTextProvenanceV1 = Readonly<{
  selectorVersion: typeof BUILDER_SELECTOR_PROVENANCE_VERSION;
  projectHash: string;
  connectionConsentVersion: string;
  gitTracked: true;
  ordinaryText: true;
  regularFile: true;
  symbolicLink: false;
  reparsePoint: false;
  hardLinkCount: 1;
  submodule: false;
  gitIgnored: false;
  dependency: false;
  packageOrDependencyControl: false;
  installScript: false;
  generated: false;
  deploymentOrProductionControl: false;
  credentialLikePath: false;
  credentialLikeContent: false;
  insideProject: true;
  reservedArea: false;
  consented: true;
}>;

export type BuilderTurnContextV1 = Readonly<{
  version: typeof BUILDER_TURN_CONTEXT_VERSION;
  taskNumber: number;
  runId: string;
  turnId: string;
  projectHash: string;
  connectionConsentVersion: string;
  taskSpec: TaskSpecV1;
  taskSpecSha256: string;
  evidencePlan: EvidencePlanV1;
  evidencePlanSha256: string;
  criterionIds: readonly `c${number}`[];
  baseHead: string;
  gitStateSha256: string;
  selectedTrackedText: readonly BuilderSelectedTrackedTextV1[];
}>;

export type BuilderReplacementProposalRowV1 = Readonly<{
  projectRelativePath: string;
  beforeSha256: string;
  afterText: string;
  afterSha256: string;
}>;

export type BuilderReplacementProposalV1 = Readonly<{
  version: typeof BUILDER_TURN_RESPONSE_VERSION;
  contextSha256: string;
  kind: "replacement-proposal";
  summary: string;
  replacements: readonly BuilderReplacementProposalRowV1[];
}>;

export type BuilderCapabilityRequestV1 = Readonly<{
  category: BuilderCapabilityRequestCategoryV1;
  suggestedTarget: string;
  what: string;
  why: string;
  expectedEffect: string;
  dataExposure: string;
  costBasis: string;
  recovery: string;
}>;

export type BuilderCapabilityRequestResponseV1 = Readonly<{
  version: typeof BUILDER_TURN_RESPONSE_VERSION;
  contextSha256: string;
  kind: "capability-request";
  request: BuilderCapabilityRequestV1;
}>;

export type BuilderTurnResponseV1 =
  | BuilderReplacementProposalV1
  | BuilderCapabilityRequestResponseV1;

type InspectedRecord = Readonly<Record<string, unknown>>;

const contextBrands = new WeakSet<object>();
const responseBindings = new WeakMap<object, BuilderTurnContextV1>();

const SHA256 = /^[a-f0-9]{64}$/u;
const GIT_OBJECT_ID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const UUID_V4 = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;
const MACHINE_ID = /^[a-z0-9](?:[a-z0-9._/-]{0,126}[a-z0-9])?$/u;
const ASCII_PATH = /^[\x20-\x7e]+$/u;
const FORBIDDEN_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/u;
const FORBIDDEN_PATH = /[\\:<>"|?*\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/u;
const PROTECTED_SEGMENTS = new Set([".git", ".cairn", ".agents", ".codex"].map(pathIdentity));
const HOST_CONTROL_SEGMENTS = new Set([".github", ".gitlab", ".circleci"].map(pathIdentity));
const DEPENDENCY_SEGMENTS = new Set([
  "node_modules", "vendor", ".venv", "venv", "bower_components", "pods",
].map(pathIdentity));
const GENERATED_SEGMENTS = new Set([
  "dist", "build", "out", "coverage", ".next", ".nuxt", ".cache", "target",
].map(pathIdentity));
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
].map(pathIdentity));
const CONTROL_OR_DEPENDENCY_FILE_PATTERN = /^(?:requirements(?:[-_.].*)?\.txt|.+\.(?:csproj|fsproj|vbproj|sln))$/iu;
const WINDOWS_DEVICE_SEGMENT = /^(?:con|prn|aux|nul|conin\$|conout\$|com(?:[1-9\u00b9\u00b2\u00b3])|lpt(?:[1-9\u00b9\u00b2\u00b3]))(?:\..*)?$/iu;
const INSTALL_SCRIPT_SEGMENT = /^(?:(?:pre|post)?install|setup|bootstrap)(?:[._-].*)?$/iu;
const CREDENTIAL_SEGMENT = /^(?:\.env(?:\..*)?|keys?|secrets?|credentials?|tokens?|id_(?:rsa|ed25519)(?:\.pub)?|.*(?:secret|token|credential|private[-_.]?key|service[-_.]?account).*|.*\.(?:pem|key|p12|pfx))$/iu;

function isProxy(value: object): boolean {
  try {
    return nodeTypes.isProxy(value);
  } catch {
    return true;
  }
}

/** Inspect caller-owned data without evaluating accessors or proxy traps. */
function inspectRecord(value: unknown, expectedKeys: readonly string[]): InspectedRecord | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== expectedKeys.length
      || keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

/** Inspect a dense ordinary array without invoking iteration or index getters. */
function inspectArray(value: unknown, cap: number): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const ownLength = Object.getOwnPropertyDescriptor(value, "length");
    if (!ownLength || ownLength.enumerable || ownLength.get || ownLength.set || !("value" in ownLength)
      || !Number.isSafeInteger(ownLength.value) || ownLength.value < 0 || ownLength.value > cap) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const length = descriptors.length?.value;
    if (length !== ownLength.value) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== length + 1 || keys.some((key) => typeof key !== "string")) return null;
    const output: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return null;
      output.push(descriptor.value);
    }
    if (keys.some((key) => key !== "length" && !/^(?:0|[1-9][0-9]*)$/u.test(key as string))) return null;
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
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function safeText(value: unknown, cap: number, meaningful: boolean): value is string {
  return typeof value === "string"
    && value.length <= cap
    && (!meaningful || value.trim().length > 0)
    && !FORBIDDEN_TEXT.test(value)
    && wellFormedUtf16(value);
}

function safeSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256.test(value);
}

function sha256Utf8(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeMachineId(value: unknown): value is string {
  return typeof value === "string" && value.length <= 128 && MACHINE_ID.test(value);
}

function safeProjectRelativePath(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1
    || value.length > BUILDER_INTERCOM_LIMITS.projectRelativePathCharacters
    || value !== value.normalize("NFC") || value.startsWith("/") || value.endsWith("/")
    || !ASCII_PATH.test(value) || FORBIDDEN_PATH.test(value) || !wellFormedUtf16(value)) return false;
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === ".."
    || segment.endsWith(".") || segment.endsWith(" "))) return false;
  const folded = segments.map(pathIdentity);
  if (folded.some((segment) => HOST_CONTROL_SEGMENTS.has(segment)
    || PROTECTED_SEGMENTS.has(segment)
    || DEPENDENCY_SEGMENTS.has(segment) || GENERATED_SEGMENTS.has(segment)
    || CONTROL_OR_DEPENDENCY_FILES.has(segment) || WINDOWS_DEVICE_SEGMENT.test(segment)
    || CONTROL_OR_DEPENDENCY_FILE_PATTERN.test(segment)
    || INSTALL_SCRIPT_SEGMENT.test(segment) || CREDENTIAL_SEGMENT.test(segment))) return false;
  return true;
}

/** V1 paths are printable ASCII, so invariant uppercase is a complete
 * conservative case identity for this protocol. A future trusted selector may
 * admit Unicode only after proving native host alias freedom. */
function pathIdentity(value: string): string {
  return value.toUpperCase();
}

function parseProvenance(
  value: unknown,
  projectHash: string,
  connectionConsentVersion: string,
): BuilderSelectedTextProvenanceV1 | null {
  const record = inspectRecord(value, [
    "selectorVersion", "projectHash", "connectionConsentVersion",
    "gitTracked", "ordinaryText", "regularFile", "symbolicLink",
    "reparsePoint", "hardLinkCount", "submodule",
    "gitIgnored", "dependency", "packageOrDependencyControl", "installScript", "generated",
    "deploymentOrProductionControl", "credentialLikePath", "credentialLikeContent",
    "insideProject", "reservedArea", "consented",
  ]);
  if (!record || record.selectorVersion !== BUILDER_SELECTOR_PROVENANCE_VERSION
    || record.projectHash !== projectHash || record.connectionConsentVersion !== connectionConsentVersion
    || record.gitTracked !== true || record.ordinaryText !== true
    || record.regularFile !== true || record.symbolicLink !== false || record.reparsePoint !== false
    || record.hardLinkCount !== 1 || record.submodule !== false || record.gitIgnored !== false
    || record.dependency !== false || record.packageOrDependencyControl !== false || record.installScript !== false
    || record.generated !== false || record.deploymentOrProductionControl !== false
    || record.credentialLikePath !== false
    || record.credentialLikeContent !== false || record.insideProject !== true
    || record.reservedArea !== false || record.consented !== true) return null;
  return Object.freeze({
    selectorVersion: BUILDER_SELECTOR_PROVENANCE_VERSION,
    projectHash,
    connectionConsentVersion,
    gitTracked: true,
    ordinaryText: true,
    regularFile: true,
    symbolicLink: false,
    reparsePoint: false,
    hardLinkCount: 1,
    submodule: false,
    gitIgnored: false,
    dependency: false,
    packageOrDependencyControl: false,
    installScript: false,
    generated: false,
    deploymentOrProductionControl: false,
    credentialLikePath: false,
    credentialLikeContent: false,
    insideProject: true,
    reservedArea: false,
    consented: true,
  });
}

/** Length framing keeps canonical bytes unambiguous without serializing a
 * caller- or prototype-owned container. In particular, poisoned inherited
 * `toJSON` methods can neither collapse nor rewrite identity. */
function canonicalSequence(parts: readonly string[]): string {
  let output = `${parts.length};`;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]!;
    output += `${part.length}:${part}`;
  }
  return output;
}

function contextCanonical(value: BuilderTurnContextV1): string | null {
  const taskSpec = canonicalTaskSpec(value.taskSpec);
  const evidencePlan = canonicalEvidencePlan(value.evidencePlan);
  if (taskSpec === null || evidencePlan === null) return null;
  const criteria: string[] = [];
  for (let index = 0; index < value.criterionIds.length; index += 1) {
    criteria.push(value.criterionIds[index]!);
  }
  const selected: string[] = [];
  for (let index = 0; index < value.selectedTrackedText.length; index += 1) {
    const row = value.selectedTrackedText[index]!;
    selected.push(canonicalSequence([
      row.id, row.projectRelativePath, row.sha256, row.content, "false",
      canonicalSequence([
        row.provenance.selectorVersion, row.provenance.projectHash, row.provenance.connectionConsentVersion,
        "true", "true", "true", "false", "false", "1", "false", "false", "false", "false",
        "false", "false", "false", "false", "false", "true", "false", "true",
      ]),
    ]));
  }
  return canonicalSequence([
    value.version, String(value.taskNumber), value.runId, value.turnId, value.projectHash,
    value.connectionConsentVersion, taskSpec, value.taskSpecSha256, evidencePlan, value.evidencePlanSha256,
    canonicalSequence(criteria), value.baseHead, value.gitStateSha256, canonicalSequence(selected),
  ]);
}

/**
 * Compose one exact inert Builder turn from already branded quality objects
 * and Main-supplied tracked-text provenance. This brands identity, not effect
 * authority: the returned value cannot write, execute, send, or approve.
 */
export function composeBuilderTurnContext(raw: unknown): BuilderTurnContextV1 | null {
  try {
    const input = inspectRecord(raw, [
      "version", "taskNumber", "runId", "turnId", "projectHash", "connectionConsentVersion",
      "taskSpec", "evidencePlan", "baseHead", "gitStateSha256", "selectedTrackedText",
    ]);
    if (!input || input.version !== BUILDER_TURN_CONTEXT_VERSION
      || !Number.isSafeInteger(input.taskNumber) || Object.is(input.taskNumber, -0)
      || (input.taskNumber as number) < 1 || (input.taskNumber as number) > 999_999
      || typeof input.runId !== "string" || !UUID_V4.test(input.runId)
      || typeof input.turnId !== "string" || !UUID_V4.test(input.turnId) || input.turnId === input.runId
      || !safeSha256(input.projectHash) || !safeMachineId(input.connectionConsentVersion)
      || typeof input.baseHead !== "string" || !GIT_OBJECT_ID.test(input.baseHead)
      || !safeSha256(input.gitStateSha256)) return null;
    const specSha = taskSpecSha256(input.taskSpec);
    const planSha = evidencePlanSha256(input.evidencePlan);
    if (specSha === null || planSha === null) return null;
    const taskSpec = input.taskSpec as TaskSpecV1;
    const evidencePlan = input.evidencePlan as EvidencePlanV1;
    if (evidencePlan.taskSpecSha256 !== specSha) return null;
    const criterionIds = taskSpec.quality.acceptanceChecks.map((row) => row.id);
    if (criterionIds.length === 0 || evidencePlan.procedures.length !== criterionIds.length
      || evidencePlan.procedures.some((row, index) => row.criterionId !== criterionIds[index])) return null;

    const selectedInput = inspectArray(input.selectedTrackedText, BUILDER_INTERCOM_LIMITS.selectedTrackedText);
    if (selectedInput === null) return null;
    const selected: BuilderSelectedTrackedTextV1[] = [];
    const ids = new Set<string>();
    const paths = new Set<string>();
    let totalCharacters = 0;
    for (const item of selectedInput) {
      const row = inspectRecord(item, ["id", "projectRelativePath", "sha256", "content", "truncated", "provenance"]);
      if (!row || !safeMachineId(row.id) || !safeProjectRelativePath(row.projectRelativePath)
        || !safeSha256(row.sha256)
        || !safeText(row.content, BUILDER_INTERCOM_LIMITS.textCharactersPerRow, false)
        || row.truncated !== false || sha256Utf8(row.content) !== row.sha256) return null;
      const foldedPath = pathIdentity(row.projectRelativePath);
      if (ids.has(row.id) || paths.has(foldedPath)) return null;
      const provenance = parseProvenance(row.provenance, input.projectHash, input.connectionConsentVersion);
      if (provenance === null) return null;
      totalCharacters += row.content.length;
      if (totalCharacters > BUILDER_INTERCOM_LIMITS.totalTextCharacters) return null;
      ids.add(row.id);
      paths.add(foldedPath);
      selected.push(Object.freeze({
        id: row.id,
        projectRelativePath: row.projectRelativePath,
        sha256: row.sha256,
        content: row.content,
        truncated: false,
        provenance,
      }));
    }
    const context = Object.freeze({
      version: BUILDER_TURN_CONTEXT_VERSION,
      taskNumber: input.taskNumber as number,
      runId: input.runId,
      turnId: input.turnId,
      projectHash: input.projectHash,
      connectionConsentVersion: input.connectionConsentVersion,
      taskSpec,
      taskSpecSha256: specSha,
      evidencePlan,
      evidencePlanSha256: planSha,
      criterionIds: Object.freeze([...criterionIds]),
      baseHead: input.baseHead,
      gitStateSha256: input.gitStateSha256,
      selectedTrackedText: Object.freeze(selected),
    }) as BuilderTurnContextV1;
    contextBrands.add(context);
    return context;
  } catch {
    return null;
  }
}

export function canonicalBuilderTurnContext(value: unknown): string | null {
  return value !== null && typeof value === "object" && contextBrands.has(value)
    ? contextCanonical(value as BuilderTurnContextV1)
    : null;
}

export function builderTurnContextSha256(value: unknown): string | null {
  const canonical = canonicalBuilderTurnContext(value);
  return canonical === null ? null : sha256Utf8(canonical);
}

function responseCanonical(value: BuilderTurnResponseV1): string {
  if (value.kind === "replacement-proposal") {
    const rows: string[] = [];
    for (let index = 0; index < value.replacements.length; index += 1) {
      const row = value.replacements[index]!;
      rows.push(canonicalSequence([
        row.projectRelativePath, row.beforeSha256, row.afterText, row.afterSha256,
      ]));
    }
    return canonicalSequence([
      value.version, value.contextSha256, value.kind, value.summary, canonicalSequence(rows),
    ]);
  }
  return canonicalSequence([
    value.version, value.contextSha256, value.kind,
    value.request.category, value.request.suggestedTarget, value.request.what, value.request.why,
    value.request.expectedEffect, value.request.dataExposure, value.request.costBasis, value.request.recovery,
  ]);
}

/** Strictly parse one response as inert data bound to one exact live context. */
export function parseBuilderTurnResponse(contextValue: unknown, raw: unknown): BuilderTurnResponseV1 | null {
  try {
    const contextSha = builderTurnContextSha256(contextValue);
    if (contextSha === null) return null;
    const context = contextValue as BuilderTurnContextV1;
    const replacementRecord = inspectRecord(raw, [
      "version", "contextSha256", "kind", "summary", "replacements",
    ]);
    const capabilityRecord = replacementRecord === null
      ? inspectRecord(raw, ["version", "contextSha256", "kind", "request"])
      : null;
    const common = replacementRecord ?? capabilityRecord;
    if (!common || common.version !== BUILDER_TURN_RESPONSE_VERSION || common.contextSha256 !== contextSha) return null;

    let response: BuilderTurnResponseV1;
    if (common.kind === "replacement-proposal") {
      if (!safeText(common.summary, BUILDER_INTERCOM_LIMITS.plainLanguageCharacters, true)) return null;
      const rows = inspectArray(common.replacements, BUILDER_INTERCOM_LIMITS.replacements);
      if (rows === null || rows.length === 0) return null;
      const selectedByPath = new Map(context.selectedTrackedText.map((row) => [
        pathIdentity(row.projectRelativePath), row,
      ]));
      const seen = new Set<string>();
      const replacements: BuilderReplacementProposalRowV1[] = [];
      let totalCharacters = 0;
      let previousFoldedPath: string | null = null;
      for (const item of rows) {
        const row = inspectRecord(item, ["projectRelativePath", "beforeSha256", "afterText", "afterSha256"]);
        if (!row || !safeProjectRelativePath(row.projectRelativePath) || !safeSha256(row.beforeSha256)
          || !safeText(row.afterText, BUILDER_INTERCOM_LIMITS.textCharactersPerRow, false)
          || !safeSha256(row.afterSha256)) return null;
        const foldedPath = pathIdentity(row.projectRelativePath);
        const selected = selectedByPath.get(foldedPath);
        if (!selected || seen.has(foldedPath)
          || (previousFoldedPath !== null && foldedPath <= previousFoldedPath)
          || row.projectRelativePath !== selected.projectRelativePath
          || row.beforeSha256 !== selected.sha256 || row.afterText === selected.content
          || sha256Utf8(row.afterText) !== row.afterSha256) return null;
        totalCharacters += row.afterText.length;
        if (totalCharacters > BUILDER_INTERCOM_LIMITS.totalTextCharacters) return null;
        seen.add(foldedPath);
        previousFoldedPath = foldedPath;
        replacements.push(Object.freeze({
          projectRelativePath: row.projectRelativePath,
          beforeSha256: row.beforeSha256,
          afterText: row.afterText,
          afterSha256: row.afterSha256,
        }));
      }
      response = Object.freeze({
        version: BUILDER_TURN_RESPONSE_VERSION,
        contextSha256: contextSha,
        kind: "replacement-proposal",
        summary: common.summary,
        replacements: Object.freeze(replacements),
      });
    } else if (common.kind === "capability-request") {
      const request = inspectRecord(common.request, [
        "category", "suggestedTarget", "what", "why", "expectedEffect", "dataExposure", "costBasis", "recovery",
      ]);
      if (!request || !BUILDER_CAPABILITY_REQUEST_CATEGORIES.includes(request.category as BuilderCapabilityRequestCategoryV1)
        || !safeText(request.suggestedTarget, BUILDER_INTERCOM_LIMITS.plainLanguageCharacters, true)
        || !safeText(request.what, BUILDER_INTERCOM_LIMITS.plainLanguageCharacters, true)
        || !safeText(request.why, BUILDER_INTERCOM_LIMITS.plainLanguageCharacters, true)
        || !safeText(request.expectedEffect, BUILDER_INTERCOM_LIMITS.plainLanguageCharacters, true)
        || !safeText(request.dataExposure, BUILDER_INTERCOM_LIMITS.plainLanguageCharacters, true)
        || !safeText(request.costBasis, BUILDER_INTERCOM_LIMITS.plainLanguageCharacters, true)
        || !safeText(request.recovery, BUILDER_INTERCOM_LIMITS.plainLanguageCharacters, true)) return null;
      response = Object.freeze({
        version: BUILDER_TURN_RESPONSE_VERSION,
        contextSha256: contextSha,
        kind: "capability-request",
        request: Object.freeze({
          category: request.category as BuilderCapabilityRequestCategoryV1,
          suggestedTarget: request.suggestedTarget,
          what: request.what,
          why: request.why,
          expectedEffect: request.expectedEffect,
          dataExposure: request.dataExposure,
          costBasis: request.costBasis,
          recovery: request.recovery,
        }),
      });
    } else {
      return null;
    }
    responseBindings.set(response, context);
    return response;
  } catch {
    return null;
  }
}

export function canonicalBuilderTurnResponse(value: unknown): string | null {
  return value !== null && typeof value === "object" && responseBindings.has(value)
    ? responseCanonical(value as BuilderTurnResponseV1)
    : null;
}

export function builderTurnResponseSha256(value: unknown): string | null {
  const canonical = canonicalBuilderTurnResponse(value);
  return canonical === null ? null : sha256Utf8(canonical);
}
