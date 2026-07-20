import { fileURLToPath } from "node:url";

export const brokerChildEntry = fileURLToPath(new URL("./bounded-broker-child.js", import.meta.url));

export interface BrokerRequest {
  schemaVersion: 1;
  taskNumber: 1 | 2;
  proxyUrl: string;
}

export interface BrokerSuccess {
  schemaVersion: 1;
  ok: true;
  taskNumber: 1 | 2;
  replacement: string;
  model: "claude-haiku-4-5";
  costUsd: number;
  queryCount: 1;
  pid: number;
  cwd: string;
}

export interface BrokerFailure {
  schemaVersion: 1;
  ok: false;
  taskNumber: 1 | 2;
  code: string;
  queryCount: 0 | 1;
  pid: number;
  cwd: string;
}

export type BrokerResponse = BrokerSuccess | BrokerFailure;

function plain(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function parseLine(raw: string): unknown {
  if (raw.includes("\n") || raw.includes("\r") || raw.length > 32_768) throw new Error("BROKER_PROTOCOL_INVALID");
  try { return JSON.parse(raw); } catch { throw new Error("BROKER_PROTOCOL_INVALID"); }
}

export function parseBrokerRequest(raw: string): BrokerRequest {
  const value = parseLine(raw);
  if (!plain(value) || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(["proxyUrl", "schemaVersion", "taskNumber"]) ||
      value.schemaVersion !== 1 || (value.taskNumber !== 1 && value.taskNumber !== 2) ||
      typeof value.proxyUrl !== "string" || !/^http:\/\/127\.0\.0\.1:\d+$/.test(value.proxyUrl)) throw new Error("BROKER_PROTOCOL_INVALID");
  return { schemaVersion: 1, taskNumber: value.taskNumber, proxyUrl: value.proxyUrl };
}

export function parseBrokerResponse(raw: string): BrokerResponse {
  const value = parseLine(raw);
  if (!plain(value) || value.schemaVersion !== 1 || typeof value.ok !== "boolean" ||
      (value.taskNumber !== 1 && value.taskNumber !== 2) || !Number.isSafeInteger(value.pid) || typeof value.cwd !== "string") {
    throw new Error("BROKER_PROTOCOL_INVALID");
  }
  const keys = Object.keys(value).sort();
  if (value.ok) {
    const expected = ["costUsd", "cwd", "model", "ok", "pid", "queryCount", "replacement", "schemaVersion", "taskNumber"].sort();
    if (JSON.stringify(keys) !== JSON.stringify(expected) || typeof value.replacement !== "string" ||
        value.model !== "claude-haiku-4-5" || typeof value.costUsd !== "number" || value.queryCount !== 1) throw new Error("BROKER_PROTOCOL_INVALID");
  } else {
    const expected = ["code", "cwd", "ok", "pid", "queryCount", "schemaVersion", "taskNumber"].sort();
    if (JSON.stringify(keys) !== JSON.stringify(expected) || typeof value.code !== "string" ||
        (value.queryCount !== 0 && value.queryCount !== 1)) throw new Error("BROKER_PROTOCOL_INVALID");
  }
  return value as unknown as BrokerResponse;
}
