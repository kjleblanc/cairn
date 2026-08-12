export type SerialAuthenticatedPendingJournalAuthority = Readonly<{
  readonly __serialAuthenticatedPendingJournalAuthority: unique symbol;
}>;

export type SerialAuthenticatedPendingJournalBinding = Readonly<{
  capsuleSha256: string;
  projectRootSha256: string;
  runId: string;
  candidateSha256: string;
  revision: number;
  prepared: boolean;
}>;

type PendingJournalVerifier = (
  authority: unknown,
  expected: SerialAuthenticatedPendingJournalBinding,
) => boolean;

type PendingJournalTokenBinding = Readonly<{
  authority: unknown;
  expected: SerialAuthenticatedPendingJournalBinding;
}>;

const bindings = new WeakMap<object, PendingJournalTokenBinding>();
const spent = new WeakSet<object>();
let verifier: PendingJournalVerifier | null = null;

/** Main installs its authenticated pending-run verifier once during profile
 * store installation. Core never receives the profile key or trusts journal
 * bytes: Main's process-local authority must still cover the exact current
 * HMAC-authenticated revision and capsule before this opaque token is minted. */
export function registerSerialAuthenticatedPendingJournalVerifier(
  value: PendingJournalVerifier,
): boolean {
  if (typeof value !== "function" || verifier !== null) return false;
  verifier = value;
  return true;
}

export function authorizeSerialAuthenticatedPendingJournal(
  authority: unknown,
  expected: SerialAuthenticatedPendingJournalBinding,
): SerialAuthenticatedPendingJournalAuthority | null {
  if (!verifier || !verifier(authority, expected)) return null;
  const token = Object.freeze(Object.create(null)) as SerialAuthenticatedPendingJournalAuthority;
  bindings.set(token, Object.freeze({
    authority,
    expected: Object.freeze({ ...expected }),
  }));
  return token;
}

export function consumeSerialAuthenticatedPendingJournalAuthority(
  value: unknown,
  expected: SerialAuthenticatedPendingJournalBinding,
): value is SerialAuthenticatedPendingJournalAuthority {
  if (typeof value !== "object" || value === null) return false;
  const tokenBinding = bindings.get(value);
  const binding = tokenBinding?.expected;
  const covers = tokenBinding !== undefined && binding !== undefined && verifier !== null && !spent.has(value)
    && binding.capsuleSha256 === expected.capsuleSha256
    && binding.projectRootSha256 === expected.projectRootSha256
    && binding.runId === expected.runId
    && binding.candidateSha256 === expected.candidateSha256
    && binding.revision === expected.revision
    && binding.prepared === expected.prepared
    // Revalidate at consumption time. A token minted for revision N becomes
    // useless as soon as Main advances or closes that authenticated journal.
    && verifier(tokenBinding.authority, expected);
  if (covers) spent.add(value);
  return covers;
}
