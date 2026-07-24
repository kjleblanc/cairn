export interface SlotWithKey {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface ChatTurnMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamEvent {
  kind: "delta" | "usage" | "done";
  text?: string;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
}

export function ownerMessageFor(status: number): string {
  if (status === 401 || status === 403) return "The provider did not accept the key. Reconnect with a fresh key.";
  if (status === 402) return "The provider account is out of credit. Top it up, then try again.";
  if (status === 404) return "The provider does not recognize that model name. Check the model in settings.";
  if (status === 429) return "The provider is asking us to slow down. Wait a moment and try again.";
  return "The provider had a problem answering. Trying again in a moment usually works.";
}

export class ConductorHttpError extends Error {
  constructor(readonly status: number, readonly ownerMessage: string) {
    super(ownerMessage);
    this.name = "ConductorHttpError";
  }
}

export function buildRequestBody(model: string, messages: ChatTurnMessage[]): object {
  return { model, messages, stream: true, stream_options: { include_usage: true } };
}

function toEvent(payload: string): StreamEvent | null {
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

export async function* streamChat(
  slot: SlotWithKey,
  messages: ChatTurnMessage[],
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const base = slot.baseUrl.endsWith("/") ? slot.baseUrl : `${slot.baseUrl}/`;
  const response = await fetchImpl(new URL("chat/completions", base).toString(), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${slot.apiKey}` },
    body: JSON.stringify(buildRequestBody(slot.model, messages)),
    signal,
  });
  if (!response.ok || !response.body) {
    try {
      await response.body?.cancel();
    } catch {
      /* releasing the body must not mask the real error */
    }
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
