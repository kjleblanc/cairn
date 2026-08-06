import { createOpenAICompatibleTransport } from "./transports/openai-compatible.js";

export interface SlotWithKey {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface ChatTurnMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** The legacy wrapper keeps its original loose event surface until all callers
 * migrate; transport implementations use the stricter discriminated union. */
export interface StreamEvent {
  kind: "delta" | "usage" | "done";
  text?: string;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
}

export {
  ConductorHttpError,
  PROMPT_CHAR_LIMIT,
  promptTooLarge,
} from "./transports/types.js";
export { buildRequestBody, ownerMessageFor } from "./transports/openai-compatible.js";

export async function* streamChat(
  slot: SlotWithKey,
  messages: ChatTurnMessage[],
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  yield* createOpenAICompatibleTransport(slot, fetchImpl).stream({ messages, signal });
}
