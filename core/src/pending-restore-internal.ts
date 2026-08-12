export type SerialPendingRestoreAuthority = Readonly<{
  readonly __serialPendingRestoreAuthority: unique symbol;
}>;

type SerialPendingRestoreBinding = Readonly<{
  capsuleSha256: string;
  projectRootSha256: string;
  runId: string;
  candidateSha256: string;
}>;

const bindings = new WeakMap<object, SerialPendingRestoreBinding>();

/** Serial mints this only after parsing and recomputing an exact pending
 * capsule. It is intentionally unavailable from @cairn/core. */
export function composeSerialPendingRestoreAuthority(
  capsuleSha256: string,
  projectRootSha256: string,
  runId: string,
  candidateSha256: string,
): SerialPendingRestoreAuthority {
  const authority = Object.freeze(Object.create(null)) as SerialPendingRestoreAuthority;
  bindings.set(authority, Object.freeze({ capsuleSha256, projectRootSha256, runId, candidateSha256 }));
  return authority;
}

export function serialPendingRestoreAuthorityCovers(
  value: unknown,
  expected: SerialPendingRestoreBinding,
): value is SerialPendingRestoreAuthority {
  if (typeof value !== "object" || value === null) return false;
  const binding = bindings.get(value);
  return binding !== undefined
    && binding.capsuleSha256 === expected.capsuleSha256
    && binding.projectRootSha256 === expected.projectRootSha256
    && binding.runId === expected.runId
    && binding.candidateSha256 === expected.candidateSha256;
}
