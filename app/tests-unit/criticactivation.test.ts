import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as activation from "../src/main/criticactivation.js";
import {
  activeCriticActivationCount,
  criticActivationStatus,
  type CriticActivationIdentityV1,
} from "../src/main/criticactivation.js";

const HEX_A = "a".repeat(64);
const HEX_B = "b".repeat(64);
const HEX_C = "c".repeat(64);

const VALID: CriticActivationIdentityV1 = {
  version: "cairn-critic-route-request-identity/v1",
  taskTarget: "local-task",
  baseUrl: "https://provider.example.invalid/v1",
  providerIdentity: "example-provider",
  modelSelection: "pinned",
  modelResolution: "exact",
  configuredModel: "author/exact-model",
  resolvedModelRevision: "author/exact-model@2026-08-07",
  connectionConsentVersion: "cairn-conductor-consent/v1",
  transportRevision: "openai-compatible/v1",
  requestSerializerSha256: HEX_A,
  generation: { temperature: 0, topP: 1, maxOutputTokens: 8_192 },
  systemPromptVersion: "cairn-critic-system/v1",
  systemPromptSha256: HEX_B,
  schemas: {
    taskSpec: "cairn-task-spec/v1",
    packet: "cairn-critic-packet/v1",
    output: "cairn-critic-output/v1",
  },
  policySha256: HEX_C,
  modality: "text",
  toolPolicy: "none",
};

function identity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...VALID,
    generation: { ...VALID.generation },
    schemas: { ...VALID.schemas },
    ...overrides,
  };
}

function expectedFingerprint(value: CriticActivationIdentityV1): string {
  const text = (item: string): string => `\"${item.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}\"`;
  const canonical = `{`
    + `\"fingerprintVersion\":${text("cairn-critic-route-request-fingerprint/v1")},`
    + `\"identityVersion\":${text(value.version)},`
    + `\"taskTarget\":${text(value.taskTarget)},`
    + `\"baseUrl\":${text(value.baseUrl)},`
    + `\"providerIdentity\":${text(value.providerIdentity)},`
    + `\"modelSelection\":${text(value.modelSelection)},`
    + `\"modelResolution\":${text(value.modelResolution)},`
    + `\"configuredModel\":${text(value.configuredModel)},`
    + `\"resolvedModelRevision\":${text(value.resolvedModelRevision)},`
    + `\"connectionConsentVersion\":${text(value.connectionConsentVersion)},`
    + `\"transportRevision\":${text(value.transportRevision)},`
    + `\"requestSerializerSha256\":${text(value.requestSerializerSha256)},`
    + `\"generation\":{\"temperature\":0,\"topP\":1,\"maxOutputTokens\":8192},`
    + `\"systemPromptVersion\":${text(value.systemPromptVersion)},`
    + `\"systemPromptSha256\":${text(value.systemPromptSha256)},`
    + `\"schemas\":{\"taskSpec\":${text(value.schemas.taskSpec)},`
    + `\"packet\":${text(value.schemas.packet)},\"output\":${text(value.schemas.output)}},`
    + `\"policySha256\":${text(value.policySha256)},`
    + `\"modality\":${text(value.modality)},`
    + `\"toolPolicy\":${text(value.toolPolicy)}}`;
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function expectInvalid(value: unknown, label: string): void {
  assert.deepEqual(criticActivationStatus(value), {
    kind: "invalid",
    code: "CRITIC_ACTIVATION_IDENTITY_INVALID",
  }, label);
}

test("the exact pinned text-only identity is valid but Q1 activates nothing", () => {
  assert.equal(activeCriticActivationCount(), 0);
  const result = criticActivationStatus(identity());
  assert.deepEqual(result, {
    kind: "inactive",
    code: "CRITIC_ACTIVATION_NOT_CALIBRATED",
    routeRequestFingerprintSha256: expectedFingerprint(VALID),
  });
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(Object.keys(activation).sort(), [
    "activeCriticActivationCount",
    "criticActivationStatus",
  ]);
});

test("Auto, unresolved, non-local, non-text, and tool-bearing routes fail before lookup", () => {
  const invalid: readonly [string, unknown][] = [
    ["Auto selection", identity({ modelSelection: "auto" })],
    ["unresolved selection", identity({ modelResolution: "unresolved" })],
    ["missing resolved revision", identity({ resolvedModelRevision: "" })],
    ["unresolved revision", identity({ resolvedModelRevision: "unresolved" })],
    ["Auto model", identity({ configuredModel: "Auto" })],
    ["router Auto alias", identity({ configuredModel: "openrouter/auto" })],
    ["disabled experiment", identity({ taskTarget: "disabled-experiment" })],
    ["production activation", identity({ taskTarget: "production-activation" })],
    ["image modality", identity({ modality: "image" })],
    ["request tools", identity({ toolPolicy: "tools-allowed" })],
    ["implicit provider tools", identity({ toolPolicy: "implicit" })],
  ];
  for (const [label, value] of invalid) expectInvalid(value, label);
});

test("generation, schemas, hashes, URLs, and bounded machine identities are exact", () => {
  const invalid: readonly [string, unknown][] = [
    ["wrong version", identity({ version: "cairn-critic-route-request-identity/v2" })],
    ["negative zero", identity({ generation: { temperature: -0, topP: 1, maxOutputTokens: 8_192 } })],
    ["temperature", identity({ generation: { temperature: 0.1, topP: 1, maxOutputTokens: 8_192 } })],
    ["top-p", identity({ generation: { temperature: 0, topP: 0.9, maxOutputTokens: 8_192 } })],
    ["output tokens", identity({ generation: { temperature: 0, topP: 1, maxOutputTokens: 8_191 } })],
    ["generation extra", identity({ generation: { ...VALID.generation, seed: 7 } })],
    ["TaskSpec schema", identity({ schemas: { ...VALID.schemas, taskSpec: "cairn-task-spec/v2" } })],
    ["packet schema", identity({ schemas: { ...VALID.schemas, packet: "cairn-critic-packet/v2" } })],
    ["output schema", identity({ schemas: { ...VALID.schemas, output: "cairn-critic-output/v2" } })],
    ["schema extra", identity({ schemas: { ...VALID.schemas, hidden: "v1" } })],
    ["system prompt version", identity({ systemPromptVersion: "cairn-critic-system/v2" })],
    ["short serializer digest", identity({ requestSerializerSha256: "a".repeat(63) })],
    ["uppercase prompt digest", identity({ systemPromptSha256: "B".repeat(64) })],
    ["non-hex policy digest", identity({ policySha256: "z".repeat(64) })],
    ["URL credentials", identity({ baseUrl: "https://user:secret@provider.example.invalid/v1" })],
    ["URL query", identity({ baseUrl: "https://provider.example.invalid/v1?key=value" })],
    ["URL fragment", identity({ baseUrl: "https://provider.example.invalid/v1#fragment" })],
    ["URL protocol", identity({ baseUrl: "ftp://provider.example.invalid/v1" })],
    ["URL whitespace", identity({ baseUrl: " https://provider.example.invalid/v1" })],
    ["URL backslash", identity({ baseUrl: "https:\\provider.example.invalid\\v1" })],
    ["provider punctuation", identity({ providerIdentity: "provider identity" })],
    ["provider oversize", identity({ providerIdentity: "p".repeat(161) })],
    ["consent control", identity({ connectionConsentVersion: "consent\u0000v1" })],
    ["transport bidi", identity({ transportRevision: "transport\u202erevision" })],
    ["model URL", identity({ configuredModel: "https://model.invalid" })],
    ["model drive path", identity({ configuredModel: "C:/model" })],
    ["model oversize", identity({ configuredModel: "m".repeat(257) })],
    ["revision surrogate", identity({ resolvedModelRevision: "revision\ud800" })],
  ];
  for (const [label, value] of invalid) expectInvalid(value, label);
});

test("hostile records, accessors, Proxies, symbols, hidden keys, and unexpected fields fail closed", () => {
  const missing = identity();
  delete missing.toolPolicy;
  const extra = identity({ routeRequestFingerprintSha256: HEX_A });
  const symbol = identity();
  Object.defineProperty(symbol, Symbol("hidden"), { value: true, enumerable: true });
  const hidden = identity();
  Object.defineProperty(hidden, "secret", { value: true, enumerable: false });
  const accessor = identity();
  Object.defineProperty(accessor, "providerIdentity", {
    enumerable: true,
    get(): never { throw new Error("must not run"); },
  });
  const inherited = identity();
  Object.setPrototypeOf(inherited, { authority: true });
  const proxied = new Proxy(identity(), {
    get(): never { throw new Error("must not run"); },
  });
  const generationProxy = identity({
    generation: new Proxy({ ...VALID.generation }, {
      get(): never { throw new Error("must not run"); },
    }),
  });
  const schemaAccessor = { ...VALID.schemas };
  Object.defineProperty(schemaAccessor, "packet", {
    enumerable: true,
    get(): never { throw new Error("must not run"); },
  });

  const invalid: readonly [string, unknown][] = [
    ["null", null],
    ["array", []],
    ["missing key", missing],
    ["caller-supplied fingerprint", extra],
    ["symbol key", symbol],
    ["hidden key", hidden],
    ["accessor", accessor],
    ["inherited authority", inherited],
    ["Proxy", proxied],
    ["nested Proxy", generationProxy],
    ["nested accessor", identity({ schemas: schemaAccessor })],
  ];
  for (const [label, value] of invalid) {
    assert.doesNotThrow(() => expectInvalid(value, label), label);
  }
});

test("canonical fingerprints ignore ordinary insertion order and bind every variable authority field", () => {
  const reversedGeneration = Object.assign(Object.create(null) as Record<string, unknown>, {
    maxOutputTokens: 8_192,
    topP: 1,
    temperature: 0,
  });
  const reversedSchemas = Object.assign(Object.create(null) as Record<string, unknown>, {
    output: "cairn-critic-output/v1",
    packet: "cairn-critic-packet/v1",
    taskSpec: "cairn-task-spec/v1",
  });
  const reordered = Object.create(null) as Record<string, unknown>;
  for (const [key, value] of Object.entries(identity({
    generation: reversedGeneration,
    schemas: reversedSchemas,
  })).reverse()) reordered[key] = value;

  const baseline = criticActivationStatus(identity());
  const reversed = criticActivationStatus(reordered);
  assert.equal(baseline.kind, "inactive");
  assert.equal(reversed.kind, "inactive");
  if (baseline.kind !== "inactive" || reversed.kind !== "inactive") return;
  assert.equal(reversed.routeRequestFingerprintSha256, baseline.routeRequestFingerprintSha256);

  const variants: readonly [string, Record<string, unknown>][] = [
    ["base URL", { baseUrl: "https://provider.example.invalid/v2" }],
    ["provider identity", { providerIdentity: "other-provider" }],
    ["configured model", { configuredModel: "author/other-model" }],
    ["resolved revision", { resolvedModelRevision: "author/exact-model@2026-08-08" }],
    ["consent", { connectionConsentVersion: "cairn-conductor-consent/v2" }],
    ["transport", { transportRevision: "openai-compatible/v2" }],
    ["serializer", { requestSerializerSha256: "d".repeat(64) }],
    ["system prompt", { systemPromptSha256: "e".repeat(64) }],
    ["policy", { policySha256: "f".repeat(64) }],
  ];
  const seen = new Set([baseline.routeRequestFingerprintSha256]);
  for (const [label, changes] of variants) {
    const result = criticActivationStatus(identity(changes));
    assert.equal(result.kind, "inactive", label);
    if (result.kind !== "inactive") continue;
    assert.equal(seen.has(result.routeRequestFingerprintSha256), false, label);
    seen.add(result.routeRequestFingerprintSha256);
  }
  assert.equal(seen.size, variants.length + 1);
});

test("the fingerprint binds every fixed guard and ignores inherited toJSON poisoning", () => {
  const baseline = criticActivationStatus(identity());
  assert.equal(baseline.kind, "inactive");
  if (baseline.kind !== "inactive") return;

  const canonicalWithFixedGuards = expectedFingerprint(VALID);
  assert.equal(baseline.routeRequestFingerprintSha256, canonicalWithFixedGuards);
  for (const [label, changes] of [
    ["identity version", { version: "cairn-critic-route-request-identity/v2" }],
    ["task target", { taskTarget: "disabled-experiment" }],
    ["model selection", { modelSelection: "auto" }],
    ["model resolution", { modelResolution: "unresolved" }],
    ["system prompt version", { systemPromptVersion: "cairn-critic-system/v2" }],
  ] as const) expectInvalid(identity(changes), label);

  const previous = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
  Object.defineProperty(Object.prototype, "toJSON", {
    configurable: true,
    enumerable: false,
    value: () => ({ poisoned: true }),
  });
  try {
    assert.deepEqual(criticActivationStatus(identity()), baseline);
  } finally {
    if (previous === undefined) delete (Object.prototype as { toJSON?: unknown }).toJSON;
    else Object.defineProperty(Object.prototype, "toJSON", previous);
  }
});

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if (entry.isFile() && /\.(?:ts|tsx)$/u.test(entry.name)) files.push(path);
  }
  return files;
}

test("the activation module has no live caller, provider client, IPC, environment switch, or mutator", () => {
  const sourceRoot = resolve(process.cwd(), "src");
  const modulePath = resolve(sourceRoot, "main", "criticactivation.ts");
  const moduleSource = readFileSync(modulePath, "utf8");
  const imports = [...moduleSource.matchAll(/from\s+["']([^"']+)["']/gu)]
    .map((match) => match[1]).sort();
  assert.deepEqual(imports, ["node:crypto", "node:util"]);
  assert.doesNotMatch(moduleSource, /\bimport\s*\(/u);
  assert.doesNotMatch(moduleSource, /JSON\.stringify/u);
  assert.doesNotMatch(moduleSource, /\b(?:fetch|ipcMain|BrowserWindow)\b|process\.env/u);
  assert.doesNotMatch(moduleSource, /export\s+(?:function|const)\s+(?:register|activate|set|add|create)/iu);

  const callers = sourceFiles(sourceRoot)
    .filter((path) => resolve(path) !== modulePath)
    .filter((path) => /["'][^"']*criticactivation(?:\.js|\.ts)?["']/u.test(readFileSync(path, "utf8")))
    .map((path) => path.slice(sourceRoot.length + 1).replaceAll("\\", "/"));
  assert.deepEqual(callers, []);
});
