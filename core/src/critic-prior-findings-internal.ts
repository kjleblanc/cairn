type PriorFindingsBinder = (decision: unknown, target: unknown) => readonly unknown[] | null;

let registeredBinder: PriorFindingsBinder | null = null;

/** Critic installs its private finding binder once. Only Candidate imports the
 * callable side, after deriving the target from one branded current lineage. */
export function registerCriticPriorFindingsBinder(binder: PriorFindingsBinder): void {
  if (registeredBinder === null) registeredBinder = binder;
}

export function bindCriticPriorFindingsForCurrentCandidate(
  decision: unknown,
  target: unknown,
): readonly unknown[] | null {
  return registeredBinder?.(decision, target) ?? null;
}
