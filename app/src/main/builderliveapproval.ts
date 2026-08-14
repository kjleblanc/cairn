import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { types as nodeTypes } from "node:util";
import { builderTurnContextSha256 } from "@cairn/core";

export const TASK233_LIVE_SPEND_VERSION = "cairn-task233-live-spend/v1" as const;
export const TASK233_LIVE_SPEND_MARKER = "task233-live-spent.json" as const;

export type Task233LiveSpendAuthorityV1 = Readonly<{
  version: typeof TASK233_LIVE_SPEND_VERSION;
  contextSha256: string;
  requestBodySha256: string;
}>;

type DirectoryIdentity = Readonly<{
  path: string;
  dev: bigint;
  ino: bigint;
}>;

type SpendBinding = {
  readonly profile: DirectoryIdentity;
  readonly context: object;
  readonly contextSha256: string;
  readonly requestBodySha256: string;
  consumed: boolean;
};

const authorities = new WeakMap<object, SpendBinding>();
const SHA256 = /^[a-f0-9]{64}$/u;
const PROFILE_NAME = /^cairn-task233-profile-[A-Za-z0-9]{6}$/u;
const RECORD_KEYS = [
  "version",
  "contextSha256",
  "requestBodySha256",
  "model",
  "providerSlug",
  "endpoint",
  "maxTokens",
  "costCeilingUsd",
] as const;
const FIXED_MODEL = "moonshotai/kimi-k2";
const FIXED_PROVIDER_SLUG = "novita";
const FIXED_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const FIXED_MAX_TOKENS = 1_024;
const FIXED_COST_CEILING_USD = "0.05";
const MAX_RECORD_BYTES = 2_048;

function isProxy(value: object): boolean {
  try { return nodeTypes.isProxy(value); } catch { return true; }
}

function profileIdentity(value: unknown): DirectoryIdentity | null {
  try {
    if (typeof value !== "string" || value.length === 0 || value.includes("\0")) return null;
    const lexical = resolve(value);
    const real = realpathSync.native(lexical);
    const temp = realpathSync.native(tmpdir());
    const before = lstatSync(lexical, { bigint: true });
    const after = lstatSync(real, { bigint: true });
    const tempStat = lstatSync(temp, { bigint: true });
    return lexical === real && dirname(real) === temp && PROFILE_NAME.test(basename(real))
      && before.isDirectory() && !before.isSymbolicLink()
      && after.isDirectory() && !after.isSymbolicLink()
      && before.dev > 0n && before.ino > 0n
      && before.dev === after.dev && before.ino === after.ino
      && after.dev === tempStat.dev
      ? Object.freeze({ path: real, dev: after.dev, ino: after.ino })
      : null;
  } catch {
    return null;
  }
}

function profileStillExact(profile: DirectoryIdentity): boolean {
  try {
    if (realpathSync.native(profile.path) !== profile.path) return false;
    const stat = lstatSync(profile.path, { bigint: true });
    return stat.isDirectory() && !stat.isSymbolicLink()
      && stat.dev === profile.dev && stat.ino === profile.ino;
  } catch {
    return false;
  }
}

function stableMarkerRead(path: string, maximumBytes: number): Buffer | null {
  let descriptor: number | null = null;
  try {
    const before = lstatSync(path, { bigint: true });
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
      || before.size < 1n || before.size > BigInt(maximumBytes)) return null;
    descriptor = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n
      || opened.dev !== before.dev || opened.ino !== before.ino
      || opened.size !== before.size || opened.mtimeNs !== before.mtimeNs
      || opened.ctimeNs !== before.ctimeNs) return null;
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    const named = lstatSync(path, { bigint: true });
    if (after.dev !== opened.dev || after.ino !== opened.ino
      || named.dev !== opened.dev || named.ino !== opened.ino
      || after.nlink !== 1n || named.nlink !== 1n
      || after.size !== opened.size || named.size !== opened.size
      || after.mtimeNs !== opened.mtimeNs || after.ctimeNs !== opened.ctimeNs
      || named.mtimeNs !== opened.mtimeNs || named.ctimeNs !== opened.ctimeNs
      || bytes.byteLength !== Number(opened.size)) return null;
    return bytes;
  } catch {
    return null;
  } finally {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* read-only close */ }
    }
  }
}

function writeCreateOnly(path: string, bytes: Buffer): boolean {
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_RECORD_BYTES) return false;
  let descriptor: number | null = null;
  try {
    descriptor = openSync(
      path,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || opened.size !== BigInt(bytes.byteLength)) return false;
    closeSync(descriptor);
    descriptor = null;
    return stableMarkerRead(path, bytes.byteLength)?.equals(bytes) === true;
  } catch {
    return false;
  } finally {
    if (descriptor !== null) {
      try { closeSync(descriptor); } catch { /* create-only close */ }
    }
  }
}

function canonicalRecord(contextSha256: string, requestBodySha256: string): string {
  return JSON.stringify({
    version: TASK233_LIVE_SPEND_VERSION,
    contextSha256,
    requestBodySha256,
    model: FIXED_MODEL,
    providerSlug: FIXED_PROVIDER_SLUG,
    endpoint: FIXED_ENDPOINT,
    maxTokens: FIXED_MAX_TOKENS,
    costCeilingUsd: FIXED_COST_CEILING_USD,
  });
}

/**
 * Permanently spend this disposable profile's one approved Task 233 call
 * before any network I/O. The returned object is process-local authority; the
 * create-only marker is deliberately not resumable authority after restart.
 */
export function reserveTask233LiveSpend(
  profileRootValue: unknown,
  contextValue: unknown,
  requestBodySha256Value: unknown,
): Task233LiveSpendAuthorityV1 | null {
  try {
    if (contextValue === null || typeof contextValue !== "object" || isProxy(contextValue)
      || typeof requestBodySha256Value !== "string" || !SHA256.test(requestBodySha256Value)) return null;
    const profile = profileIdentity(profileRootValue);
    const contextSha256 = builderTurnContextSha256(contextValue);
    if (!profile || contextSha256 === null || !profileStillExact(profile)) return null;
    const text = canonicalRecord(contextSha256, requestBodySha256Value);
    const bytes = Buffer.from(text, "utf8");
    const markerPath = join(profile.path, TASK233_LIVE_SPEND_MARKER);
    if (!writeCreateOnly(markerPath, bytes) || !profileStillExact(profile)) return null;
    const readback = stableMarkerRead(markerPath, MAX_RECORD_BYTES);
    if (readback === null || !readback.equals(bytes)
      || createHash("sha256").update(readback).digest("hex")
        !== createHash("sha256").update(bytes).digest("hex")) return null;
    const authority = Object.freeze({
      version: TASK233_LIVE_SPEND_VERSION,
      contextSha256,
      requestBodySha256: requestBodySha256Value,
    });
    authorities.set(authority, {
      profile,
      context: contextValue,
      contextSha256,
      requestBodySha256: requestBodySha256Value,
      consumed: false,
    });
    return authority;
  } catch {
    return null;
  }
}

/** Consume the exact in-memory authority once, before the transport awaits. */
export function consumeTask233LiveSpend(
  authorityValue: unknown,
  contextValue: unknown,
  requestBodySha256Value: unknown,
): boolean {
  try {
    if (authorityValue === null || typeof authorityValue !== "object"
      || contextValue === null || typeof contextValue !== "object"
      || typeof requestBodySha256Value !== "string") return false;
    const binding = authorities.get(authorityValue);
    if (!binding || binding.consumed || binding.context !== contextValue
      || binding.requestBodySha256 !== requestBodySha256Value
      || binding.contextSha256 !== builderTurnContextSha256(contextValue)
      || !profileStillExact(binding.profile)) return false;
    binding.consumed = true;
    return true;
  } catch {
    return false;
  }
}

/** Tests and postflight may parse the disposable marker as inert evidence. */
export function parseTask233LiveSpendMarker(value: unknown): Readonly<{
  version: typeof TASK233_LIVE_SPEND_VERSION;
  contextSha256: string;
  requestBodySha256: string;
  model: typeof FIXED_MODEL;
  providerSlug: typeof FIXED_PROVIDER_SLUG;
  endpoint: typeof FIXED_ENDPOINT;
  maxTokens: typeof FIXED_MAX_TOKENS;
  costCeilingUsd: typeof FIXED_COST_CEILING_USD;
}> | null {
  try {
    if (typeof value !== "string" || Buffer.byteLength(value, "utf8") > MAX_RECORD_BYTES) return null;
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed) || isProxy(parsed)
      || Object.getPrototypeOf(parsed) !== Object.prototype
      || Reflect.ownKeys(parsed).some((key) => typeof key !== "string")
      || JSON.stringify(parsed) !== value) return null;
    const record = parsed as Record<string, unknown>;
    if (Object.keys(record).length !== RECORD_KEYS.length
      || !RECORD_KEYS.every((key, index) => Object.keys(record)[index] === key)
      || record.version !== TASK233_LIVE_SPEND_VERSION
      || typeof record.contextSha256 !== "string" || !SHA256.test(record.contextSha256)
      || typeof record.requestBodySha256 !== "string" || !SHA256.test(record.requestBodySha256)
      || record.model !== FIXED_MODEL || record.providerSlug !== FIXED_PROVIDER_SLUG
      || record.endpoint !== FIXED_ENDPOINT || record.maxTokens !== FIXED_MAX_TOKENS
      || record.costCeilingUsd !== FIXED_COST_CEILING_USD) return null;
    return Object.freeze(record) as ReturnType<typeof parseTask233LiveSpendMarker>;
  } catch {
    return null;
  }
}
