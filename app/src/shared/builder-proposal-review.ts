/**
 * Output-only data for Task 229's proposal review surface.
 *
 * This projection deliberately carries no action id, callback, URL, command,
 * grant, or protocol brand. Main may compose it from genuine Task 224 custody;
 * renderer and lab code may only display it.
 */
export const BUILDER_PROPOSAL_REVIEW_VERSION = "cairn-builder-proposal-review/v1" as const;

export const BUILDER_PROPOSAL_REVIEW_BOUNDARY = Object.freeze({
  eyebrow: "Proposal only",
  title: "Builder proposal — not applied",
  primary: "Proposal only — Cairn has not applied, executed, published, or verified this suggestion.",
  secondary: "Nothing changed. No command ran. Cairn has not checked whether the selected text is still current, whether the proposal is correct, or whether it can be applied safely.",
} as const);

export const BUILDER_CAPABILITY_REVIEW_LABELS = Object.freeze({
  "additional-tracked-text": "More tracked project text",
  "external-reference": "External reference",
  "dependency-change": "Dependency change",
  "external-service-action": "External service action",
  "owner-clarification": "Owner clarification",
} as const);

export type BuilderCapabilityReviewCategoryV1 = keyof typeof BUILDER_CAPABILITY_REVIEW_LABELS;

type BuilderProposalReviewIdentityV1 = Readonly<{
  version: typeof BUILDER_PROPOSAL_REVIEW_VERSION;
  taskNumber: number;
  runId: string;
  turnId: string;
  contextSha256: string;
  responseSha256: string;
}>;

export type BuilderReplacementReviewRowV1 = Readonly<{
  projectRelativePath: string;
  beforeSha256: string;
  beforeText: string;
  afterSha256: string;
  afterText: string;
}>;

export type BuilderReplacementProposalReviewV1 = BuilderProposalReviewIdentityV1 & Readonly<{
  kind: "replacement-proposal";
  summary: string;
  replacements: readonly BuilderReplacementReviewRowV1[];
}>;

export type BuilderCapabilityProposalReviewV1 = BuilderProposalReviewIdentityV1 & Readonly<{
  kind: "capability-request";
  category: BuilderCapabilityReviewCategoryV1;
  categoryLabel: string;
  suggestedTargetLabel: "Untrusted suggestion";
  suggestedTarget: string;
  what: string;
  why: string;
  expectedEffect: string;
  dataExposure: string;
  costBasis: string;
  recovery: string;
}>;

export type BuilderProposalReviewV1 =
  | BuilderReplacementProposalReviewV1
  | BuilderCapabilityProposalReviewV1;
