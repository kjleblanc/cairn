import {
  BUILDER_TURN_RESPONSE_VERSION,
  builderTurnContextSha256,
  builderTurnResponseMatchesContext,
  parseBuilderTurnResponse,
  type BuilderTurnContextV1,
  type BuilderTurnResponseV1,
} from "@cairn/core";

export const TASK232_FAKE_BUILDER_TRANSPORT_VERSION = "cairn-task232-tool-free-fake-transport/v1" as const;
export const TASK232_FAKE_BUILDER_AFTER_TEXT = "export const greeting = '<img src=x onerror=syntheticAfter()>';\n";

export type Task232FakeBuilderTransportV1 = Readonly<{
  version: typeof TASK232_FAKE_BUILDER_TRANSPORT_VERSION;
}>;

export type Task232FakeBuilderReceiptV1 = Readonly<{
  version: typeof TASK232_FAKE_BUILDER_TRANSPORT_VERSION;
  contextSha256: string;
  attempts: 1;
  toolDefinitions: 0;
  processHandles: 0;
  networkHandles: 0;
  credentialHandles: 0;
  ambientMessages: 0;
}>;

export type Task232FakeBuilderAnswerV1 = Readonly<{
  response: BuilderTurnResponseV1;
  receipt: Task232FakeBuilderReceiptV1;
}>;

type TransportState = {
  readonly context: BuilderTurnContextV1;
  readonly contextSha256: string;
  spent: boolean;
};

const transports = new WeakMap<object, TransportState>();
const answers = new WeakMap<object, Readonly<{
  transport: Task232FakeBuilderTransportV1;
  context: BuilderTurnContextV1;
  response: BuilderTurnResponseV1;
  spent: boolean;
}>>();

/**
 * The only v1 transport mint. It registers one already genuine context and
 * returns a data-free process-local token. There is no install hook, callback,
 * endpoint, model, tool list, retry policy, environment switch or serializer
 * that can add another transport implementation.
 */
export function createTask232FakeBuilderTransport(contextValue: unknown): Task232FakeBuilderTransportV1 | null {
  if (contextValue === null || typeof contextValue !== "object") return null;
  const contextSha256 = builderTurnContextSha256(contextValue);
  if (contextSha256 === null) return null;
  const transport = Object.freeze({ version: TASK232_FAKE_BUILDER_TRANSPORT_VERSION });
  transports.set(transport, { context: contextValue as BuilderTurnContextV1, contextSha256, spent: false });
  return transport;
}

/**
 * One asynchronous fake turn. The exact attempt is spent before yielding, so
 * a caller can change the disposable project during the turn for causal race
 * evidence without gaining a retry. This module has no effect-bearing import;
 * it can only parse one fixed inert response against the exact live context.
 */
export async function sendTask232FakeBuilderTurn(
  transportValue: unknown,
  contextValue: unknown,
): Promise<Task232FakeBuilderAnswerV1 | null> {
  if (transportValue === null || typeof transportValue !== "object"
    || contextValue === null || typeof contextValue !== "object") return null;
  const state = transports.get(transportValue);
  if (!state || state.spent || state.context !== contextValue
    || builderTurnContextSha256(contextValue) !== state.contextSha256) return null;
  state.spent = true;
  await Promise.resolve();
  if (state.context !== contextValue || builderTurnContextSha256(contextValue) !== state.contextSha256) return null;
  const context = contextValue as BuilderTurnContextV1;
  if (context.selectedTrackedText.length !== 1) return null;
  const selected = context.selectedTrackedText[0];
  if (!selected) return null;
  const response = parseBuilderTurnResponse(context, {
    version: BUILDER_TURN_RESPONSE_VERSION,
    contextSha256: state.contextSha256,
    kind: "replacement-proposal",
    summary: "Builder **suggests** one fixed synthetic replacement; [nothing opens](https://invalid.example).",
    replacements: [{
      projectRelativePath: selected.projectRelativePath,
      beforeSha256: selected.sha256,
      afterText: TASK232_FAKE_BUILDER_AFTER_TEXT,
      afterSha256: fixedSha256(TASK232_FAKE_BUILDER_AFTER_TEXT),
    }],
  });
  if (response === null || !builderTurnResponseMatchesContext(context, response)) return null;
  const receipt = Object.freeze({
    version: TASK232_FAKE_BUILDER_TRANSPORT_VERSION,
    contextSha256: state.contextSha256,
    attempts: 1 as const,
    toolDefinitions: 0 as const,
    processHandles: 0 as const,
    networkHandles: 0 as const,
    credentialHandles: 0 as const,
    ambientMessages: 0 as const,
  });
  const answer = Object.freeze({ response, receipt });
  answers.set(answer, Object.freeze({
    transport: transportValue as Task232FakeBuilderTransportV1,
    context,
    response,
    spent: false,
  }));
  return answer;
}

/** Pinning the reviewed digest keeps the fake module free of Node, WebCrypto,
 * provider, process and network imports. It accepts only the fixed ASCII
 * response text above. */
function fixedSha256(value: string): string {
  if (value !== TASK232_FAKE_BUILDER_AFTER_TEXT) throw new Error("TASK232_FAKE_RESPONSE_REFUSED");
  // SHA-256 of TASK232_FAKE_BUILDER_AFTER_TEXT. Keeping the assertion beside
  // the literal makes any response edit fail parsing until the reviewed fixed
  // digest is updated deliberately.
  return "6f5081f4b2f0589522c7fd4987adda2d909e5df1098dff5b4109abe361d2976e";
}

export function consumeTask232FakeBuilderAnswer(
  transportValue: unknown,
  contextValue: unknown,
  answerValue: unknown,
): BuilderTurnResponseV1 | null {
  if (transportValue === null || typeof transportValue !== "object"
    || contextValue === null || typeof contextValue !== "object"
    || answerValue === null || typeof answerValue !== "object") return null;
  const binding = answers.get(answerValue);
  if (!binding || binding.spent || binding.transport !== transportValue || binding.context !== contextValue
    || binding.response !== (answerValue as Task232FakeBuilderAnswerV1).response
    || !builderTurnResponseMatchesContext(contextValue, binding.response)) return null;
  // WeakMap values are frozen for every field except the explicit one-use bit;
  // replace the binding before exposing the response to the append boundary.
  answers.set(answerValue, Object.freeze({ ...binding, spent: true }));
  return binding.response;
}

export function task232FakeBuilderAnswerMatches(
  transportValue: unknown,
  contextValue: unknown,
  answerValue: unknown,
): boolean {
  if (transportValue === null || typeof transportValue !== "object"
    || contextValue === null || typeof contextValue !== "object"
    || answerValue === null || typeof answerValue !== "object") return false;
  const binding = answers.get(answerValue);
  return !!binding && !binding.spent && binding.transport === transportValue
    && binding.context === contextValue && binding.response === (answerValue as Task232FakeBuilderAnswerV1).response
    && builderTurnResponseMatchesContext(contextValue, binding.response);
}
