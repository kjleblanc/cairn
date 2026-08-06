export interface ConductorTransportConnection {
  readonly baseUrl: string;
  readonly model: string;
  readonly apiKey: string;
}

export interface ConductorTransportMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface ConductorTransportRequest {
  readonly messages: readonly ConductorTransportMessage[];
  readonly signal?: AbortSignal;
}

export interface ConductorTransportUsage {
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly costUsd?: number;
}

/** Future native transports may supply these facts. The current compatible
 * transport deliberately leaves them absent because it has never surfaced
 * provider request ids or finish reasons. */
export interface ConductorTransportFinish {
  readonly finishReason?: string | null;
}

export interface ConductorTransportRequestIdentity {
  readonly requestId?: string;
}

export interface ConductorTransportDeltaEvent extends ConductorTransportRequestIdentity {
  readonly kind: "delta";
  readonly text: string;
}

export interface ConductorTransportUsageEvent
  extends ConductorTransportUsage, ConductorTransportRequestIdentity {
  readonly kind: "usage";
}

export interface ConductorTransportDoneEvent
  extends ConductorTransportFinish, ConductorTransportRequestIdentity {
  readonly kind: "done";
}

export type ConductorTransportStreamEvent =
  | ConductorTransportDeltaEvent
  | ConductorTransportUsageEvent
  | ConductorTransportDoneEvent;

export interface ConductorTransportRedactedError {
  readonly ownerMessage: string;
  readonly status?: number;
  readonly requestId?: string;
}

/** Transport implementations expose only a bounded owner-safe message to the
 * service. Protocol-specific subclasses may retain safe structured facts. */
export class ConductorTransportError extends Error implements ConductorTransportRedactedError {
  readonly requestId?: string;

  constructor(readonly ownerMessage: string, requestId?: string) {
    super(ownerMessage);
    this.name = "ConductorTransportError";
    if (requestId !== undefined) this.requestId = requestId;
  }
}

/** Kept under its existing public name so compatibility callers and the
 * service share one constructor identity for `instanceof` error handling. */
export class ConductorHttpError extends ConductorTransportError {
  constructor(readonly status: number, ownerMessage: string, requestId?: string) {
    super(ownerMessage, requestId);
    this.name = "ConductorHttpError";
  }
}

export interface ConductorTransport {
  stream(request: ConductorTransportRequest): AsyncGenerator<ConductorTransportStreamEvent>;
}

export type ConductorTransportFactory = (
  connection: ConductorTransportConnection,
) => ConductorTransport;

/** A small pure runner keeps service wiring testable without loading Electron
 * or teaching the provider-neutral factory about an HTTP implementation. */
export function streamWithTransport(
  factory: ConductorTransportFactory,
  connection: ConductorTransportConnection,
  request: ConductorTransportRequest,
): AsyncGenerator<ConductorTransportStreamEvent> {
  return factory(connection).stream(request);
}

/** No context budget exists yet (the briefing's own caps aside): without
 * this, a conversation that has grown large enough eventually hits the
 * provider's own context-length error, which the current HTTP mapping reports
 * as retryable. This coarse, provider-neutral cap remains checked before any
 * transport receives project data. */
export const PROMPT_CHAR_LIMIT = 200_000;

export function promptTooLarge(messages: ConductorTransportMessage[]): boolean {
  let total = 0;
  for (const message of messages) total += message.content.length;
  return total > PROMPT_CHAR_LIMIT;
}
