type SyntheticTaskConsumer = (authorization: unknown, request: unknown) => boolean;

let registeredConsumer: SyntheticTaskConsumer | null = null;

/** Critic owns the call brands and installs the only q9-task spend function.
 * This module is deliberately absent from the package barrel; Candidate adds
 * the durable reservation proof before reaching it. */
export function registerSyntheticTaskCriticConsumer(consumer: SyntheticTaskConsumer): void {
  if (registeredConsumer === null) registeredConsumer = consumer;
}

export function consumeSyntheticTaskCriticAuthorizationAfterReservation(
  authorization: unknown,
  request: unknown,
): boolean {
  return registeredConsumer?.(authorization, request) ?? false;
}
