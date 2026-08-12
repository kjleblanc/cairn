/** Authenticated Main-only pending recovery seam. This module is deliberately
 * absent from the root barrel: raw/self-hashed capsule bytes can use only the
 * fail-closed public recovery surface. */
export {
  authorizeSerialAuthenticatedPendingJournal,
  registerSerialAuthenticatedPendingJournalVerifier,
  type SerialAuthenticatedPendingJournalAuthority,
  type SerialAuthenticatedPendingJournalBinding,
} from "./pending-journal-auth-internal.js";
export {
  reconcileSerialCandidateTerminalFromAuthenticatedPending,
  resumeSerialCandidateFromAuthenticatedPending,
} from "./serial.js";
