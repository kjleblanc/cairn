/**
 * Process-local custody shared by critic.ts and candidate.ts only. This module
 * is deliberately absent from the package barrel: persisted completion bytes
 * may regain authority only while an authenticated serial capsule is being
 * reconstructed inside Core.
 */
export const restoredCriticCompletionAuthorityBrands = new WeakSet<object>();
