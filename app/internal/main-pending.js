// Main-process-only monorepo bridge. @cairn/core deliberately does not export
// this recovery seam: ordinary package consumers receive the fail-closed
// public resume/reconcile APIs and cannot install a journal verifier.
export * from "../../core/dist/src/main-pending.js";
