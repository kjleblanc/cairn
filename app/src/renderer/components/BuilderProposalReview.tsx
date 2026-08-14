import {
  BUILDER_PROPOSAL_REVIEW_BOUNDARY,
  type BuilderProposalReviewV1,
} from "../../shared/builder-proposal-review.js";

function Identity({ review }: { review: BuilderProposalReviewV1 }) {
  return (
    <dl className="builder-proposal-identity" aria-label="Exact proposal identity">
      <div><dt>Task</dt><dd>{review.taskNumber}</dd></div>
      <div><dt>Context SHA-256</dt><dd><code>{review.contextSha256}</code></dd></div>
      <div><dt>Response SHA-256</dt><dd><code>{review.responseSha256}</code></dd></div>
    </dl>
  );
}

function ReplacementReview({ review }: {
  review: Extract<BuilderProposalReviewV1, { kind: "replacement-proposal" }>;
}) {
  return (
    <>
      <section className="builder-proposal-summary" aria-label="Builder summary">
        <p className="builder-proposal-label">Builder says</p>
        <p>{review.summary}</p>
      </section>
      <div className="builder-proposal-files">
        {review.replacements.map((row, index) => (
          <article className="builder-proposal-file" key={index}>
            <h3><code>{row.projectRelativePath}</code></h3>
            <div className="builder-proposal-comparison">
              <section aria-label="Before selected text">
                <p className="builder-proposal-label">Before · SHA-256</p>
                <code className="builder-proposal-hash">{row.beforeSha256}</code>
                <pre>{row.beforeText}</pre>
              </section>
              <section aria-label="Proposed replacement text">
                <p className="builder-proposal-label">Proposed · SHA-256</p>
                <code className="builder-proposal-hash">{row.afterSha256}</code>
                <pre>{row.afterText}</pre>
              </section>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function CapabilityReview({ review }: {
  review: Extract<BuilderProposalReviewV1, { kind: "capability-request" }>;
}) {
  const fields = [
    ["What", review.what],
    ["Why", review.why],
    ["Expected effect", review.expectedEffect],
    ["Data exposure", review.dataExposure],
    ["Cost basis", review.costBasis],
    ["Recovery", review.recovery],
    [review.suggestedTargetLabel, review.suggestedTarget],
  ] as const;
  return (
    <section className="builder-proposal-capability" aria-label="Builder capability request">
      <p className="builder-proposal-label">Builder asks for</p>
      <h3>{review.categoryLabel}</h3>
      <dl>
        {fields.map(([label, value], index) => <div key={index}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </section>
  );
}

/** Literal, output-only rendering. This component accepts no action callback. */
export function BuilderProposalReview({ review }: { review: BuilderProposalReviewV1 }) {
  return (
    <section className={`builder-proposal-review builder-proposal-review-${review.kind}`}
      aria-label={BUILDER_PROPOSAL_REVIEW_BOUNDARY.title}>
      <header className="builder-proposal-header">
        <span className="builder-proposal-eyebrow">{BUILDER_PROPOSAL_REVIEW_BOUNDARY.eyebrow}</span>
        <h2>{BUILDER_PROPOSAL_REVIEW_BOUNDARY.title}</h2>
      </header>
      <p className="builder-proposal-boundary">{BUILDER_PROPOSAL_REVIEW_BOUNDARY.primary}</p>
      <p className="builder-proposal-caveat">{BUILDER_PROPOSAL_REVIEW_BOUNDARY.secondary}</p>
      {review.kind === "replacement-proposal"
        ? <ReplacementReview review={review} />
        : <CapabilityReview review={review} />}
      <Identity review={review} />
    </section>
  );
}
