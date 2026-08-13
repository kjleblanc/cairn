import type { BuilderProposalReviewV1 } from "../src/shared/builder-proposal-review";

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

/**
 * Browser-safe expected projections for the visual lab. The Node unit suite
 * independently rebuilds both from genuine Task 224 context/response brands
 * and requires byte-for-byte structural equality before these fixtures may
 * reach the lab.
 */
export const BUILDER_PROPOSAL_LAB_REPLACEMENT = deepFreeze({
  version: "cairn-builder-proposal-review/v1",
  kind: "replacement-proposal",
  taskNumber: 900001,
  runId: "11111111-1111-4111-8111-111111111111",
  turnId: "22222222-2222-4222-8222-222222222222",
  contextSha256: "8310d0a0e633f6e12e4b0c55dd6d90050f1b365d8b672070c0a62c657ca221f7",
  responseSha256: "a360e7e78071d8be7f8726b60a93ab3b36966fd90ec8ee8a59cccd3289bf7ab7",
  summary: "Replace the greeting in the one synthetic tracked-text row.",
  replacements: [{
    projectRelativePath: "examples/synthetic/greeting.ts",
    beforeSha256: "aea87c14090b2156a9e689f57817e609cee58f93ccecd447dde85e8d917b39ca",
    beforeText: "export const greeting = \"Hello from the synthetic lab.\";\n",
    afterSha256: "4fcb280f1acaff20c192c641c2f118470c46a833caa9ee6ca4829212253c9b9f",
    afterText: "export const greeting = \"Hello from the proposal-only lab.\";\n",
  }],
} satisfies BuilderProposalReviewV1);

export const BUILDER_PROPOSAL_LAB_CAPABILITY = deepFreeze({
  version: "cairn-builder-proposal-review/v1",
  kind: "capability-request",
  taskNumber: 900002,
  runId: "33333333-3333-4333-8333-333333333333",
  turnId: "44444444-4444-4444-8444-444444444444",
  contextSha256: "caf4f345c25c329745f069564a25a4fe37a51bae8dfd77b52ed0159cf848dc81",
  responseSha256: "476a7f63a53330d6e7c5bd9b3c82396f7fc7c673db60f9cfd9dcd769dac3d107",
  category: "external-reference",
  categoryLabel: "External reference",
  suggestedTargetLabel: "Untrusted suggestion",
  suggestedTarget: "The synthetic reference named Garden greeting format; nothing will open it.",
  what: "Inspect one synthetic format note supplied only for this visual example.",
  why: "The selected synthetic text does not define its imaginary format.",
  expectedEffect: "A later, separately authorized turn could receive bounded reference text.",
  dataExposure: "No project text would be sent in this example.",
  costBasis: "Synthetic example; no provider or paid call exists.",
  recovery: "Discard this proposal-only example. Nothing needs undoing.",
} satisfies BuilderProposalReviewV1);
