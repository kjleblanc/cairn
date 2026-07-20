export const CONCURRENT_ACTIVATION_PATH = "docs/ai-work/activation/bounded-concurrency-v1.json";

export interface ConcurrentActivationRecord {
  schemaVersion: 1;
  implementationCommit: string;
  implementationDigest: string;
  reviewVerdict: "PASS" | "PASS WITH CONCERNS";
  ownerDecision: "accept";
  qualifiedDeveloperVerdict: "PASS";
  repositoryRoot: string;
  repositoryGitDir: string;
  activatedAt: string;
}

const KEYS = [
  "activatedAt", "implementationCommit", "implementationDigest", "ownerDecision",
  "qualifiedDeveloperVerdict", "repositoryGitDir", "repositoryRoot", "reviewVerdict", "schemaVersion",
].sort();

export function validateConcurrentActivation(value: unknown): ConcurrentActivationRecord {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(KEYS)) throw new Error("ACTIVATION_INVALID");
  const record = value as ConcurrentActivationRecord;
  if (record.schemaVersion !== 1 || !/^[0-9a-f]{40}$/.test(record.implementationCommit) ||
      !/^[0-9a-f]{64}$/.test(record.implementationDigest) ||
      !["PASS", "PASS WITH CONCERNS"].includes(record.reviewVerdict) || record.ownerDecision !== "accept" ||
      record.qualifiedDeveloperVerdict !== "PASS" || !record.repositoryRoot || !record.repositoryGitDir ||
      !/^\d{4}-\d{2}-\d{2}T/.test(record.activatedAt)) throw new Error("ACTIVATION_INVALID");
  return { ...record };
}

export function concurrentActivationDecision(
  recordValue: unknown,
  expected: { repositoryRoot: string; repositoryGitDir: string; implementationDigest: string },
  disableValue: string | undefined,
): { active: true; record: ConcurrentActivationRecord } {
  if (disableValue === "1") throw new Error("FINAL_DISABLED");
  const record = validateConcurrentActivation(recordValue);
  if (record.repositoryRoot !== expected.repositoryRoot || record.repositoryGitDir !== expected.repositoryGitDir ||
      record.implementationDigest !== expected.implementationDigest) throw new Error("ACTIVATION_MISMATCH");
  return { active: true, record };
}
