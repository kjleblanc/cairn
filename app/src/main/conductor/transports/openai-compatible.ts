import {
  ConductorHttpError,
  INFERENCE_REDIRECT_POLICY,
  type ConductorTransport,
  type ConductorTransportConnection,
  type ConductorTransportMessage,
  type ConductorTransportRequest,
  type ConductorTransportStreamEvent,
} from "./types.js";

const REDIRECT_OWNER_MESSAGE = "The provider redirected Cairn's request. Cairn stopped before sending it anywhere else.";

export function ownerMessageFor(status: number): string {
  if (status === 401 || status === 403) return "The provider did not accept the key. Reconnect with a fresh key.";
  if (status === 402) return "The provider account is out of credit. Top it up, then try again.";
  if (status === 404) return "The provider does not recognize that model name. Check the model in settings.";
  if (status === 429) return "The provider is asking us to slow down. Wait a moment and try again.";
  return "The provider had a problem answering. Trying again in a moment usually works.";
}

export function buildRequestBody(model: string, messages: readonly ConductorTransportMessage[]): object {
  return { model, messages, stream: true, stream_options: { include_usage: true } };
}

/**
 * The one place Cairn issues an OpenAI-compatible completion request.
 *
 * The conversation transport below and the one-shot critic transport in
 * `app/src/main/critictransport.ts` share it deliberately: the endpoint
 * derivation, the header set, the manual-redirect refusal, and the redacted
 * error mapping are a single implementation, so a second caller cannot drift
 * away from the redirect guarantee by copying it. Callers supply their own
 * serialized body; this function never composes one.
 */
export async function postChatCompletions(input: {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly body: string;
  readonly signal?: AbortSignal;
  readonly fetchImpl: typeof fetch;
}): Promise<Response> {
  // Called as a bare function, never as `input.fetchImpl(...)`: a method call
  // would pass `input` as the receiver, and a `fetch` that brand-checks its
  // receiver would throw where the previous inline call did not.
  const { baseUrl, apiKey, body, signal, fetchImpl } = input;
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const response = await fetchImpl(new URL("chat/completions", base).toString(), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body,
    redirect: "manual",
    signal,
  });
  if (response.status >= 300 && response.status < 400) {
    try {
      await response.body?.cancel();
    } catch {
      /* releasing the body must not mask the redacted redirect error */
    }
    throw new ConductorHttpError(response.status, REDIRECT_OWNER_MESSAGE);
  }
  if (!response.ok) {
    try {
      await response.body?.cancel();
    } catch {
      /* releasing the body must not mask the real error */
    }
    throw new ConductorHttpError(response.status, ownerMessageFor(response.status));
  }
  return response;
}

function toEvent(payload: string): ConductorTransportStreamEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as { choices?: Array<{ delta?: { content?: unknown } }>; usage?: { prompt_tokens?: unknown; completion_tokens?: unknown; cost?: unknown } };
  const content = record.choices?.[0]?.delta?.content;
  if (typeof content === "string" && content.length > 0) return { kind: "delta", text: content };
  if (record.usage && typeof record.usage === "object") {
    const usage = record.usage;
    return {
      kind: "usage",
      promptTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : 0,
      completionTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : 0,
      costUsd: typeof usage.cost === "number" ? usage.cost : undefined,
    };
  }
  return null;
}

async function* streamOpenAICompatible(
  connection: ConductorTransportConnection,
  request: ConductorTransportRequest,
  fetchImpl: typeof fetch,
): AsyncGenerator<ConductorTransportStreamEvent> {
  const response = await postChatCompletions({
    baseUrl: connection.baseUrl,
    apiKey: connection.apiKey,
    body: JSON.stringify(buildRequestBody(connection.model, request.messages)),
    signal: request.signal,
    fetchImpl,
  });
  // A 2xx with no body is stream-specific: the shared primitive has already
  // refused every redirect and every non-2xx status above.
  if (!response.body) {
    throw new ConductorHttpError(response.status, ownerMessageFor(response.status));
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") {
        yield { kind: "done" };
        return;
      }
      const event = toEvent(payload);
      if (event) yield event;
    }
  }
  yield { kind: "done" };
}

export function createOpenAICompatibleTransport(
  connection: ConductorTransportConnection,
  fetchImpl: typeof fetch = fetch,
): ConductorTransport {
  return {
    inferenceRedirectPolicy: INFERENCE_REDIRECT_POLICY,
    stream(request) {
      return streamOpenAICompatible(connection, request, fetchImpl);
    },
  };
}
