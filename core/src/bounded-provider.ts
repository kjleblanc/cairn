import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { brokerChildEntry, parseBrokerResponse } from "./bounded-broker-protocol.js";
import { createBoundedNetworkGuard } from "./bounded-network-guard.js";

export const PROOF_PROVIDER = "anthropic" as const;
export const PROOF_MODEL = "claude-haiku-4-5" as const;
export const PROOF_MAX_COST_USD = 0.25 as const;
export const PROOF_TOTAL_COST_CAP_USD = 0.50 as const;
export const PROOF_MAX_CALLS_PER_TASK = 1 as const;
export const PROOF_SYSTEM = "Return only strict JSON matching {\"replacement\":\"string\"}. Do not use tools, request more information, or include extra fields.";
export const FAKE_PROVIDER_CANARY = "CAIRN_026_FAKE_SECRET_CANARY_DO_NOT_PERSIST";
export const TASK_026_BRIEF_COMMIT = "87eb01d10fae6d2e68d3a53bff82d8a182008565";
export const LIVE_CREDENTIAL_APPROVAL = "For High-Stakes task 026's disposable proof only, I confirm my Claude credential is owner-managed through Anthropic's official installed authentication or operating-system store, and I approve the verified isolated broker processes to use it only for the two named tool-free tasks. Do not reveal, inspect, copy, or log its value.";
export const LIVE_TASK_001_APPROVAL = "For High-Stakes task 026 disposable Task 001 only, approve exactly one tool-free provider call to api.anthropic.com using claude-haiku-4-5 and input SHA-256 3f50f7d24b6e52247aa05eae652d6a0bed39ce8bd7ce6da42642b74ee117bfe8, with no retry, fallback, tool, or other destination.";
export const LIVE_TASK_002_APPROVAL = "For High-Stakes task 026 disposable Task 002 only, approve exactly one tool-free provider call to api.anthropic.com using claude-haiku-4-5 and input SHA-256 2196cff705d1b7e4dff0507afc0ba808871e377aadf14da1e9a7631f2fb6bdd8, with no retry, fallback, tool, or other destination.";
export const LIVE_COST_APPROVAL = "For High-Stakes task 026's disposable proof, approve one fixed total provider-cost cap of US$0.50: at most US$0.25 allocated to Task 001 and at most US$0.25 allocated to Task 002. Allocations are not transferable; no retry, second call for either task, fallback model, higher cost, or billing change is approved.";

export type ProofTaskNumber = 1 | 2;

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
  requestCount: 1;
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
  queryCountsByTask?: Readonly<Record<string, number>>;
  destinations?: readonly string[];
  brokerPids?: readonly number[];
}

export interface Task026LiveAuthorization {
  schemaVersion: 1;
  briefCommit: typeof TASK_026_BRIEF_COMMIT;
  implementationDigest: string;
  approvedAt: string;
  credentialApproval: typeof LIVE_CREDENTIAL_APPROVAL;
  task001Approval: typeof LIVE_TASK_001_APPROVAL;
  task002Approval: typeof LIVE_TASK_002_APPROVAL;
  costApproval: typeof LIVE_COST_APPROVAL;
}

export class BoundedProviderError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "BoundedProviderError";
  }
}

const USERS: Readonly<Record<ProofTaskNumber, string>> = {
  1: "Write one welcoming sentence of 8 to 18 words for a synthetic beginner reading-list demo. It must include the word \"welcome\".",
  2: "Write one instruction sentence of 8 to 18 words for a synthetic beginner reading-list demo. It must include the words \"add\" and \"book\".",
};

const INPUT_HASHES: Readonly<Record<ProofTaskNumber, string>> = {
  1: "3f50f7d24b6e52247aa05eae652d6a0bed39ce8bd7ce6da42642b74ee117bfe8",
  2: "2196cff705d1b7e4dff0507afc0ba808871e377aadf14da1e9a7631f2fb6bdd8",
};

export function proofProviderRequest(taskNumber: ProofTaskNumber): BoundedProviderRequest {
  return {
    taskNumber,
    provider: PROOF_PROVIDER,
    model: PROOF_MODEL,
    system: PROOF_SYSTEM,
    user: USERS[taskNumber],
    inputSha256: INPUT_HASHES[taskNumber],
    maxCalls: PROOF_MAX_CALLS_PER_TASK,
    maxCostUsd: PROOF_MAX_COST_USD,
  };
}

export function validateTask026LiveAuthorization(value: unknown, requireFresh = true): Task026LiveAuthorization {
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new BoundedProviderError("LIVE_APPROVAL_REQUIRED");
  }
  const keys = Object.keys(value).sort();
  const expected = ["approvedAt", "briefCommit", "costApproval", "credentialApproval", "implementationDigest", "schemaVersion", "task001Approval", "task002Approval"].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) throw new BoundedProviderError("LIVE_APPROVAL_REQUIRED");
  const authorization = value as Task026LiveAuthorization;
  if (authorization.schemaVersion !== 1 || authorization.briefCommit !== TASK_026_BRIEF_COMMIT ||
      !/^[0-9a-f]{64}$/.test(authorization.implementationDigest) ||
      authorization.credentialApproval !== LIVE_CREDENTIAL_APPROVAL || authorization.task001Approval !== LIVE_TASK_001_APPROVAL ||
      authorization.task002Approval !== LIVE_TASK_002_APPROVAL || authorization.costApproval !== LIVE_COST_APPROVAL ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(authorization.approvedAt)) {
    throw new BoundedProviderError("LIVE_APPROVAL_REQUIRED");
  }
  // "Immediately before" is finite: an approval bundle older than ten minutes is stale.
  const ageMs = Date.now() - Date.parse(authorization.approvedAt);
  if (requireFresh && (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 10 * 60_000)) throw new BoundedProviderError("LIVE_APPROVAL_STALE");
  return { ...authorization };
}

export function canonicalProviderInput(request: BoundedProviderRequest): string {
  return JSON.stringify({ system: request.system, user: request.user });
}

export function validateBoundedProviderRequest(value: unknown): BoundedProviderRequest {
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new BoundedProviderError("PROVIDER_REQUEST_INVALID");
  }
  const keys = Object.keys(value).sort();
  const expected = ["inputSha256", "maxCalls", "maxCostUsd", "model", "provider", "system", "taskNumber", "user"].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) throw new BoundedProviderError("PROVIDER_REQUEST_INVALID");
  const request = value as BoundedProviderRequest;
  if ((request.taskNumber !== 1 && request.taskNumber !== 2) || request.provider !== PROOF_PROVIDER ||
      request.model !== PROOF_MODEL || request.system !== PROOF_SYSTEM || request.user !== USERS[request.taskNumber] ||
      request.inputSha256 !== INPUT_HASHES[request.taskNumber] || request.maxCalls !== 1 || request.maxCostUsd !== 0.25) {
    throw new BoundedProviderError("PROVIDER_REQUEST_INVALID");
  }
  const actual = createHash("sha256").update(canonicalProviderInput(request), "utf8").digest("hex");
  if (actual !== request.inputSha256) throw new BoundedProviderError("PROVIDER_INPUT_CHANGED");
  return { ...request };
}

function sentenceWords(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

function validateReplacement(taskNumber: ProofTaskNumber, value: string): string {
  if (value.includes(FAKE_PROVIDER_CANARY) || /[\r\n\0]/.test(value)) {
    throw new BoundedProviderError("PROVIDER_OUTPUT_INVALID");
  }
  const words = sentenceWords(value);
  if (words.length < 8 || words.length > 18) throw new BoundedProviderError("PROVIDER_OUTPUT_INVALID");
  const lower = value.toLocaleLowerCase("en-US");
  if (taskNumber === 1 && !/\bwelcome\b/.test(lower)) throw new BoundedProviderError("PROVIDER_OUTPUT_INVALID");
  if (taskNumber === 2 && (!/\badd\b/.test(lower) || !/\bbook\b/.test(lower))) {
    throw new BoundedProviderError("PROVIDER_OUTPUT_INVALID");
  }
  return value;
}

/** Validate a broker boundary string. JSON.parse creates the ordinary object. */
export function validateBoundedProviderResult(
  taskNumber: ProofTaskNumber,
  raw: string | unknown,
  costUsd = 0,
): BoundedProviderResult {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try { value = JSON.parse(raw); } catch { throw new BoundedProviderError("PROVIDER_OUTPUT_INVALID"); }
  }
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new BoundedProviderError("PROVIDER_OUTPUT_INVALID");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).length !== 1 || !descriptors.replacement ||
      !("value" in descriptors.replacement) || !descriptors.replacement.enumerable ||
      typeof descriptors.replacement.value !== "string") {
    throw new BoundedProviderError("PROVIDER_OUTPUT_INVALID");
  }
  if (!Number.isFinite(costUsd) || costUsd < 0 || costUsd > PROOF_MAX_COST_USD) {
    throw new BoundedProviderError("PROVIDER_COST_LIMIT");
  }
  return {
    replacement: validateReplacement(taskNumber, descriptors.replacement.value),
    model: PROOF_MODEL,
    costUsd,
    requestCount: 1,
  };
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
      // Allocation is consumed before provider control. Failure is never retryable.
      calls.set(request.taskNumber, 1);
      outcomes.set(request.taskNumber, "started");
      active += 1;
      options.onActiveChange?.(active);
      try {
        if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
        const cost = options.costUsd?.[request.taskNumber] ?? 0;
        const result = validateBoundedProviderResult(
          request.taskNumber,
          options.results?.[request.taskNumber] ?? defaults[request.taskNumber],
          cost,
        );
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
    snapshot(): ProviderLedgerSnapshot {
      return {
        totalCalls: [...calls.values()].reduce((sum, count) => sum + count, 0),
        totalCostUsd,
        callsByTask: Object.fromEntries([...calls].map(([task, count]) => [String(task), count])),
        outcomesByTask: Object.fromEntries([...outcomes].map(([task, outcome]) => [String(task), outcome])),
      };
    },
  };
}

export function assertCanaryAbsent(values: readonly string[]): void {
  if (values.some((value) => value.includes(FAKE_PROVIDER_CANARY))) {
    throw new BoundedProviderError("CANARY_EXPOSED");
  }
}

function inside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith("/") && !/^[A-Za-z]:/.test(rel));
}

export function installedOfficialSdk(): { version: string; entry: string; packageJson: string; entrySha256: string } {
  const require = createRequire(import.meta.url);
  const entry = require.resolve("@anthropic-ai/claude-agent-sdk");
  const packageJson = join(dirname(entry), "package.json");
  const pkg = JSON.parse(readFileSync(packageJson, "utf8")) as { version?: unknown };
  if (pkg.version !== "0.2.141") throw new BoundedProviderError("SDK_VERSION_CHANGED");
  return { version: pkg.version, entry, packageJson, entrySha256: createHash("sha256").update(readFileSync(entry)).digest("hex") };
}

function brokerProcessEnvironment(): Record<string, string | undefined> {
  const names = ["PATH", "SystemRoot", "WINDIR", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP", "ComSpec", "PATHEXT"];
  return {
    ...Object.fromEntries(names.map((name) => [name, process.env[name]])),
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    DISABLE_TELEMETRY: "1",
    DISABLE_ERROR_REPORTING: "1",
    NO_COLOR: "1",
  };
}

/**
 * Credentialless parent seam for the separately approved live proof. The SDK is
 * imported only by bounded-broker-child in an empty directory. Parent IPC is one
 * request and one redacted response; stderr is discarded.
 */
export function createOfficialBoundedProvider(
  authorizationValue: unknown,
  brokerRootValue: string,
): BoundedProvider {
  validateTask026LiveAuthorization(authorizationValue);
  installedOfficialSdk();
  const brokerRoot = resolve(brokerRootValue);
  if (process.platform !== "win32" || !inside(tmpdir(), brokerRoot) || !existsSync(brokerRoot) || readdirSync(brokerRoot).length !== 0) {
    throw new BoundedProviderError("BROKER_ROOT_INVALID");
  }
  const calls = new Map<ProofTaskNumber, number>();
  const outcomes = new Map<ProofTaskNumber, "started" | "succeeded" | "failed" | "unknown">();
  const queryCounts = new Map<ProofTaskNumber, number>();
  const destinations: string[] = [];
  const brokerPids: number[] = [];
  let totalCostUsd = 0;
  return {
    async call(input): Promise<BoundedProviderResult> {
      validateTask026LiveAuthorization(authorizationValue);
      const request = validateBoundedProviderRequest(input);
      if ((calls.get(request.taskNumber) ?? 0) >= 1) throw new BoundedProviderError("PROVIDER_CALL_LIMIT");
      calls.set(request.taskNumber, 1);
      outcomes.set(request.taskNumber, "started");
      const brokerDir = join(brokerRoot, `task-${String(request.taskNumber).padStart(3, "0")}`);
      mkdirSync(brokerDir, { recursive: false });
      const guard = await createBoundedNetworkGuard();
      try {
        const response = await new Promise<ReturnType<typeof parseBrokerResponse>>((resolveResponse, rejectResponse) => {
          const child = spawn(process.execPath, [brokerChildEntry], {
            cwd: brokerDir,
            env: brokerProcessEnvironment(),
            stdio: ["pipe", "pipe", "ignore"],
            windowsHide: true,
          });
          if (child.pid) brokerPids.push(child.pid);
          let stdout = "";
          child.stdout.setEncoding("utf8");
          child.stdout.on("data", (chunk: string) => { stdout += chunk; if (stdout.length > 65_536) child.kill(); });
          child.once("error", () => rejectResponse(new BoundedProviderError("CALL_OUTCOME_UNKNOWN")));
          child.once("close", () => {
            try { resolveResponse(parseBrokerResponse(stdout.trim())); }
            catch { rejectResponse(new BoundedProviderError("CALL_OUTCOME_UNKNOWN")); }
          });
          child.stdin.end(JSON.stringify({ schemaVersion: 1, taskNumber: request.taskNumber, proxyUrl: guard.proxyUrl }));
        });
        queryCounts.set(request.taskNumber, response.queryCount);
        const observed = guard.snapshot();
        destinations.push(...observed.destinations);
        if (!response.ok) throw new BoundedProviderError(response.code);
        if (resolve(response.cwd) !== brokerDir || response.queryCount !== 1 || observed.rejected !== 0 ||
            observed.destinations.some((value) => value !== "api.anthropic.com:443")) throw new BoundedProviderError("PROVIDER_BOUNDARY_UNPROVEN");
        const validated = validateBoundedProviderResult(request.taskNumber, { replacement: response.replacement }, response.costUsd);
        if (totalCostUsd + validated.costUsd > PROOF_TOTAL_COST_CAP_USD) throw new BoundedProviderError("PROVIDER_TOTAL_COST_LIMIT");
        totalCostUsd += validated.costUsd;
        outcomes.set(request.taskNumber, "succeeded");
        return validated;
      } catch (error) {
        outcomes.set(request.taskNumber, error instanceof BoundedProviderError ? "failed" : "unknown");
        if (error instanceof BoundedProviderError) throw error;
        throw new BoundedProviderError("CALL_OUTCOME_UNKNOWN");
      } finally {
        await guard.close();
      }
    },
    snapshot(): ProviderLedgerSnapshot {
      return {
        totalCalls: [...calls.values()].reduce((sum, value) => sum + value, 0), totalCostUsd,
        callsByTask: Object.fromEntries([...calls].map(([task, count]) => [String(task), count])),
        outcomesByTask: Object.fromEntries([...outcomes].map(([task, outcome]) => [String(task), outcome])),
        queryCountsByTask: Object.fromEntries([...queryCounts].map(([task, count]) => [String(task), count])),
        destinations: [...destinations],
        brokerPids: [...brokerPids],
      };
    },
  };
}
