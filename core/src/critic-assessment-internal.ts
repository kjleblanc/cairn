import {
  serialPendingRestoreAuthorityCovers,
  type SerialPendingRestoreAuthority,
} from "./pending-restore-internal.js";

type AssessmentRestartExpected = Readonly<{
  projectRootSha256: string;
  runId: string;
  candidateSha256: string;
}>;

type AssessmentRestartRestorer = (
  taskSpec: unknown,
  evidencePlan: unknown,
  rawCustody: unknown,
  rawExpected: unknown,
) => unknown | null;

let registeredRestorer: AssessmentRestartRestorer | null = null;

/** Critic installs its private parser once at module initialization. This
 * module is deliberately absent from the package barrel, and the callable
 * side below additionally requires Serial's exact pending-capsule token. */
export function registerCriticAssessmentRestartRestorer(
  restorer: AssessmentRestartRestorer,
): void {
  if (registeredRestorer === null) registeredRestorer = restorer;
}

/** Rebrand persisted assessment bytes only while Core is reconstructing the
 * exact authenticated candidate capsule that owns them. */
export function restoreCriticAssessmentFromAuthenticatedPending(
  taskSpec: unknown,
  evidencePlan: unknown,
  rawCustody: unknown,
  rawExpected: unknown,
  pendingRestoreAuthority: SerialPendingRestoreAuthority,
  capsuleSha256: string,
  rawCapsuleTarget: unknown,
): unknown | null {
  if (typeof rawCapsuleTarget !== "object" || rawCapsuleTarget === null) return null;
  const target = rawCapsuleTarget as Partial<AssessmentRestartExpected>;
  if (typeof target.projectRootSha256 !== "string" || typeof target.runId !== "string"
    || typeof target.candidateSha256 !== "string"
    || !serialPendingRestoreAuthorityCovers(pendingRestoreAuthority, {
      capsuleSha256,
      projectRootSha256: target.projectRootSha256,
      runId: target.runId,
      candidateSha256: target.candidateSha256,
    })) return null;
  return registeredRestorer?.(taskSpec, evidencePlan, rawCustody, rawExpected) ?? null;
}
