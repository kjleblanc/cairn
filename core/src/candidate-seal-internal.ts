import type {
  SerialCandidateSealAuthorizationV1,
  SerialCandidateV1,
} from "./candidate.js";
import type { SerialPendingRestoreAuthority } from "./pending-restore-internal.js";

type PendingSealRestorer = (
  candidate: unknown,
  raw: unknown,
  pendingRestoreAuthority: SerialPendingRestoreAuthority,
  capsuleSha256: string,
) => SerialCandidateSealAuthorizationV1 | null;

let pendingSealRestorer: PendingSealRestorer | null = null;

/** Candidate registers the closure that can see its private lineage and seal
 * brands. This bridge is deliberately outside the package barrel: Serial may
 * invoke it only after authenticating a pending capsule and minting the
 * capsule-bound restore authority. */
export function registerSerialCandidatePendingSealRestorer(restorer: PendingSealRestorer): void {
  if (pendingSealRestorer !== null) throw new Error("serial candidate pending seal restorer already registered");
  pendingSealRestorer = restorer;
}

export function restoreSerialCandidateSealAuthorizationForPending(
  candidate: SerialCandidateV1,
  raw: unknown,
  pendingRestoreAuthority: SerialPendingRestoreAuthority,
  capsuleSha256: string,
): SerialCandidateSealAuthorizationV1 | null {
  return pendingSealRestorer?.(candidate, raw, pendingRestoreAuthority, capsuleSha256) ?? null;
}
