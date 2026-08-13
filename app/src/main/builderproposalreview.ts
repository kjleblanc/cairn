import {
  builderTurnContextSha256,
  builderTurnResponseMatchesContext,
  builderTurnResponseSha256,
  type BuilderTurnContextV1,
  type BuilderTurnResponseV1,
} from "@cairn/core";

import {
  BUILDER_CAPABILITY_REVIEW_LABELS,
  BUILDER_PROPOSAL_REVIEW_VERSION,
  type BuilderCapabilityReviewCategoryV1,
  type BuilderProposalReviewV1,
} from "../shared/builder-proposal-review.js";

/**
 * Turn one exact live Task 224 context/response pair into inert display data.
 * The returned projection contains no protocol brand and grants no authority.
 */
export function composeBuilderProposalReview(
  contextValue: unknown,
  responseValue: unknown,
): BuilderProposalReviewV1 | null {
  try {
    if (!builderTurnResponseMatchesContext(contextValue, responseValue)) return null;
    const contextSha256 = builderTurnContextSha256(contextValue);
    const responseSha256 = builderTurnResponseSha256(responseValue);
    if (contextSha256 === null || responseSha256 === null) return null;

    const context = contextValue as BuilderTurnContextV1;
    const response = responseValue as BuilderTurnResponseV1;
    const identity = {
      version: BUILDER_PROPOSAL_REVIEW_VERSION,
      taskNumber: context.taskNumber,
      runId: context.runId,
      turnId: context.turnId,
      contextSha256,
      responseSha256,
    } as const;

    if (response.kind === "replacement-proposal") {
      const selectedByPath = new Map(
        context.selectedTrackedText.map((row) => [row.projectRelativePath, row] as const),
      );
      const replacements = response.replacements.map((row) => {
        const selected = selectedByPath.get(row.projectRelativePath);
        if (!selected || selected.sha256 !== row.beforeSha256) throw new Error("replacement custody mismatch");
        return Object.freeze({
          projectRelativePath: row.projectRelativePath,
          beforeSha256: row.beforeSha256,
          beforeText: selected.content,
          afterSha256: row.afterSha256,
          afterText: row.afterText,
        });
      });
      return Object.freeze({
        ...identity,
        kind: "replacement-proposal",
        summary: response.summary,
        replacements: Object.freeze(replacements),
      });
    }

    const category = response.request.category as BuilderCapabilityReviewCategoryV1;
    const categoryLabel = BUILDER_CAPABILITY_REVIEW_LABELS[category];
    if (categoryLabel === undefined) return null;
    return Object.freeze({
      ...identity,
      kind: "capability-request",
      category,
      categoryLabel,
      suggestedTargetLabel: "Untrusted suggestion",
      suggestedTarget: response.request.suggestedTarget,
      what: response.request.what,
      why: response.request.why,
      expectedEffect: response.request.expectedEffect,
      dataExposure: response.request.dataExposure,
      costBasis: response.request.costBasis,
      recovery: response.request.recovery,
    });
  } catch {
    return null;
  }
}
