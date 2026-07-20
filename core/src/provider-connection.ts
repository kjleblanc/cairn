import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { types as nodeTypes } from "node:util";

export const PROVIDER_CONNECTION_DRAFT_ENV = "CAIRN_PROVIDER_CONNECTION_DRAFT";

const PROVIDERS = ["claude", "openai"] as const;
const CONNECTION_STATUSES = ["unknown", "disconnected", "connected"] as const;

export type ProviderId = (typeof PROVIDERS)[number];
export type ProviderConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export interface ProviderConnectionState {
  provider: ProviderId;
  status: ProviderConnectionStatus;
}

export interface ProviderConnectionAdapter {
  checkConnection(): unknown;
}

export type ProviderConnectionAdapters = Partial<Record<ProviderId, ProviderConnectionAdapter>>;

export function providerConnectionDraftEnabled(): boolean {
  return process.env[PROVIDER_CONNECTION_DRAFT_ENV] === "1";
}

function fixedError(code: string, message: string): Error {
  return new Error(`${code}: ${message}`);
}

function assertSyntheticRoot(root: string): string {
  const tempRoot = resolve(tmpdir());
  const projectRoot = resolve(root);
  const fromTemp = relative(tempRoot, projectRoot);
  if (!fromTemp || fromTemp.startsWith("..") || isAbsolute(fromTemp)) {
    throw fixedError(
      "PROVIDER_CONNECTION_SYNTHETIC_ONLY",
      "The provider Draft accepts only a project beneath the operating-system temporary directory.",
    );
  }
  return projectRoot;
}

function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

function isConnectionStatus(value: unknown): value is ProviderConnectionStatus {
  return typeof value === "string" && (CONNECTION_STATUSES as readonly string[]).includes(value);
}

function validateAdapterResponse(value: unknown): ProviderConnectionStatus {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value) || nodeTypes.isProxy(value)) {
      throw fixedError("PROVIDER_STATUS_INVALID", "The provider adapter returned an invalid response.");
    }
    const prototype = Object.getPrototypeOf(value);
    const keys = Reflect.ownKeys(value);
    if ((prototype !== Object.prototype && prototype !== null) || keys.length !== 1 || keys[0] !== "status") {
      throw fixedError("PROVIDER_STATUS_INVALID", "The provider adapter returned an invalid response.");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, "status");
    if (!descriptor || !descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      throw fixedError("PROVIDER_STATUS_INVALID", "The provider adapter returned an invalid response.");
    }
    const status = descriptor.value;
    if (!isConnectionStatus(status)) {
      throw fixedError("PROVIDER_STATUS_INVALID", "The provider adapter returned an invalid response.");
    }
    return status;
  } catch {
    throw fixedError("PROVIDER_STATUS_INVALID", "The provider adapter returned an invalid response.");
  }
}

function readAdapterStatus(adapter: ProviderConnectionAdapter): ProviderConnectionStatus {
  let response: unknown;
  try {
    response = adapter.checkConnection();
  } catch {
    throw fixedError("PROVIDER_STATUS_FAILED", "The provider adapter could not report a connection status.");
  }
  return validateAdapterResponse(response);
}

function writeState(root: string, state: ProviderConnectionState): void {
  const stateDirectory = join(root, ".cairn");
  mkdirSync(stateDirectory, { recursive: true });
  writeFileSync(
    join(stateDirectory, "provider-connection.json"),
    `${JSON.stringify({ provider: state.provider, status: state.status })}\n`,
    { encoding: "utf8", flag: "wx" },
  );
}

/**
 * The fake-only provider-owned connection seam for Task 019. It accepts only a
 * strict status object, persists only provider plus status, and never sees raw
 * provider output, credentials, commands, browsers, subprocesses, or networks.
 */
export function connectProviderDraft(
  root: string,
  provider: unknown,
  adapters: ProviderConnectionAdapters,
): ProviderConnectionState {
  if (!providerConnectionDraftEnabled()) {
    throw fixedError("PROVIDER_CONNECTION_DISABLED", `${PROVIDER_CONNECTION_DRAFT_ENV}=1 is required.`);
  }
  const projectRoot = assertSyntheticRoot(root);
  if (!isProviderId(provider)) {
    throw fixedError("PROVIDER_CHOICE_INVALID", "Choose claude or openai.");
  }
  const adapter = adapters[provider];
  if (!adapter || typeof adapter.checkConnection !== "function") {
    throw fixedError("PROVIDER_ADAPTER_UNAVAILABLE", "No fake adapter is available for that provider.");
  }
  const state: ProviderConnectionState = {
    provider,
    status: readAdapterStatus(adapter),
  };
  writeState(projectRoot, state);
  return state;
}
