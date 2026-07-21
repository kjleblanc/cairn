import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { ANTHROPIC_MESSAGES_URL } from "./bounded-messages-fetch.js";
import { brokerChildEntry, parseBrokerResponse, resolveCoreRuntimeFile } from "./bounded-broker-protocol.js";

export const PROOF_PROVIDER = "anthropic" as const;
export const PROOF_MODEL = "claude-haiku-4-5" as const;
export const PROOF_MAX_COST_USD = 0.25 as const;
export const PROOF_TOTAL_COST_CAP_USD = 0.50 as const;
export const PROOF_MAX_CALLS_PER_TASK = 1 as const;
export const PROOF_MAX_OUTPUT_TOKENS = 64 as const;
export const PROOF_MAX_INPUT_TOKENS = 200_000 as const;
export const PROOF_MAX_INPUT_USD_PER_MILLION = 1 as const;
export const PROOF_MAX_OUTPUT_USD_PER_MILLION = 10 as const;
export const PROOF_SYSTEM = "Return only strict JSON matching {\"replacement\":\"string\"}. Do not use tools, request more information, or include extra fields.";
export const FAKE_PROVIDER_CANARY = "CAIRN_027_FAKE_SECRET_CANARY_DO_NOT_PERSIST";
export const TASK_027_BRIEF_COMMIT = "92cb8328a2f481f00e82ac62664e4d887eab2ac3";
export const TASK_027_BRIEF_SHA256 = "9aad018c54b78590732d5199569b159b525a88dce4a0acc5511a7b8fdb1803e9";
export const OFFICIAL_SDK_VERSION = "0.93.0" as const;
export const LIVE_CREDENTIAL_APPROVAL = "For High-Stakes task 027's disposable proof only, I approve use of my fresh owner-managed official local Anthropic authentication by the two isolated Messages brokers. Do not inspect, copy, log, refresh, rotate, recover, or change it.";
export const LIVE_TASK_001_APPROVAL = "For High-Stakes task 027 disposable Task 001 only, I approve exactly one POST to https://api.anthropic.com/v1/messages using claude-haiku-4-5 and input SHA-256 3f50f7d24b6e52247aa05eae652d6a0bed39ce8bd7ce6da42642b74ee117bfe8, with no retry, redirect, fallback, tool, or other destination.";
export const LIVE_TASK_002_APPROVAL = "For High-Stakes task 027 disposable Task 002 only, I approve exactly one POST to https://api.anthropic.com/v1/messages using claude-haiku-4-5 and input SHA-256 2196cff705d1b7e4dff0507afc0ba808871e377aadf14da1e9a7631f2fb6bdd8, with no retry, redirect, fallback, tool, or other destination.";

export type ProofTaskNumber = 1 | 2;

const USERS: Readonly<Record<ProofTaskNumber, string>> = {
  1: "Write one welcoming sentence of 8 to 18 words for a synthetic beginner reading-list demo. It must include the word \"welcome\".",
  2: "Write one instruction sentence of 8 to 18 words for a synthetic beginner reading-list demo. It must include the words \"add\" and \"book\".",
};

export const PROOF_INPUT_HASHES: Readonly<Record<ProofTaskNumber, string>> = {
  1: "3f50f7d24b6e52247aa05eae652d6a0bed39ce8bd7ce6da42642b74ee117bfe8",
  2: "2196cff705d1b7e4dff0507afc0ba808871e377aadf14da1e9a7631f2fb6bdd8",
};

export interface BoundedProviderRequest {
  taskNumber: ProofTaskNumber;
  provider: typeof PROOF_PROVIDER;
  model: typeof PROOF_MODEL;
  system: typeof PROOF_SYSTEM;
  user: string;
  inputSha256: string;
  maxCalls: typeof PROOF_MAX_CALLS_PER_TASK;
  maxCostUsd: typeof PROOF_MAX_COST_USD;
}

export interface BoundedProviderResult {
  replacement: string;
  model: typeof PROOF_MODEL;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  requestCount: 1;
  destination: typeof ANTHROPIC_MESSAGES_URL | null;
}

export interface BoundedProvider {
  call(request: BoundedProviderRequest): Promise<BoundedProviderResult>;
  snapshot(): ProviderLedgerSnapshot;
}

export interface ProviderLedgerSnapshot {
  totalCalls: number;
  totalCostUsd: number;
  callsByTask: Readonly<Record<string, number>>;
  outcomesByTask: Readonly<Record<string, "started" | "succeeded" | "failed" | "unknown">>;
  requestCountsByTask?: Readonly<Record<string, number>>;
  destinations?: readonly string[];
  brokerPids?: readonly number[];
}

export interface Task027LiveAuthorization {
  schemaVersion: 2;
  taskNumber: 27;
  briefCommit: typeof TASK_027_BRIEF_COMMIT;
  briefSha256: typeof TASK_027_BRIEF_SHA256;
  implementationDigest: string;
  sdkVersion: typeof OFFICIAL_SDK_VERSION;
  endpoint: typeof ANTHROPIC_MESSAGES_URL;
  method: "POST";
  model: typeof PROOF_MODEL;
  maxRetries: 0;
  maxTokens: typeof PROOF_MAX_OUTPUT_TOKENS;
  serviceTier: "standard_only";
  task001InputSha256: string;
  task002InputSha256: string;
  maxCallsPerTask: 1;
  maxCostUsdPerTask: 0.25;
  totalCostCapUsd: 0.5;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  maxInputTokens: 200000;
  approvedAt: string;
  expiresAt: string;
  credentialApproval: typeof LIVE_CREDENTIAL_APPROVAL;
  task001Approval: typeof LIVE_TASK_001_APPROVAL;
  task002Approval: typeof LIVE_TASK_002_APPROVAL;
  costApproval: string;
}

export class BoundedProviderError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "BoundedProviderError";
  }
}

export function proofProviderRequest(taskNumber: ProofTaskNumber): BoundedProviderRequest {
  return {
    taskNumber,
    provider: PROOF_PROVIDER,
    model: PROOF_MODEL,
    system: PROOF_SYSTEM,
    user: USERS[taskNumber],
    inputSha256: PROOF_INPUT_HASHES[taskNumber],
    maxCalls: PROOF_MAX_CALLS_PER_TASK,
    maxCostUsd: PROOF_MAX_COST_USD,
  };
}

function plain(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

/** Reject duplicate keys before JSON.parse can silently shadow them. */
export function assertNoDuplicateJsonKeys(text: string, code = "DUPLICATE_JSON_KEY"): void {
  const stack: Array<{ kind: "object" | "array"; keys?: Set<string>; expectingKey?: boolean }> = [];
  let i = 0;
  const skipSpace = () => { while (/\s/.test(text[i] ?? "")) i += 1; };
  const readString = (): string => {
    const start = i++;
    for (;;) {
      if (i >= text.length) throw new BoundedProviderError(code);
      if (text[i] === "\\") { i += 2; continue; }
      if (text[i] === '"') { i += 1; break; }
      i += 1;
    }
    try { return JSON.parse(text.slice(start, i)) as string; }
    catch { throw new BoundedProviderError(code); }
  };
  while (i < text.length) {
    skipSpace();
    const ch = text[i];
    if (!ch) break;
    if (ch === "{") { stack.push({ kind: "object", keys: new Set(), expectingKey: true }); i += 1; continue; }
    if (ch === "[") { stack.push({ kind: "array" }); i += 1; continue; }
    if (ch === "}" || ch === "]") { stack.pop(); i += 1; continue; }
    if (ch === ",") { i += 1; const top = stack[stack.length - 1]; if (top?.kind === "object") top.expectingKey = true; continue; }
    if (ch === ":") { i += 1; continue; }
    if (ch === '"') {
      const value = readString();
      skipSpace();
      const top = stack[stack.length - 1];
      if (top?.kind === "object" && top.expectingKey && text[i] === ":") {
        if (top.keys!.has(value)) throw new BoundedProviderError(code);
        top.keys!.add(value);
        top.expectingKey = false;
      }
      continue;
    }
    while (i < text.length && !/[\s,}\]]/.test(text[i])) i += 1;
  }
}

export function liveCostApproval(inputRate: number, outputRate: number, maxContext: number): string {
  return `For High-Stakes task 027's disposable proof, I attest that the official current standard price is US$${inputRate.toFixed(6)} per million input tokens and US$${outputRate.toFixed(6)} per million output tokens, the model maximum input context is ${maxContext} tokens, and I approve a fixed total cap of US$0.50 with at most US$0.25 per task and no transferable allocation or retry.`;
}

const AUTH_KEYS = ["approvedAt", "briefCommit", "briefSha256", "costApproval", "credentialApproval", "endpoint",
  "expiresAt", "implementationDigest", "inputUsdPerMillion", "maxCallsPerTask", "maxCostUsdPerTask", "maxInputTokens",
  "maxRetries", "maxTokens", "method", "model", "outputUsdPerMillion", "schemaVersion", "sdkVersion", "serviceTier",
  "task001Approval", "task001InputSha256", "task002Approval", "task002InputSha256", "taskNumber", "totalCostCapUsd"] as const;

export function validateTask027LiveAuthorization(value: unknown, requireFresh = true): Task027LiveAuthorization {
  if (!plain(value) || !exactKeys(value, AUTH_KEYS)) throw new BoundedProviderError("LIVE_APPROVAL_REQUIRED");
  const a = value as unknown as Task027LiveAuthorization;
  const timestamps = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  if (a.schemaVersion !== 2 || a.taskNumber !== 27 || a.briefCommit !== TASK_027_BRIEF_COMMIT ||
      a.briefSha256 !== TASK_027_BRIEF_SHA256 || !/^[0-9a-f]{64}$/.test(a.implementationDigest) ||
      a.sdkVersion !== OFFICIAL_SDK_VERSION || a.endpoint !== ANTHROPIC_MESSAGES_URL || a.method !== "POST" ||
      a.model !== PROOF_MODEL || a.maxRetries !== 0 || a.maxTokens !== 64 || a.serviceTier !== "standard_only" ||
      a.task001InputSha256 !== PROOF_INPUT_HASHES[1] || a.task002InputSha256 !== PROOF_INPUT_HASHES[2] ||
      a.maxCallsPerTask !== 1 || a.maxCostUsdPerTask !== 0.25 || a.totalCostCapUsd !== 0.5 ||
      typeof a.inputUsdPerMillion !== "number" || a.inputUsdPerMillion <= 0 || a.inputUsdPerMillion > 1 ||
      typeof a.outputUsdPerMillion !== "number" || a.outputUsdPerMillion <= 0 || a.outputUsdPerMillion > 10 ||
      a.maxInputTokens !== 200_000 || !timestamps.test(a.approvedAt) || !timestamps.test(a.expiresAt) ||
      a.credentialApproval !== LIVE_CREDENTIAL_APPROVAL || a.task001Approval !== LIVE_TASK_001_APPROVAL ||
      a.task002Approval !== LIVE_TASK_002_APPROVAL || a.costApproval !== liveCostApproval(a.inputUsdPerMillion, a.outputUsdPerMillion, a.maxInputTokens)) {
    throw new BoundedProviderError("LIVE_APPROVAL_REQUIRED");
  }
  const approved = Date.parse(a.approvedAt);
  const expires = Date.parse(a.expiresAt);
  if (!Number.isFinite(approved) || !Number.isFinite(expires) || expires <= approved || expires - approved > 10 * 60_000) {
    throw new BoundedProviderError("LIVE_APPROVAL_REQUIRED");
  }
  if (requireFresh && (Date.now() < approved || Date.now() > expires)) throw new BoundedProviderError("LIVE_APPROVAL_STALE");
  return canonicalAuthorizationObject(a);
}

function canonicalAuthorizationObject(a: Task027LiveAuthorization): Task027LiveAuthorization {
  return {
    schemaVersion: 2, taskNumber: 27, briefCommit: TASK_027_BRIEF_COMMIT, briefSha256: TASK_027_BRIEF_SHA256,
    implementationDigest: a.implementationDigest, sdkVersion: OFFICIAL_SDK_VERSION, endpoint: ANTHROPIC_MESSAGES_URL,
    method: "POST", model: PROOF_MODEL, maxRetries: 0, maxTokens: 64, serviceTier: "standard_only",
    task001InputSha256: PROOF_INPUT_HASHES[1], task002InputSha256: PROOF_INPUT_HASHES[2], maxCallsPerTask: 1,
    maxCostUsdPerTask: 0.25, totalCostCapUsd: 0.5, inputUsdPerMillion: a.inputUsdPerMillion,
    outputUsdPerMillion: a.outputUsdPerMillion, maxInputTokens: 200_000, approvedAt: a.approvedAt, expiresAt: a.expiresAt,
    credentialApproval: LIVE_CREDENTIAL_APPROVAL, task001Approval: LIVE_TASK_001_APPROVAL,
    task002Approval: LIVE_TASK_002_APPROVAL, costApproval: liveCostApproval(a.inputUsdPerMillion, a.outputUsdPerMillion, 200_000),
  };
}

export function canonicalTask027LiveAuthorization(value: Task027LiveAuthorization): string {
  return JSON.stringify(canonicalAuthorizationObject(value), null, 2) + "\n";
}

export function parseTask027LiveAuthorization(text: string, requireFresh = true): Task027LiveAuthorization {
  if (text.length > 32_768) throw new BoundedProviderError("LIVE_APPROVAL_REQUIRED");
  assertNoDuplicateJsonKeys(text, "LIVE_APPROVAL_REQUIRED");
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new BoundedProviderError("LIVE_APPROVAL_REQUIRED"); }
  const value = validateTask027LiveAuthorization(raw, requireFresh);
  if (canonicalTask027LiveAuthorization(value) !== text) throw new BoundedProviderError("LIVE_APPROVAL_NONCANONICAL");
  return value;
}

export function canonicalProviderInput(request: BoundedProviderRequest): string {
  return JSON.stringify({ system: request.system, user: request.user });
}

export function validateBoundedProviderRequest(value: unknown): BoundedProviderRequest {
  if (!plain(value) || !exactKeys(value, ["inputSha256", "maxCalls", "maxCostUsd", "model", "provider", "system", "taskNumber", "user"])) {
    throw new BoundedProviderError("PROVIDER_REQUEST_INVALID");
  }
  const request = value as unknown as BoundedProviderRequest;
  if ((request.taskNumber !== 1 && request.taskNumber !== 2) || request.provider !== PROOF_PROVIDER ||
      request.model !== PROOF_MODEL || request.system !== PROOF_SYSTEM || request.user !== USERS[request.taskNumber] ||
      request.inputSha256 !== PROOF_INPUT_HASHES[request.taskNumber] || request.maxCalls !== 1 || request.maxCostUsd !== 0.25) {
    throw new BoundedProviderError("PROVIDER_REQUEST_INVALID");
  }
  const actual = createHash("sha256").update(canonicalProviderInput(request), "utf8").digest("hex");
  if (actual !== request.inputSha256) throw new BoundedProviderError("PROVIDER_INPUT_CHANGED");
  return { ...request };
}

function sentenceWords(value: string): string[] { return value.trim().split(/\s+/).filter(Boolean); }

function validateReplacement(taskNumber: ProofTaskNumber, value: string): string {
  if (value.includes(FAKE_PROVIDER_CANARY) || /[\r\n\0]/.test(value)) throw new BoundedProviderError("PROVIDER_OUTPUT_INVALID");
  const words = sentenceWords(value);
  if (words.length < 8 || words.length > 18) throw new BoundedProviderError("PROVIDER_OUTPUT_INVALID");
  const lower = value.toLocaleLowerCase("en-US");
  if (taskNumber === 1 && !/\bwelcome\b/.test(lower)) throw new BoundedProviderError("PROVIDER_OUTPUT_INVALID");
  if (taskNumber === 2 && (!/\badd\b/.test(lower) || !/\bbook\b/.test(lower))) throw new BoundedProviderError("PROVIDER_OUTPUT_INVALID");
  return value;
}

export function validateBoundedProviderResult(
  taskNumber: ProofTaskNumber,
  raw: string | unknown,
  costUsd = 0,
  usage: { inputTokens?: number; outputTokens?: number; destination?: typeof ANTHROPIC_MESSAGES_URL | null } = {},
): BoundedProviderResult {
  let value: unknown = raw;
  if (typeof raw === "string") {
    assertNoDuplicateJsonKeys(raw, "PROVIDER_OUTPUT_INVALID");
    try { value = JSON.parse(raw); } catch { throw new BoundedProviderError("PROVIDER_OUTPUT_INVALID"); }
  }
  if (!plain(value)) throw new BoundedProviderError("PROVIDER_OUTPUT_INVALID");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).length !== 1 || !descriptors.replacement || !("value" in descriptors.replacement) ||
      !descriptors.replacement.enumerable || typeof descriptors.replacement.value !== "string") {
    throw new BoundedProviderError("PROVIDER_OUTPUT_INVALID");
  }
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  if (!Number.isFinite(costUsd) || costUsd < 0 || costUsd > PROOF_MAX_COST_USD) throw new BoundedProviderError("PROVIDER_COST_LIMIT");
  if (!Number.isSafeInteger(inputTokens) || inputTokens < 0 || inputTokens > PROOF_MAX_INPUT_TOKENS ||
      !Number.isSafeInteger(outputTokens) || outputTokens < 0 || outputTokens > PROOF_MAX_OUTPUT_TOKENS) {
    throw new BoundedProviderError("PROVIDER_USAGE_INVALID");
  }
  return { replacement: validateReplacement(taskNumber, descriptors.replacement.value), model: PROOF_MODEL,
    costUsd, inputTokens, outputTokens, requestCount: 1, destination: usage.destination ?? null };
}

export interface FakeBoundedProviderOptions {
  results?: Partial<Record<ProofTaskNumber, string | unknown>>;
  costUsd?: Partial<Record<ProofTaskNumber, number>>;
  delayMs?: number;
  onActiveChange?: (active: number) => void;
}

export function createFakeBoundedProvider(options: FakeBoundedProviderOptions = {}): BoundedProvider {
  const calls = new Map<ProofTaskNumber, number>();
  const outcomes = new Map<ProofTaskNumber, "started" | "succeeded" | "failed" | "unknown">();
  let totalCostUsd = 0;
  let active = 0;
  const defaults: Record<ProofTaskNumber, string> = {
    1: JSON.stringify({ replacement: "Welcome to your simple reading list, where every new book belongs." }),
    2: JSON.stringify({ replacement: "Add a book here to begin building your friendly reading list." }),
  };
  return {
    async call(input): Promise<BoundedProviderResult> {
      const request = validateBoundedProviderRequest(input);
      if ((calls.get(request.taskNumber) ?? 0) >= 1) throw new BoundedProviderError("PROVIDER_CALL_LIMIT");
      calls.set(request.taskNumber, 1);
      outcomes.set(request.taskNumber, "started");
      active += 1;
      options.onActiveChange?.(active);
      try {
        if (options.delayMs) await new Promise((resolveDelay) => setTimeout(resolveDelay, options.delayMs));
        const cost = options.costUsd?.[request.taskNumber] ?? 0;
        const result = validateBoundedProviderResult(request.taskNumber, options.results?.[request.taskNumber] ?? defaults[request.taskNumber], cost);
        if (totalCostUsd + cost > PROOF_TOTAL_COST_CAP_USD) throw new BoundedProviderError("PROVIDER_TOTAL_COST_LIMIT");
        totalCostUsd += cost;
        outcomes.set(request.taskNumber, "succeeded");
        return result;
      } catch (error) {
        outcomes.set(request.taskNumber, "failed");
        if (error instanceof BoundedProviderError) throw error;
        throw new BoundedProviderError("PROVIDER_CALL_FAILED");
      } finally {
        active -= 1;
        options.onActiveChange?.(active);
      }
    },
    snapshot: () => ({
      totalCalls: [...calls.values()].reduce((sum, count) => sum + count, 0), totalCostUsd,
      callsByTask: Object.fromEntries([...calls].map(([task, count]) => [String(task), count])),
      outcomesByTask: Object.fromEntries([...outcomes].map(([task, outcome]) => [String(task), outcome])),
    }),
  };
}

export function assertCanaryAbsent(values: readonly string[]): void {
  if (values.some((value) => value.includes(FAKE_PROVIDER_CANARY))) throw new BoundedProviderError("CANARY_EXPOSED");
}

function inside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith("/") && !/^[A-Za-z]:/.test(rel));
}

const SDK_FILES = {
  "index.mjs": "b8e991bb4f9f16463649c88ea0ca3121dc9be79d9fda97effe67fd4a3a37b891",
  "client.mjs": "c5876ab8d1c531619ba03f44de1719219cb8a7618beff1e7b43b6ee9204ad6c7",
  "package.json": "5970d7ae800e23d677c7a10c94711c072db929664b12fde67a20bc3163c65928",
  "core/credentials.mjs": "076961bdbad452a028c205cfc7cf37f8793ae89b6d1d961cf9d260b1e62f7b2d",
  "lib/credentials/credential-chain.mjs": "478ebb41963a7a9da3ff786849c46f4362ea5e853338ab3bfcfe64f841a643d6",
  "lib/credentials/user-oauth.mjs": "c7d63c76e7e46259f6a0457e6fc0398366e2182864e4ba283d3a2200301336b2",
  "lib/credentials/token-cache.mjs": "0fc4caef05b3e656188c2991dde2de560ababdd868d91c75e8c2364d5176191c",
} as const;

export function installedOfficialSdk(): { version: typeof OFFICIAL_SDK_VERSION; root: string; hashes: Record<string, string> } {
  const require = createRequire(resolveCoreRuntimeFile("index.js"));
  const root = dirname(require.resolve("@anthropic-ai/sdk"));
  const packageJson = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(packageJson, "utf8")) as { version?: unknown };
  if (pkg.version !== OFFICIAL_SDK_VERSION) throw new BoundedProviderError("SDK_VERSION_CHANGED");
  const hashes: Record<string, string> = {};
  for (const [name, expected] of Object.entries(SDK_FILES)) {
    const actual = createHash("sha256").update(readFileSync(join(root, name))).digest("hex");
    if (actual !== expected) throw new BoundedProviderError("SDK_BYTES_CHANGED");
    hashes[name] = actual;
  }
  return { version: OFFICIAL_SDK_VERSION, root, hashes };
}

function brokerProcessEnvironment(): Record<string, string | undefined> {
  const names = ["PATH", "SystemRoot", "WINDIR", "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP", "ComSpec", "PATHEXT"];
  return { ...Object.fromEntries(names.map((name) => [name, process.env[name]])), NO_COLOR: "1" };
}

export interface OfficialProviderHooks {
  beforeBrokerSpawn?: (value: { taskNumber: ProofTaskNumber }) => void;
  onBrokerSpawn?: (value: { taskNumber: ProofTaskNumber; pid: number; executable: string; cwd: string }) => void;
  onBrokerExit?: (value: { taskNumber: ProofTaskNumber; pid: number }) => void;
}

export function createOfficialBoundedProvider(
  authorizationValue: unknown,
  brokerRootValue: string,
  hooks: OfficialProviderHooks = {},
): BoundedProvider {
  const authorization = validateTask027LiveAuthorization(authorizationValue);
  installedOfficialSdk();
  const brokerRoot = resolve(brokerRootValue);
  if (process.platform !== "win32" || !inside(tmpdir(), brokerRoot) || !existsSync(brokerRoot) || readdirSync(brokerRoot).length !== 0) {
    throw new BoundedProviderError("BROKER_ROOT_INVALID");
  }
  const calls = new Map<ProofTaskNumber, number>();
  const outcomes = new Map<ProofTaskNumber, "started" | "succeeded" | "failed" | "unknown">();
  const requestCounts = new Map<ProofTaskNumber, number>();
  const destinations: string[] = [];
  const brokerPids: number[] = [];
  let totalCostUsd = 0;
  return {
    async call(input): Promise<BoundedProviderResult> {
      validateTask027LiveAuthorization(authorization);
      installedOfficialSdk();
      const request = validateBoundedProviderRequest(input);
      if ((calls.get(request.taskNumber) ?? 0) >= 1) throw new BoundedProviderError("PROVIDER_CALL_LIMIT");
      calls.set(request.taskNumber, 1);
      outcomes.set(request.taskNumber, "started");
      hooks.beforeBrokerSpawn?.({ taskNumber: request.taskNumber });
      const brokerDir = join(brokerRoot, `task-${String(request.taskNumber).padStart(3, "0")}`);
      mkdirSync(brokerDir, { recursive: false });
      let childPid = 0;
      try {
        const response = await new Promise<ReturnType<typeof parseBrokerResponse>>((resolveResponse, rejectResponse) => {
          const child = spawn(process.execPath, [brokerChildEntry()], {
            cwd: brokerDir, env: brokerProcessEnvironment(), stdio: ["pipe", "pipe", "ignore"], windowsHide: true,
          });
          childPid = child.pid ?? 0;
          if (!childPid) { rejectResponse(new BoundedProviderError("CALL_OUTCOME_UNKNOWN")); return; }
          brokerPids.push(childPid);
          try { hooks.onBrokerSpawn?.({ taskNumber: request.taskNumber, pid: childPid, executable: process.execPath, cwd: brokerDir }); }
          catch { child.kill(); rejectResponse(new BoundedProviderError("CALL_OUTCOME_UNKNOWN")); return; }
          let stdout = "";
          let settled = false;
          let terminationTimer: ReturnType<typeof setTimeout> | undefined;
          const finish = (action: () => void, exited = false) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (terminationTimer) clearTimeout(terminationTimer);
            if (exited) {
              try { hooks.onBrokerExit?.({ taskNumber: request.taskNumber, pid: childPid }); }
              catch { rejectResponse(new BoundedProviderError("CALL_OUTCOME_UNKNOWN")); return; }
            }
            action();
          };
          const timer = setTimeout(() => {
            child.kill();
            terminationTimer = setTimeout(() => finish(() => rejectResponse(new BoundedProviderError("CALL_OUTCOME_UNKNOWN"))), 5_000);
          }, 55_000);
          child.stdout.setEncoding("utf8");
          child.stdout.on("data", (chunk: string) => { stdout += chunk; if (stdout.length > 32_768) child.kill(); });
          child.once("error", () => finish(() => rejectResponse(new BoundedProviderError("CALL_OUTCOME_UNKNOWN"))));
          child.once("close", () => finish(() => {
            try { resolveResponse(parseBrokerResponse(stdout.trim())); }
            catch { rejectResponse(new BoundedProviderError("CALL_OUTCOME_UNKNOWN")); }
          }, true));
          child.stdin.end(JSON.stringify({ schemaVersion: 2, taskNumber: request.taskNumber, pricing: {
            inputUsdPerMillion: authorization.inputUsdPerMillion,
            outputUsdPerMillion: authorization.outputUsdPerMillion,
            maxInputTokens: authorization.maxInputTokens,
          } }));
        });
        requestCounts.set(request.taskNumber, response.requestCount);
        if (response.destination) destinations.push(response.destination);
        if (!response.ok) throw new BoundedProviderError(response.code);
        if (resolve(response.cwd) !== brokerDir || response.requestCount !== 1 || response.destination !== ANTHROPIC_MESSAGES_URL) {
          throw new BoundedProviderError("PROVIDER_BOUNDARY_UNPROVEN");
        }
        const validated = validateBoundedProviderResult(request.taskNumber, { replacement: response.replacement }, response.costUsd,
          { inputTokens: response.inputTokens, outputTokens: response.outputTokens, destination: response.destination });
        if (totalCostUsd + validated.costUsd > PROOF_TOTAL_COST_CAP_USD) throw new BoundedProviderError("PROVIDER_TOTAL_COST_LIMIT");
        totalCostUsd += validated.costUsd;
        outcomes.set(request.taskNumber, "succeeded");
        return validated;
      } catch (error) {
        outcomes.set(request.taskNumber, error instanceof BoundedProviderError && error.code !== "CALL_OUTCOME_UNKNOWN" ? "failed" : "unknown");
        if (error instanceof BoundedProviderError) throw error;
        throw new BoundedProviderError("CALL_OUTCOME_UNKNOWN");
      } finally { /* child ownership is released only by its observed close event */ }
    },
    snapshot: () => ({
      totalCalls: [...calls.values()].reduce((sum, value) => sum + value, 0), totalCostUsd,
      callsByTask: Object.fromEntries([...calls].map(([task, count]) => [String(task), count])),
      outcomesByTask: Object.fromEntries([...outcomes].map(([task, outcome]) => [String(task), outcome])),
      requestCountsByTask: Object.fromEntries([...requestCounts].map(([task, count]) => [String(task), count])),
      destinations: [...destinations], brokerPids: [...brokerPids],
    }),
  };
}
