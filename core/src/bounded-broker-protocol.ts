import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { existsSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ANTHROPIC_MESSAGES_URL } from "./bounded-messages-fetch.js";

const RUNTIME_FILES = new Set([
  "bounded-broker-child.js",
  "bounded-broker-protocol.js",
  "bounded-messages-fetch.js",
  "bounded-provider.js",
  "concurrent-activation.js",
  "concurrent-run.js",
  "concurrent-state.js",
  "concurrent-worker-child.js",
  "index.js",
]);

/** Resolve a built core module without assuming import.meta.url has a file scheme.
 * Vite gives bundled Electron modules a data: URL; in that case resolve the
 * installed @cairn/core entry relative to the CommonJS bundle instead.
 */
export function resolveCoreRuntimeFile(name: string): string {
  if (!RUNTIME_FILES.has(name)) throw new Error("CORE_RUNTIME_FILE_REFUSED");
  if (import.meta.url.startsWith("file:")) {
    const candidate = fileURLToPath(new URL(`./${name}`, import.meta.url));
    if (existsSync(candidate)) return realpathSync(candidate);
  }

  const anchors: string[] = [];
  if (typeof __filename !== "undefined" && isAbsolute(__filename)) anchors.push(__filename);
  if (process.argv[1] && isAbsolute(process.argv[1])) anchors.push(process.argv[1]);
  anchors.push(resolve(process.cwd(), "package.json"));
  for (const anchor of anchors) {
    try {
      const coreEntry = createRequire(anchor).resolve("@cairn/core");
      const candidate = join(dirname(coreEntry), name);
      if (existsSync(candidate)) return realpathSync(candidate);
    } catch { /* try the next trusted local resolution anchor */ }
  }
  throw new Error("CORE_RUNTIME_FILE_UNAVAILABLE");
}

export function brokerChildEntry(): string {
  return resolveCoreRuntimeFile("bounded-broker-child.js");
}

export interface BrokerPricing {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  maxInputTokens: number;
}

export interface BrokerRequest {
  schemaVersion: 2;
  taskNumber: 1 | 2;
  pricing: BrokerPricing;
}

export interface BrokerSuccess {
  schemaVersion: 2;
  ok: true;
  taskNumber: 1 | 2;
  replacement: string;
  model: "claude-haiku-4-5";
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  requestCount: 1;
  destination: typeof ANTHROPIC_MESSAGES_URL;
  pid: number;
  cwd: string;
}

export interface BrokerFailure {
  schemaVersion: 2;
  ok: false;
  taskNumber: 1 | 2;
  code: string;
  requestCount: 0 | 1;
  destination: typeof ANTHROPIC_MESSAGES_URL | null;
  pid: number;
  cwd: string;
}

export type BrokerResponse = BrokerSuccess | BrokerFailure;

function plain(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function parseLine(raw: string): unknown {
  if (raw.includes("\n") || raw.includes("\r") || raw.length > 32_768) throw new Error("BROKER_PROTOCOL_INVALID");
  try { return JSON.parse(raw); } catch { throw new Error("BROKER_PROTOCOL_INVALID"); }
}

function validPricing(value: unknown): value is BrokerPricing {
  if (!plain(value) || !exactKeys(value, ["inputUsdPerMillion", "outputUsdPerMillion", "maxInputTokens"])) return false;
  return typeof value.inputUsdPerMillion === "number" && value.inputUsdPerMillion > 0 && value.inputUsdPerMillion <= 1 &&
    typeof value.outputUsdPerMillion === "number" && value.outputUsdPerMillion > 0 && value.outputUsdPerMillion <= 10 &&
    value.maxInputTokens === 200_000;
}

export function parseBrokerRequest(raw: string): BrokerRequest {
  const value = parseLine(raw);
  if (!plain(value) || !exactKeys(value, ["pricing", "schemaVersion", "taskNumber"]) || value.schemaVersion !== 2 ||
      (value.taskNumber !== 1 && value.taskNumber !== 2) || !validPricing(value.pricing)) {
    throw new Error("BROKER_PROTOCOL_INVALID");
  }
  return { schemaVersion: 2, taskNumber: value.taskNumber, pricing: { ...value.pricing } };
}

export function parseBrokerResponse(raw: string): BrokerResponse {
  const value = parseLine(raw);
  if (!plain(value) || value.schemaVersion !== 2 || typeof value.ok !== "boolean" ||
      (value.taskNumber !== 1 && value.taskNumber !== 2) || !Number.isSafeInteger(value.pid) ||
      (value.pid as number) <= 0 || typeof value.cwd !== "string" ||
      (value.destination !== null && value.destination !== ANTHROPIC_MESSAGES_URL) ||
      (value.requestCount !== 0 && value.requestCount !== 1)) {
    throw new Error("BROKER_PROTOCOL_INVALID");
  }
  if (value.ok) {
    const expected = ["costUsd", "cwd", "destination", "inputTokens", "model", "ok", "outputTokens", "pid",
      "replacement", "requestCount", "schemaVersion", "taskNumber"];
    if (!exactKeys(value, expected) || typeof value.replacement !== "string" || value.model !== "claude-haiku-4-5" ||
        typeof value.costUsd !== "number" || typeof value.inputTokens !== "number" || typeof value.outputTokens !== "number" ||
        !Number.isSafeInteger(value.inputTokens) || !Number.isSafeInteger(value.outputTokens) ||
        value.inputTokens < 0 || value.inputTokens > 200_000 || value.outputTokens < 0 || value.outputTokens > 64 ||
        value.requestCount !== 1 || value.destination !== ANTHROPIC_MESSAGES_URL) throw new Error("BROKER_PROTOCOL_INVALID");
  } else {
    const expected = ["code", "cwd", "destination", "ok", "pid", "requestCount", "schemaVersion", "taskNumber"];
    if (!exactKeys(value, expected) || typeof value.code !== "string" || !/^[A-Z0-9_]{3,64}$/.test(value.code)) {
      throw new Error("BROKER_PROTOCOL_INVALID");
    }
  }
  return value as unknown as BrokerResponse;
}
