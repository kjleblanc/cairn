export const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages" as const;

export type BoundedMessagesFetchStatus = "unused" | "delegated" | "rejected" | "unknown";

export interface BoundedMessagesFetchSnapshot {
  invocationCount: 0 | 1;
  delegatedCount: 0 | 1;
  destination: typeof ANTHROPIC_MESSAGES_URL | null;
  status: BoundedMessagesFetchStatus;
}

export class BoundedMessagesFetchError extends Error {
  constructor(readonly code: "MESSAGES_FETCH_REFUSED" | "MESSAGES_REQUEST_FAILED") {
    super(code);
    this.name = "BoundedMessagesFetchError";
  }
}

export interface OneRequestMessagesFetch {
  fetch: typeof globalThis.fetch;
  snapshot(): BoundedMessagesFetchSnapshot;
}

function rawUrl(input: Parameters<typeof globalThis.fetch>[0]): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * The only network-capable seam in the bounded Messages broker. The single
 * allocation is claimed synchronously before URL validation or delegation, so a
 * rejected first attempt can never fall through to a later provider request.
 */
export function createOneRequestMessagesFetch(
  delegate: typeof globalThis.fetch = globalThis.fetch,
): OneRequestMessagesFetch {
  let invocationCount: 0 | 1 = 0;
  let delegatedCount: 0 | 1 = 0;
  let destination: typeof ANTHROPIC_MESSAGES_URL | null = null;
  let status: BoundedMessagesFetchStatus = "unused";

  const boundedFetch: typeof globalThis.fetch = async (input, init) => {
    if (invocationCount === 1) {
      status = "rejected";
      throw new BoundedMessagesFetchError("MESSAGES_FETCH_REFUSED");
    }
    invocationCount = 1;

    const text = rawUrl(input);
    let url: URL;
    try { url = new URL(text); }
    catch {
      status = "rejected";
      throw new BoundedMessagesFetchError("MESSAGES_FETCH_REFUSED");
    }
    const requestMethod = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    if (url.href !== ANTHROPIC_MESSAGES_URL || url.protocol !== "https:" || url.hostname !== "api.anthropic.com" ||
        url.port !== "" || url.username !== "" || url.password !== "" || url.pathname !== "/v1/messages" ||
        url.search !== "" || url.hash !== "" || requestMethod !== "POST" || !signal) {
      status = "rejected";
      throw new BoundedMessagesFetchError("MESSAGES_FETCH_REFUSED");
    }

    destination = ANTHROPIC_MESSAGES_URL;
    delegatedCount = 1;
    status = "delegated";
    try {
      // Do not inspect, clone, hash, serialize, or log request headers or body.
      return await delegate(input, { ...init, method: "POST", redirect: "error", signal });
    } catch {
      status = "unknown";
      throw new BoundedMessagesFetchError("MESSAGES_REQUEST_FAILED");
    }
  };

  return {
    fetch: boundedFetch,
    snapshot: () => ({ invocationCount, delegatedCount, destination, status }),
  };
}
