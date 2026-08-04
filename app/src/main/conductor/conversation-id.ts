const CONVERSATION_ID = /^(?:00[1-9]|0[1-9]\d|[1-9]\d{2})$/;

/** Conversation filenames are deliberately finite and path-safe. Every
 * boundary that accepts an id uses this one rule, so an IPC string can never
 * become part of an arbitrary filesystem path. */
export function isConversationId(value: unknown): value is string {
  return typeof value === "string" && CONVERSATION_ID.test(value);
}

export function assertConversationId(value: unknown): asserts value is string {
  if (!isConversationId(value)) {
    throw new Error("CONDUCTOR_CONVERSATION_INVALID: Cairn refused an invalid conversation id.");
  }
}
